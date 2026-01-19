const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    // File system operations
    getDrives: () => ipcRenderer.invoke('get-drives'),
    readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
    getSpecialFolders: () => ipcRenderer.invoke('get-special-folders'),
    searchFiles: (searchPath, query, fileType) =>
        ipcRenderer.invoke('search-files', { searchPath, query, fileType }),
    advancedSearch: (options) => ipcRenderer.invoke('advanced-search', options),
    openItem: (path) => ipcRenderer.invoke('open-item', path),
    showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
    getFileIcon: (path) => ipcRenderer.invoke('get-file-icon', path),
    deleteItems: (paths) => ipcRenderer.invoke('delete-items', paths),
    getItemProperties: (path) => ipcRenderer.invoke('get-item-properties', path),

    // Advanced file operations
    copyItems: (sources, destination) => ipcRenderer.invoke('copy-items', { sources, destination }),
    moveItems: (sources, destination) => ipcRenderer.invoke('move-items', { sources, destination }),
    renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', { oldPath, newName }),
    createFolder: (parentPath, folderName) => ipcRenderer.invoke('create-folder', { parentPath, folderName }),
    createFile: (parentPath, fileName) => ipcRenderer.invoke('create-file', { parentPath, fileName }),
    readFileContent: (path) => ipcRenderer.invoke('read-file-content', path),
    getThumbnail: (path) => ipcRenderer.invoke('get-thumbnail', path),
    getFolderStats: (path) => ipcRenderer.invoke('get-folder-stats', path),
    getFolderSize: (path) => ipcRenderer.invoke('get-folder-size', path),
    selectFolder: () => ipcRenderer.invoke('select-folder'),

    // Platform info
    platform: process.platform,

    // Tagging System
    getAllTags: () => ipcRenderer.invoke('get-all-tags'),
    updateFileTags: (filePath, tags) => ipcRenderer.invoke('update-file-tags', { filePath, tags }),
    addFileTag: (filePath, tag) => ipcRenderer.invoke('add-file-tag', { filePath, tag }),
    removeFileTag: (filePath, tag) => ipcRenderer.invoke('remove-file-tag', { filePath, tag }),
    logToMain: (message) => ipcRenderer.send('log-message', message),

    // Drag & Drop
    startDrag: (filePath) => ipcRenderer.send('start-drag', filePath)
});
