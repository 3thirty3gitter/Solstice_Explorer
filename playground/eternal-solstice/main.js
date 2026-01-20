const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const { exec } = require('child_process');

let mainWindow;

// Handle single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            // Handle the path if passed in second instance
            const folderPath = parseFolderPath(commandLine);
            if (folderPath) {
                mainWindow.webContents.send('navigate-to', folderPath);
            }
        }
    });

    app.whenReady().then(() => {
        createWindow();

        // Handle initial path if passed
        const folderPath = parseFolderPath(process.argv);
        if (folderPath && mainWindow) {
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.webContents.send('navigate-to', folderPath);
            });
        }
    });
}

function parseFolderPath(argv) {
    // Look for a path argument (skip exe and electron-related flags)
    for (let i = (process.defaultApp ? 2 : 1); i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) continue; // Skip flags

        try {
            if (fsSync.existsSync(arg) && fsSync.statSync(arg).isDirectory()) {
                return arg;
            }
        } catch (e) {
            // Not a valid path or not a directory
        }
    }
    return null;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        frame: false, // Keep frame false to allow acrylic to work fully, but...
        // Actually, to get native Snap Layouts, we need titleBarStyle: 'hidden'
        // But conflicting with 'transparent: true' is a common issue.
        // Let's try the modern WCO approach:
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#00000000', // Transparent background for controls
            symbolColor: '#ffffff', // White icons
            height: 40 // Match our tab bar height
        },
        transparent: false, // Disable transparent to ensure maximize works reliably
        // We rely on 'acrylic' backend for transparency effect
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    mainWindow.loadFile('index.html');

    // Enable Windows acrylic effect for glassmorphism
    if (process.platform === 'win32') {
        try {
            mainWindow.setBackgroundMaterial('acrylic');
        } catch (e) {
            console.log('Acrylic effect not available');
        }
    }

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

/**
 * Normalizes and validates paths from renderer
 */
function safePath(p) {
    if (!p || typeof p !== 'string') return null;
    try {
        return path.resolve(p);
    } catch (e) {
        return null;
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Window controls
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

// System Registration Handlers
ipcMain.handle('set-default-explorer', async () => {
    if (process.platform !== 'win32') return { success: false, error: 'Only supported on Windows' };

    const appPath = process.execPath;
    const appArgs = process.defaultApp ? ` "${path.resolve('.')}"` : '';
    const command = `"${appPath}"${appArgs} "%1"`;

    try {
        // Set Directory and Drive handlers for HKCU (Current User)
        // Directory for folders, Drive for disk roots
        const psCommand = `
            $keys = @('HKCU:\\Software\\Classes\\Directory\\shell\\open\\command', 'HKCU:\\Software\\Classes\\Drive\\shell\\open\\command');
            foreach ($key in $keys) {
                if (!(Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
                Set-ItemProperty -Path $key -Name '(Default)' -Value '${command.replace(/'/g, "''")}' -Force
            }
        `;

        await execPromise(`powershell -Command "${psCommand.replace(/\n/g, '').trim()}"`);
        return { success: true };
    } catch (e) {
        console.error('Failed to set default explorer:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('unset-default-explorer', async () => {
    if (process.platform !== 'win32') return { success: false };

    try {
        const psCommand = `
            $keys = @('HKCU:\\Software\\Classes\\Directory\\shell\\open', 'HKCU:\\Software\\Classes\\Drive\\shell\\open');
            foreach ($key in $keys) {
                if (Test-Path $key) { Remove-Item -Path $key -Recurse -Force }
            }
        `;
        await execPromise(`powershell -Command "${psCommand.replace(/\n/g, '').trim()}"`);
        return { success: true };
    } catch (e) {
        console.error('Failed to unset default explorer:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('check-default-explorer', async () => {
    if (process.platform !== 'win32') return false;

    try {
        const { stdout } = await execPromise(`powershell -Command "(Get-ItemProperty -Path 'HKCU:\\Software\\Classes\\Directory\\shell\\open\\command' -ErrorAction SilentlyContinue).'(Default)'"`);
        const currentCommand = stdout.trim();
        const appPath = process.execPath;
        return currentCommand.includes(appPath);
    } catch (e) {
        return false;
    }
});

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
}

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});

// File system operations
ipcMain.handle('get-drives', async () => {
    if (process.platform === 'win32') {
        const drives = [];
        for (let i = 65; i <= 90; i++) {
            const letter = String.fromCharCode(i);
            const drivePath = `${letter}:\\`;
            try {
                await fs.access(drivePath);
                const stats = await getDriveInfo(drivePath);
                drives.push({
                    letter,
                    path: drivePath,
                    label: `Local Disk (${letter}:)`,
                    ...stats
                });
            } catch (e) {
                // Drive doesn't exist or not accessible
            }
        }
        return drives;
    }
    return [];
});

ipcMain.on('log-message', (event, message) => {
    console.log(`[Renderer] ${message}`);
});

ipcMain.handle('read-directory', async (event, dirPath) => {
    const safeDir = safePath(dirPath);
    if (!safeDir) return [];

    try {
        // Check if directory exists first
        try {
            await fs.access(safeDir);
        } catch (e) {
            return []; // Return empty array if directory doesn't exist
        }

        const entries = await fs.readdir(safeDir, { withFileTypes: true });
        const items = await Promise.all(
            entries.map(async (entry) => {
                const fullPath = path.join(dirPath, entry.name);
                try {
                    const stats = await fs.stat(fullPath);
                    return {
                        name: entry.name,
                        path: fullPath,
                        isDirectory: stats.isDirectory(),
                        size: stats.size,
                        modified: stats.mtime,
                        created: stats.birthtime,
                        extension: stats.isDirectory() ? null : path.extname(entry.name).toLowerCase()
                    };
                } catch (e) {
                    return null;
                }
            })
        );
        return items.filter(item => item !== null);
    } catch (error) {
        console.error('Error reading directory:', error);
        return []; // Return empty array instead of throwing
    }
});

ipcMain.handle('get-special-folders', async () => {
    const getSafePath = (name) => {
        try {
            return app.getPath(name);
        } catch (e) {
            // Fallback to manual path if app.getPath fails
            const home = os.homedir();
            const folderName = name.charAt(0).toUpperCase() + name.slice(1);
            return path.join(home, folderName);
        }
    };

    const folders = {
        desktop: getSafePath('desktop'),
        documents: getSafePath('documents'),
        downloads: getSafePath('downloads'),
        pictures: getSafePath('pictures'),
        music: getSafePath('music'),
        videos: getSafePath('videos'),
        home: os.homedir()
    };

    // ===== ONEDRIVE DETECTION =====
    const oneDrivePersonal = path.join(os.homedir(), 'OneDrive');
    const userProfile = os.homedir();

    // Check for OneDrive Business (usually has company name)
    try {
        const possibleOneDriveDirs = await fs.readdir(userProfile);

        for (const dir of possibleOneDriveDirs) {
            // Look for OneDrive - CompanyName pattern
            if (dir.startsWith('OneDrive -')) {
                const oneDriveBusiness = path.join(userProfile, dir);
                try {
                    await fs.access(oneDriveBusiness);
                    folders.onedriveBusiness = oneDriveBusiness;
                } catch (e) {
                    // Not accessible
                }
            }
        }
    } catch (e) {
        // Can't scan for OneDrive Business
    }

    // Add OneDrive Personal if it exists
    try {
        await fs.access(oneDrivePersonal);
        folders.onedrive = oneDrivePersonal;
    } catch (e) {
        // OneDrive Personal not found
    }

    // ===== GOOGLE DRIVE DETECTION =====
    // Google Drive for Desktop locations
    const googleDriveLocations = [
        path.join(os.homedir(), 'Google Drive'),  // Old location
        'G:\\My Drive',  // Common mapped drive
        'G:\\',  // Mapped drive root
    ];

    // Check AppData for Google Drive config to find actual location
    try {
        const googleDriveConfig = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Drive');
        await fs.access(googleDriveConfig);

        // Try to read sync config to find actual drive location
        try {
            const syncConfigPath = path.join(googleDriveConfig, 'user_default', 'sync_config.db');
            // If config exists, Google Drive is installed
            await fs.access(syncConfigPath);

            // Check common locations
            for (const location of googleDriveLocations) {
                try {
                    await fs.access(location);
                    folders.googleDrive = location;
                    break;
                } catch (e) {
                    // Try next location
                }
            }
        } catch (e) {
            // Can't read config
        }
    } catch (e) {
        // Google Drive not installed
    }

    // ===== DROPBOX DETECTION =====
    const dropboxLocations = [
        path.join(os.homedir(), 'Dropbox'),
        path.join(os.homedir(), 'Dropbox (Personal)'),
        path.join(os.homedir(), 'Dropbox (Business)'),
    ];

    for (const location of dropboxLocations) {
        try {
            await fs.access(location);
            if (location.includes('Business')) {
                folders.dropboxBusiness = location;
            } else if (location.includes('Personal')) {
                folders.dropboxPersonal = location;
            } else {
                folders.dropbox = location;
            }
        } catch (e) {
            // Location doesn't exist
        }
    }

    // ===== ICLOUD DRIVE DETECTION =====
    // iCloud Drive on Windows
    const iCloudLocations = [
        path.join(os.homedir(), 'iCloudDrive'),
        path.join(os.homedir(), 'iCloud Drive'),
    ];

    for (const location of iCloudLocations) {
        try {
            await fs.access(location);
            folders.icloud = location;
            break;
        } catch (e) {
            // Try next location
        }
    }

    // Verify each folder exists (with OneDrive fallback)
    const verified = {};
    for (const [key, folderPath] of Object.entries(folders)) {
        try {
            await fs.access(folderPath);
            verified[key] = folderPath;
        } catch (e) {
            // Standard path verification failed.
            // Check for potential fallbacks (OneDrive Personal/Business)
            if (key === 'desktop' || key === 'documents' || key === 'pictures') {
                const fallbackRoots = [];
                if (folders.onedrive) fallbackRoots.push(folders.onedrive);
                if (folders.onedriveBusiness) fallbackRoots.push(folders.onedriveBusiness);

                // Explicitly check for known 3Thirty3 OneDrive folders
                const profile = os.homedir();
                const specificOneDrives = [
                    'OneDrive - 3Thirty3 Ltd',
                    'OneDrive - Trent 3Thirty3'
                ];

                for (const sod of specificOneDrives) {
                    const p = path.join(profile, sod);
                    try {
                        // We can't await fs.access inside synchronous loop easily without async 
                        // wrapper, but we are in async function.
                        // Ideally we check existence before pushing.
                        // Let's just push them and let the loop below handle access failure.
                        fallbackRoots.push(p);
                    } catch (e) { }
                }

                let foundFallback = false;
                for (const root of fallbackRoots) {
                    try {
                        // Try "Desktop", "Documents", etc.
                        const candidate = path.join(root, key.charAt(0).toUpperCase() + key.slice(1));
                        await fs.access(candidate);
                        verified[key] = candidate;
                        console.log(`[Main] Used fallback for ${key}: ${candidate}`);
                        foundFallback = true;
                        break;
                    } catch (err) { }
                }

                if (foundFallback) continue;
            }
            console.log(`Folder ${key} not accessible: ${folderPath}`);
        }
    }

    return verified;
});

ipcMain.handle('search-files', async (event, { searchPath, query, fileType }) => {
    const results = [];
    const maxResults = 500;
    const maxConcurrency = 20; // Lower concurrency slightly for stability
    let activeOperations = 0;
    const queue = [searchPath];
    let completed = false;

    // Normalized Query
    const filters = {
        name: query.toLowerCase(),
        type: fileType || 'all'
    };

    return new Promise((resolve) => {
        const processQueue = async () => {
            while (queue.length > 0 && activeOperations < maxConcurrency && results.length < maxResults) {
                const currentPath = queue.shift();
                activeOperations++;

                fs.readdir(currentPath, { withFileTypes: true })
                    .then(async (entries) => {
                        for (const entry of entries) {
                            if (results.length >= maxResults) break;
                            if (entry.name.startsWith('$') || entry.name.toLowerCase() === 'system volume information') continue; // Skip system junk

                            const fullPath = path.join(currentPath, entry.name);
                            const nameLower = entry.name.toLowerCase();

                            // Check Match
                            let matches = nameLower.includes(filters.name);

                            // Type filtering (basic)
                            if (matches && filters.type !== 'all') {
                                const ext = path.extname(entry.name).toLowerCase(); // Keep dot for existing getFileType
                                const type = getFileType(entry.isDirectory(), ext);
                                if (type !== filters.type) matches = false;
                            }

                            if (matches) {
                                // Only stat on match to save time
                                try {
                                    const stats = await fs.stat(fullPath);
                                    results.push({
                                        name: entry.name,
                                        path: fullPath,
                                        isDirectory: entry.isDirectory(),
                                        size: stats.size,
                                        modified: stats.mtime,
                                        extension: path.extname(entry.name).toLowerCase()
                                    });
                                } catch (e) { }
                            }

                            // Enqueue Directories
                            if (entry.isDirectory()) {
                                queue.push(fullPath);
                            }
                        }
                    })
                    .catch(() => { }) // Ignore access errors
                    .finally(() => {
                        activeOperations--;
                        if (queue.length === 0 && activeOperations === 0) {
                            if (!completed) {
                                completed = true;
                                resolve(results);
                            }
                        } else {
                            // Continue processing queue
                            processQueue();
                        }
                    });
            }
        };

        processQueue();

        // Safety timeout
        setTimeout(() => {
            if (!completed) {
                completed = true;
                resolve(results);
            }
        }, 30000); // 30s timeout
    });
});

ipcMain.handle('open-item', async (event, itemPath) => {
    const sPath = safePath(itemPath);
    if (!sPath) return { success: false, error: 'Invalid path' };
    try {
        await shell.openPath(sPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('show-item-in-folder', async (event, itemPath) => {
    shell.showItemInFolder(itemPath);
});

ipcMain.handle('get-file-icon', async (event, filePath) => {
    const sPath = safePath(filePath);
    if (!sPath) return null;
    try {
        const icon = await app.getFileIcon(sPath, { size: 'normal' });
        return icon.toDataURL();
    } catch (e) {
        return null;
    }
});

ipcMain.handle('delete-items', async (event, paths) => {
    try {
        for (const itemPath of paths) {
            const sPath = safePath(itemPath);
            if (sPath) await shell.trashItem(sPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-item-properties', async (event, itemPath) => {
    try {
        const stats = await fs.stat(itemPath);
        return {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            accessed: stats.atime,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile()
        };
    } catch (error) {
        throw new Error(`Failed to get properties: ${error.message}`);
    }
});

// Advanced file operations
ipcMain.handle('copy-items', async (event, { sources, destination }) => {
    const sDest = safePath(destination);
    if (!sDest) return { success: false, error: 'Invalid destination' };

    try {
        for (const source of sources) {
            const sSource = safePath(source);
            if (!sSource) continue;
            const basename = path.basename(sSource);
            const dest = path.join(sDest, basename);
            await copyRecursive(sSource, dest);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('move-items', async (event, { sources, destination }) => {
    const sDest = safePath(destination);
    if (!sDest) return { success: false, error: 'Invalid destination' };

    try {
        for (const source of sources) {
            const sSource = safePath(source);
            if (!sSource) continue;
            const basename = path.basename(sSource);
            const dest = path.join(sDest, basename);
            await fs.rename(sSource, dest);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('rename-item', async (event, { oldPath, newName }) => {
    const sOld = safePath(oldPath);
    if (!sOld) return { success: false, error: 'Invalid path' };
    try {
        const dir = path.dirname(sOld);
        const newPath = path.join(dir, newName);
        await fs.rename(sOld, newPath);
        return { success: true, newPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('batch-rename', async (event, operations) => {
    try {
        let successCount = 0;
        const errors = [];

        for (const op of operations) {
            try {
                const sOld = safePath(op.oldPath);
                if (!sOld) continue;
                const dir = path.dirname(sOld);
                const newPath = path.join(dir, op.newName);

                // Check if target exists
                if (fsSync.existsSync(newPath) && newPath !== op.oldPath) {
                    errors.push(`${op.newName}: File already exists`);
                    continue;
                }

                await fs.rename(op.oldPath, newPath);
                successCount++;
            } catch (error) {
                errors.push(`${op.newName}: ${error.message}`);
            }
        }

        return {
            success: errors.length === 0,
            count: successCount,
            errors: errors,
            error: errors.length > 0 ? errors.join(', ') : null
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-folder', async (event, { parentPath, folderName }) => {
    const sParent = safePath(parentPath);
    if (!sParent) return { success: false, error: 'Invalid path' };
    try {
        const newPath = path.join(sParent, folderName);
        await fs.mkdir(newPath, { recursive: false });
        return { success: true, path: newPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-folder', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('create-file', async (event, { parentPath, fileName }) => {
    const sParent = safePath(parentPath);
    if (!sParent) return { success: false, error: 'Invalid path' };
    try {
        const newPath = path.join(sParent, fileName);
        await fs.writeFile(newPath, '');
        return { success: true, path: newPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-file-content', async (event, filePath) => {
    const sPath = safePath(filePath);
    if (!sPath) return { success: false, error: 'Invalid path' };
    try {
        const stats = await fs.stat(sPath);
        if (stats.size > 1024 * 1024) { // 1MB limit for preview
            return { success: false, error: 'File too large for preview' };
        }
        const content = await fs.readFile(sPath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-thumbnail', async (event, filePath) => {
    const sPath = safePath(filePath);
    if (!sPath) return { success: false, error: 'Invalid path' };
    try {
        const ext = path.extname(sPath).toLowerCase();
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'];

        if (imageExts.includes(ext)) {
            // Check if file is OneDrive cloud-only (would trigger download)
            let isCloudOnly = false;
            if (process.platform === 'win32') {
                try {
                    const { exec } = require('child_process');
                    const checkResult = await new Promise((resolve) => {
                        exec(`powershell -Command "(Get-Item -Path '${sPath.replace(/'/g, "''")}').Attributes"`, (error, stdout) => {
                            if (error) {
                                resolve(false);
                                return;
                            }
                            resolve(stdout.includes('ReparsePoint'));
                        });
                    });
                    isCloudOnly = checkResult;
                } catch (e) {
                    // Assume not cloud-only if check fails
                }
            }

            // For cloud-only files, skip thumbnail generation entirely to prevent download
            if (isCloudOnly) {
                return { success: false, cloudOnly: true };
            }

            // Use nativeImage for high-performance thumbnailing
            // createThumbnailFromPath is available in newer Electron versions
            try {
                const nativeImg = await nativeImage.createThumbnailFromPath(sPath, { width: 128, height: 128 });
                return { success: true, data: nativeImg.toDataURL() };
            } catch (e) {
                // Fallback for older formats or unexpected issues
                const nativeImg = nativeImage.createFromPath(sPath);
                if (!nativeImg.isEmpty()) {
                    const thumb = nativeImg.resize({ width: 128 });
                    return { success: true, data: thumb.toDataURL() };
                }
            }
        }
        return { success: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Advanced search with content, date, and size filters
ipcMain.handle('advanced-search', async (event, options) => {
    const sPath = safePath(options.searchPath);
    if (!sPath) return [];

    const {
        query,
        fileType,
        searchContent = false,
        dateFrom = null,
        dateTo = null,
        sizeMin = null,
        sizeMax = null,
        useRegex = false
    } = options;

    const results = [];
    let searchPattern;

    if (useRegex) {
        try {
            searchPattern = new RegExp(query, 'i');
        } catch (e) {
            searchPattern = null;
        }
    }

    async function searchRecursive(dirPath, depth = 0) {
        if (depth > 5) return; // Increased depth for thorough search
        if (results.length >= 500) return; // Increased result limit

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                try {
                    const stats = await fs.stat(fullPath);
                    const extension = entry.isDirectory() ? null : path.extname(entry.name).toLowerCase();
                    const itemType = getFileType(entry.isDirectory(), extension);

                    // File type filter
                    if (fileType !== 'all' && fileType !== itemType) {
                        if (entry.isDirectory()) {
                            await searchRecursive(fullPath, depth + 1);
                        }
                        continue;
                    }

                    // Name matching
                    let nameMatch = false;
                    if (searchPattern) {
                        nameMatch = searchPattern.test(entry.name);
                    } else {
                        nameMatch = entry.name.toLowerCase().includes(query.toLowerCase());
                    }

                    // Content search for text files
                    let contentMatch = false;
                    if (searchContent && !entry.isDirectory() && nameMatch === false) {
                        const textExts = ['.txt', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.html', '.css', '.json', '.xml', '.md'];
                        if (textExts.includes(extension) && stats.size < 1024 * 100) { // 100KB limit
                            // Try to read file content - OneDrive cloud-only files will fail gracefully
                            try {
                                const content = await fs.readFile(fullPath, 'utf8');
                                if (searchPattern) {
                                    contentMatch = searchPattern.test(content);
                                } else {
                                    contentMatch = content.toLowerCase().includes(query.toLowerCase());
                                }
                            } catch (e) {
                                // Skip files that can't be read (including OneDrive cloud-only files)
                            }
                        }
                    }

                    // Date filter
                    let dateMatch = true;
                    if (dateFrom || dateTo) {
                        const modifiedDate = new Date(stats.mtime);
                        if (dateFrom && modifiedDate < new Date(dateFrom)) dateMatch = false;
                        if (dateTo && modifiedDate > new Date(dateTo)) dateMatch = false;
                    }

                    // Size filter
                    let sizeMatch = true;
                    if (!entry.isDirectory()) {
                        if (sizeMin !== null && stats.size < sizeMin) sizeMatch = false;
                        if (sizeMax !== null && stats.size > sizeMax) sizeMatch = false;
                    }

                    if ((nameMatch || contentMatch) && dateMatch && sizeMatch) {
                        results.push({
                            name: entry.name,
                            path: fullPath,
                            isDirectory: entry.isDirectory(),
                            size: stats.size,
                            modified: stats.mtime,
                            extension,
                            matchType: contentMatch ? 'content' : 'name'
                        });
                    }

                    if (entry.isDirectory()) {
                        await searchRecursive(fullPath, depth + 1);
                    }
                } catch (e) {
                    // Skip inaccessible files
                }
            }
        } catch (e) {
            // Skip inaccessible directories
        }
    }

    await searchRecursive(sPath);
    return results;
});

ipcMain.handle('get-folder-stats', async (event, folderPath) => {
    const sPath = safePath(folderPath);
    if (!sPath) return { success: false, error: 'Invalid path' };
    try {
        let totalSize = 0;
        let fileCount = 0;
        let folderCount = 0;

        async function calculateStats(dirPath, depth = 0) {
            if (depth > 10) return;

            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    try {
                        const stats = await fs.stat(fullPath);

                        if (entry.isDirectory()) {
                            folderCount++;
                            await calculateStats(fullPath, depth + 1);
                        } else {
                            fileCount++;
                            totalSize += stats.size;
                        }
                    } catch (e) {
                        // Skip inaccessible items
                    }
                }
            } catch (e) {
                // Skip inaccessible directories
            }
        }

        await calculateStats(sPath);

        return {
            success: true,
            totalSize,
            fileCount,
            folderCount
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Native File Dragging Support
ipcMain.on('start-drag', (event, filePath) => {
    const sPath = safePath(filePath);
    if (!sPath) return;
    // Verify file exists first
    fsSync.access(sPath, fsSync.constants.F_OK, (err) => {
        if (!err) {
            try {
                const iconPath = path.join(__dirname, 'assets', 'icon.png');
                let icon = nativeImage.createFromPath(iconPath);

                // Fallback if icon is missing or corrupt
                if (icon.isEmpty()) {
                    // Create a 1x1 transparent PNG
                    icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==');
                }

                event.sender.startDrag({
                    file: sPath,
                    icon: icon
                });
            } catch (e) {
                console.error('Failed to start drag:', e);
            }
        }
    });
});

// Helper functions
async function copyRecursive(source, dest) {
    const stats = await fs.stat(source);

    if (stats.isDirectory()) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(source, entry.name);
            const destPath = path.join(dest, entry.name);
            await copyRecursive(srcPath, destPath);
        }
    } else {
        await fs.copyFile(source, dest);
    }
}

async function getDriveInfo(drivePath) {
    try {
        const stats = await fs.stat(drivePath);
        return {
            type: 'local',
            available: true
        };
    } catch (e) {
        return {
            type: 'unknown',
            available: false
        };
    }
}

function getFileType(isDirectory, extension) {
    if (isDirectory) return 'folder';

    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'];
    const videoExts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
    const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'];
    const codeExts = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.html', '.css', '.json', '.xml'];
    const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
    const docExts = ['.txt', '.doc', '.docx', '.pdf', '.rtf', '.odt'];

    if (imageExts.includes(extension)) return 'image';
    if (videoExts.includes(extension)) return 'video';
    if (audioExts.includes(extension)) return 'audio';
    if (codeExts.includes(extension)) return 'code';
    if (archiveExts.includes(extension)) return 'archive';
    if (docExts.includes(extension)) return 'document';

    return 'file';
}

ipcMain.handle('get-folder-size', async (event, dirPath) => {
    const sPath = safePath(dirPath);
    if (!sPath) return 0;
    return await getFolderSizeRecursive(sPath);
});

async function getFolderSizeRecursive(dirPath) {
    let totalSize = 0;
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                totalSize += await getFolderSizeRecursive(filePath);
            } else {
                try {
                    const stats = await fs.stat(filePath);
                    totalSize += stats.size;
                } catch (e) { }
            }
        }
    } catch (e) { }
    return totalSize;
};

// ===== TAGGING SYSTEM =====
const tagsFilePath = path.join(app.getPath('userData'), 'tags.json');

// Helper to ensure tags file exists
async function ensureTagsFile() {
    try {
        await fs.access(tagsFilePath);
    } catch {
        await fs.writeFile(tagsFilePath, JSON.stringify({}, null, 4));
    }
}

// Helper to read tags
async function readTags() {
    await ensureTagsFile();
    try {
        const data = await fs.readFile(tagsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

// Helper to write tags
async function writeTags(tags) {
    await fs.writeFile(tagsFilePath, JSON.stringify(tags, null, 4));
}

ipcMain.handle('get-all-tags', async () => {
    return await readTags();
});

ipcMain.handle('update-file-tags', async (event, { filePath, tags }) => {
    const sPath = safePath(filePath);
    if (!sPath) return { success: false, error: 'Invalid path' };
    try {
        const allTags = await readTags();

        // If no tags provided, remove the entry
        if (!tags || tags.length === 0) {
            delete allTags[sPath];
        } else {
            allTags[sPath] = tags;
        }

        await writeTags(allTags);
        return { success: true, tags: allTags };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Add a single tag to a file
ipcMain.handle('add-file-tag', async (event, { filePath, tag }) => {
    const sPath = safePath(filePath);
    if (!sPath) return { success: false, error: 'Invalid path' };
    try {
        const allTags = await readTags();
        const currentTags = allTags[sPath] || [];

        // Add if not exists
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            allTags[filePath] = currentTags;
            await writeTags(allTags);
        }

        return { success: true, tags: allTags };
    } catch (error) {
        console.error('Failed to add tag:', error);
        return { success: false, error: error.message };
    }
});

// Remove a single tag from a file
ipcMain.handle('remove-file-tag', async (event, { filePath, tag }) => {
    try {
        const allTags = await readTags();
        const currentTags = allTags[filePath] || [];

        const index = currentTags.indexOf(tag);
        if (index > -1) {
            currentTags.splice(index, 1);

            if (currentTags.length === 0) {
                delete allTags[filePath];
            } else {
                allTags[filePath] = currentTags;
            }

            await writeTags(allTags);
        }

        return { success: true, tags: allTags };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

