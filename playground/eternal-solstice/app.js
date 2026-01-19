// Debug Logger
window.onerror = function (message, source, lineno, colno, error) {
    if (window.electronAPI && window.electronAPI.logToMain) {
        window.electronAPI.logToMain(`[ERROR] ${message} at ${source}:${lineno}:${colno}`);
    }
    console.error(error);
};
window.addEventListener('unhandledrejection', event => {
    if (window.electronAPI && window.electronAPI.logToMain) {
        window.electronAPI.logToMain(`[PROMISE ERROR] ${event.reason}`);
    }
    console.error(event.reason);
});

// Application State
const state = {
    currentPath: '',
    history: [],
    historyIndex: -1,
    selectedItems: new Set(),
    viewMode: 'grid',
    sortBy: 'name',
    sortDirection: 'asc',
    searchQuery: '',
    filterType: 'all',
    specialFolders: {},
    isSearching: false,
    clipboard: {
        items: [],
        operation: null // 'copy' or 'cut'
    },
    previewVisible: false,
    advancedSearchVisible: false,
    currentItem: null, // Currently selected single item for preview
    focusedItemIndex: -1, // For arrow key navigation
    lastSelectedIndex: -1, // For shift+click range selection
    currentItems: [], // Cached items for navigation
    isEditingPath: false
};
// Expose state globally
window.state = state;
window.updateBreadcrumb = updateBreadcrumb; // Needed for DualPaneManager
window.navigateTo = navigateTo; // Needed for DualPaneManager


// File type icons mapping
const FILE_ICONS = {
    folder: '📁',
    document: '📄',
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    code: '💻',
    archive: '📦',
    file: '📃'
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        // Load special folders
        state.specialFolders = await window.electronAPI.getSpecialFolders();

        // Detect and show cloud storage providers
        // (Legacy Cloud Logic Removed for Greenfield SideTree)
        state.specialFolders.cloud = [];

        // Load drives - Handled by SideTree now, but maybe we need the data?
        // Let's just fetch them for state, but not render legacy UI.
        const drives = await window.electronAPI.getDrives();

        // Navigate to user's Documents folder, or first available location
        if (state.specialFolders.documents) {
            await navigateTo(state.specialFolders.documents);
        } else if (state.specialFolders.downloads) {
            await navigateTo(state.specialFolders.downloads);
        } else if (drives && drives.length > 0) {
            await navigateTo(drives[0].path);
        }

        // Initialize sidebar sections (collapse/sort)
        // initializeSidebarSections(); // LEGACY REMOVED

        // GREENFIELD: Initialize SideTree
        window.sideTree = new SideTree('sidebar-root', state);
        window.sideTree.init();

        // --- LEGACY REMOVED ---
        // await initializeFolderTrees();

        // ===== TAG SYSTEM INITIALIZATION =====
        window.tagSystem = new window.TagSystemClass(state);
        await window.tagSystem.initialize();
        initializeTagsSidebar();

        // Refresh view when tags change
        window.tagSystem.onTagsChanged = () => {
            if (state.currentPath === 'tags://view') {
                // If viewing a tag, re-filter
                handleTagFilter(window.tagSystem.activeTagFilter);
            } else {
                // Otherwise just refresh current view to show/hide dots
                refresh();
            }
        };

        // ===== TABS INITIALIZATION =====
        window.tabManager = new window.TabManagerClass(state);

        // Hook up the view switcher
        window.tabManager.onTabSwitched = (tab) => {
            console.log('Switching to tab:', tab.path);
            // Restore state from tab
            // We use navigateTo but we need to bypass history pushing if we are just switching tabs
            // Actually navigateTo puts it in history... which is wrong for switching tabs.
            // We need a way to "Render View Only".
            renderForTab(tab);
        };

        // Create initial tab
        const initialPath = state.currentPath || state.specialFolders.documents || 'C:\\';
        window.tabManager.createTab(initialPath);

        // New Tab Button
        document.getElementById('new-tab-btn').addEventListener('click', () => {
            // Create tab with default path (Documents)
            window.tabManager.createTab(state.specialFolders.documents);
        });

        // ===== QUICK LOOK INITIALIZATION (PEEK) =====
        window.quickLook = new window.QuickLook();

        // ===== DUAL PANE INITIALIZATION (GOD MODE) =====
        window.dualPaneManager = new window.DualPaneManagerClass();

        // ===== COMMANDER PALETTE INITIALIZATION =====
        window.commander = new window.CommanderClass();

        // ===== ZEN MODE INITIALIZATION =====
        window.zenMode = new window.ZenMode();

        // ===== SIDEBAR RESIZER =====
        window.sidebarResizer = new window.SidebarResizerClass();

        // ===== THEME MANAGER =====
        window.themeManager = new window.ThemeManagerClass();

        // ===== DRAG & DROP MANAGER =====
        window.dragDropManager = new window.DragDropManagerClass();

        // Reverted Sidebar Manager


    } catch (error) {
        if (window.electronAPI && window.electronAPI.logToMain) {
            window.electronAPI.logToMain(`[INIT ERROR] ${error.message} \nStack: ${error.stack}`);
        }
        console.error('Failed to initialize app:', error);
        showError('Failed to initialize application');
    }
}

// Helper to render view without history side effects
async function renderForTab(tab) {
    state.currentPath = tab.path;
    state.history = tab.history;
    state.historyIndex = tab.historyIndex;

    // Update Tree
    updateTreeSelection(tab.path);
    updateNavigationButtons();
    updateBreadcrumb(tab.path);

    // Load Items
    showLoading();
    try {
        const items = await window.electronAPI.readDirectory(tab.path);
        displayItems(items);
        updateStatusBar(tab.path, items);

        // Scroll restoration
        if (tab.scrollTop) {
            setTimeout(() => {
                const grid = document.getElementById('fileGrid');
                if (grid) grid.scrollTop = tab.scrollTop;
            }, 0);
        }
    } catch (e) {
        console.error('Tab render failed', e);
    } finally {
        hideLoading();
    }
}

function setupEventListeners() {
    // Window controls are now handled natively by Electron WCO.


    // Navigation controls
    document.getElementById('backBtn').addEventListener('click', navigateBack);
    document.getElementById('forwardBtn').addEventListener('click', navigateForward);
    document.getElementById('upBtn').addEventListener('click', navigateUp);
    document.getElementById('refreshBtn').addEventListener('click', refresh);

    // View controls
    document.getElementById('gridViewBtn').addEventListener('click', () => setViewMode('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => setViewMode('list'));
    document.getElementById('detailsViewBtn').addEventListener('click', () => setViewMode('details'));

    // Zen Mode & Settings UI Triggers
    document.getElementById('zenBtn')?.addEventListener('click', () => window.zenMode.toggle());
    document.getElementById('settingsBtn')?.addEventListener('click', () => window.themeManager.showSettings());

    // Search
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    document.getElementById('filterType').addEventListener('change', (e) => {
        state.filterType = e.target.value;
        if (state.searchQuery) {
            handleSearch();
        } else {
            refresh();
        }
    });

    // Advanced search toggle
    document.getElementById('advancedSearchBtn').addEventListener('click', toggleAdvancedSearch);

    // Sort
    document.getElementById('sortBy').addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        refresh();
    });

    // Toolbar buttons
    document.getElementById('newFolderBtn').addEventListener('click', showNewFolderDialog);
    document.getElementById('copyBtn').addEventListener('click', copySelected);
    document.getElementById('cutBtn').addEventListener('click', cutSelected);
    document.getElementById('pasteBtn').addEventListener('click', pasteItems);
    document.getElementById('renameBtn').addEventListener('click', showRenameDialog);
    document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
    document.getElementById('previewBtn').addEventListener('click', togglePreview);

    // Preview panel
    document.getElementById('previewClose')?.addEventListener('click', () => togglePreview(false));

    // Dialog buttons
    document.getElementById('renameConfirm')?.addEventListener('click', confirmRename);
    document.getElementById('folderCreateConfirm')?.addEventListener('click', confirmNewFolder);

    // Sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', async () => {
            const pathKey = item.dataset.path;
            if (state.specialFolders[pathKey]) {
                await navigateTo(state.specialFolders[pathKey]);
            }
        });
    });

    // Context menu
    document.addEventListener('click', () => {
        hideContextMenu();
    });

    // Breadcrumb editing
    document.getElementById('breadcrumb').addEventListener('click', enablePathEditing);

    // Column sorting in details view
    document.querySelectorAll('.details-table th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            handleColumnSort(sortKey);
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // File grid click (deselect)
    document.getElementById('fileGrid').addEventListener('click', (e) => {
        if (e.target.id === 'fileGrid') {
            clearSelection();
        }
    });
}

async function loadDrives() {
    try {
        const drives = await window.electronAPI.getDrives();
        const drivesList = document.getElementById('drivesList');
        drivesList.innerHTML = '';

        drives.forEach(drive => {
            const driveItem = document.createElement('div');
            driveItem.className = 'sidebar-item';
            driveItem.innerHTML = `
                <span class="sidebar-icon">💾</span>
                <span>${drive.label}</span>
            `;
            driveItem.addEventListener('click', () => navigateTo(drive.path));
            drivesList.appendChild(driveItem);
        });

        return drives;
    } catch (error) {
        console.error('Failed to load drives:', error);
        return [];
    }
}

async function navigateTo(path) {
    // Dual Pane Intercept
    if (window.dualPaneManager && window.dualPaneManager.isActive) {
        // Delegate to dual pane manager if it needs to update specific pane state
        // But for now, app.js drives the "active" pane.
        // We just need to make sure we set the path on the active pane.
        window.dualPaneManager.states[window.dualPaneManager.activePane].path = path;
    }

    try {
        showLoading();

        // Clear search when navigating
        state.searchQuery = '';
        state.isSearching = false;
        document.getElementById('searchInput').value = '';

        const items = await window.electronAPI.readDirectory(path);

        // Update history
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }
        state.history.push(path);
        state.historyIndex = state.history.length - 1;

        state.currentPath = path;
        updateTreeSelection(path); // Sync tree selection

        // Sync with Tabs
        if (window.tabManager) {
            window.tabManager.updateCurrentTab(path);
        }

        updateNavigationButtons();
        updateBreadcrumb(path);
        displayItems(items);
        updateStatusBar(path, items);

    } catch (error) {
        console.error('Failed to navigate:', error);
        showError('Failed to open folder');
    } finally {
        hideLoading();
    }
}

function navigateBack() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const path = state.history[state.historyIndex];
        loadDirectory(path);
    }
}

function navigateForward() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const path = state.history[state.historyIndex];
        loadDirectory(path);
    }
}

async function navigateUp() {
    if (!state.currentPath) return;

    const parentPath = state.currentPath.split('\\').slice(0, -1).join('\\');
    if (parentPath) {
        await navigateTo(parentPath);
    }
}

async function refresh() {
    if (state.currentPath) {
        await loadDirectory(state.currentPath);
    }
}

async function loadDirectory(path) {
    try {
        showLoading();
        const items = await window.electronAPI.readDirectory(path);
        state.currentPath = path;
        updateNavigationButtons();
        updateBreadcrumb(path);
        displayItems(items);
        updateStatusBar(path, items);
    } catch (error) {
        console.error('Failed to load directory:', error);
        showError('Failed to load folder');
    } finally {
        hideLoading();
    }
}

// ===== ADVANCED SEARCH =====
function toggleAdvancedSearch() {
    state.advancedSearchVisible = !state.advancedSearchVisible;
    const panel = document.getElementById('advancedSearchPanel');
    const btn = document.getElementById('advancedSearchBtn');

    if (state.advancedSearchVisible) {
        panel.classList.remove('hidden');
        btn.classList.add('active');
    } else {
        panel.classList.add('hidden');
        btn.classList.remove('active');
    }
}

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    state.searchQuery = query;

    if (!query) {
        state.isSearching = false;
        refresh();
        return;
    }

    if (!state.currentPath) return;

    try {
        showLoading();
        state.isSearching = true;

        // Check if advanced search is enabled
        const useAdvanced = state.advancedSearchVisible;
        let results;

        if (useAdvanced) {
            // Advanced search with filters
            const options = {
                searchPath: state.currentPath,
                query: query,
                fileType: state.filterType,
                searchContent: document.getElementById('searchContent')?.checked || false,
                useRegex: document.getElementById('useRegex')?.checked || false,
                dateFrom: document.getElementById('dateFrom')?.value || null,
                dateTo: document.getElementById('dateTo')?.value || null,
                sizeMin: document.getElementById('sizeMin')?.value ? parseInt(document.getElementById('sizeMin').value) : null,
                sizeMax: document.getElementById('sizeMax')?.value ? parseInt(document.getElementById('sizeMax').value) : null
            };

            results = await window.electronAPI.advancedSearch(options);
        } else {
            // Basic search
            results = await window.electronAPI.searchFiles(
                state.currentPath,
                query,
                state.filterType
            );
        }

        displayItems(results);
        updateItemCount(results.length);

        if (results.length === 0) {
            showNoResults();
        }
    } catch (error) {
        console.error('Search failed:', error);
        showError('Search failed');
    } finally {
        hideLoading();
    }
}

// ===== FILE OPERATIONS =====
function copySelected() {
    if (state.selectedItems.size === 0) return;

    state.clipboard.items = Array.from(state.selectedItems);
    state.clipboard.operation = 'copy';
    updateToolbarButtons();
    showNotification(`Copied ${state.clipboard.items.length} item(s)`);
}

function cutSelected() {
    if (state.selectedItems.size === 0) return;

    state.clipboard.items = Array.from(state.selectedItems);
    state.clipboard.operation = 'cut';
    updateToolbarButtons();
    showNotification(`Cut ${state.clipboard.items.length} item(s)`);
}

async function pasteItems() {
    if (state.clipboard.items.length === 0 || !state.currentPath) return;

    try {
        showLoading();

        if (state.clipboard.operation === 'copy') {
            const result = await window.electronAPI.copyItems(
                state.clipboard.items,
                state.currentPath
            );

            if (result.success) {
                showNotification('Items copied successfully');
                refresh();
            } else {
                showError(`Failed to copy: ${result.error}`);
            }
        } else if (state.clipboard.operation === 'cut') {
            const result = await window.electronAPI.moveItems(
                state.clipboard.items,
                state.currentPath
            );

            if (result.success) {
                showNotification('Items moved successfully');
                state.clipboard.items = [];
                state.clipboard.operation = null;
                updateToolbarButtons();
                refresh();
            } else {
                showError(`Failed to move: ${result.error}`);
            }
        }
    } catch (error) {
        console.error('Paste failed:', error);
        showError('Failed to paste items');
    } finally {
        hideLoading();
    }
}

function deleteSelected() {
    if (state.selectedItems.size === 0) return;
    handleContextAction('delete', null);
}

// ===== DIALOGS =====
function showNewFolderDialog() {
    const dialog = document.getElementById('newFolderDialog');
    const input = document.getElementById('folderNameInput');
    dialog.classList.remove('hidden');
    input.value = 'New Folder';
    input.select();
    input.focus();
}

function hideNewFolderDialog() {
    document.getElementById('newFolderDialog').classList.add('hidden');
}

async function confirmNewFolder() {
    const folderName = document.getElementById('folderNameInput').value.trim();

    if (!folderName) {
        showError('Please enter a folder name');
        return;
    }

    try {
        const result = await window.electronAPI.createFolder(state.currentPath, folderName);

        if (result.success) {
            hideNewFolderDialog();
            showNotification('Folder created successfully');
            refresh();
        } else {
            showError(`Failed to create folder: ${result.error}`);
        }
    } catch (error) {
        console.error('Create folder failed:', error);
        showError('Failed to create folder');
    }
}

function showRenameDialog() {
    if (state.selectedItems.size !== 1) {
        showError('Please select exactly one item to rename');
        return;
    }

    const path = Array.from(state.selectedItems)[0];
    const name = path.split('\\').pop();

    const dialog = document.getElementById('renameDialog');
    const input = document.getElementById('renameInput');
    dialog.classList.remove('hidden');
    input.value = name;
    input.select();
    input.focus();
}

function hideRenameDialog() {
    document.getElementById('renameDialog').classList.add('hidden');
}

async function confirmRename() {
    const newName = document.getElementById('renameInput').value.trim();

    if (!newName) {
        showError('Please enter a new name');
        return;
    }

    const oldPath = Array.from(state.selectedItems)[0];

    try {
        const result = await window.electronAPI.renameItem(oldPath, newName);

        if (result.success) {
            hideRenameDialog();
            showNotification('Item renamed successfully');
            clearSelection();
            refresh();
        } else {
            showError(`Failed to rename: ${result.error}`);
        }
    } catch (error) {
        console.error('Rename failed:', error);
        showError('Failed to rename item');
    }
}

// Make dialog functions global
window.hideNewFolderDialog = hideNewFolderDialog;
window.hideRenameDialog = hideRenameDialog;

// ===== PREVIEW PANEL =====
function togglePreview(show) {
    if (show === undefined) {
        state.previewVisible = !state.previewVisible;
    } else {
        state.previewVisible = show;
    }

    const panel = document.getElementById('previewPanel');
    const btn = document.getElementById('previewBtn');

    if (state.previewVisible) {
        panel.classList.remove('hidden');
        btn.classList.add('active');
        if (state.currentItem) {
            updatePreview(state.currentItem);
        }
    } else {
        panel.classList.add('hidden');
        btn.classList.remove('active');
    }
}

async function updatePreview(item) {
    if (!state.previewVisible) return;

    // Update basic info
    document.getElementById('previewName').textContent = item.name;
    document.getElementById('previewType').textContent = item.isDirectory ? 'Folder' : (item.extension || 'File');
    document.getElementById('previewSize').textContent = formatFileSize(item.size);
    document.getElementById('previewModified').textContent = new Date(item.modified).toLocaleString();
    document.getElementById('previewCreated').textContent = new Date(item.created).toLocaleString();
    document.getElementById('previewPath').textContent = item.path;

    // Update icon/thumbnail
    const thumbnailDiv = document.getElementById('previewThumbnail');
    thumbnailDiv.innerHTML = '';

    // Try to load thumbnail for images
    if (!item.isDirectory) {
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        if (imageExts.includes(item.extension)) {
            try {
                const result = await window.electronAPI.getThumbnail(item.path);
                if (result.success) {
                    const img = document.createElement('img');
                    img.src = result.data;
                    thumbnailDiv.appendChild(img);
                } else {
                    thumbnailDiv.innerHTML = `<div class="preview-icon">${getFileIcon(item)}</div>`;
                }
            } catch (e) {
                thumbnailDiv.innerHTML = `<div class="preview-icon">${getFileIcon(item)}</div>`;
            }
        } else {
            thumbnailDiv.innerHTML = `<div class="preview-icon">${getFileIcon(item)}</div>`;
        }
    } else {
        thumbnailDiv.innerHTML = `<div class="preview-icon">${getFileIcon(item)}</div>`;
    }

    // Try to load text preview
    const previewText = document.getElementById('previewText');
    const textExts = ['.txt', '.js', '.ts', '.py', '.html', '.css', '.json', '.xml', '.md'];

    if (!item.isDirectory && textExts.includes(item.extension)) {
        try {
            const result = await window.electronAPI.readFileContent(item.path);
            if (result.success) {
                document.getElementById('previewTextContent').textContent = result.content.substring(0, 1000);
                previewText.classList.remove('hidden');
            } else {
                previewText.classList.add('hidden');
            }
        } catch (e) {
            previewText.classList.add('hidden');
        }
    } else {
        previewText.classList.add('hidden');
    }
}

// ===== DISPLAY & UI =====
// Helper to get active pane elements
function getActivePaneElements() {
    // Default to 'left' / standard IDs if manager not present or inactive
    let activePane = 'left';
    if (window.dualPaneManager && window.dualPaneManager.isActive) {
        activePane = window.dualPaneManager.activePane;
    }

    if (activePane === 'right') {
        return {
            grid: document.getElementById('fileGrid-right'),
            empty: document.getElementById('emptyState-right'),
            noResults: document.getElementById('noResults'), // Shared for now?
            id: 'right'
        };
    }

    return {
        grid: document.getElementById('fileGrid'),
        empty: document.getElementById('emptyState'),
        noResults: document.getElementById('noResults'),
        id: 'left'
    };
}

function displayItems(items) {
    const pane = getActivePaneElements();

    // Hide empty/no results states
    if (pane.empty) pane.empty.classList.add('hidden');
    if (pane.noResults) pane.noResults.classList.add('hidden');

    // Clear grid first to avoid ghost items
    if (pane.grid) pane.grid.innerHTML = '';

    if (state.viewMode === 'details') {
        // Details view usually shared or needs per-pane table?
        // Implementing dual-pane details view is complex. 
        // Force Grid for now or clear shared table?
        // Let's rely on global settings but we might get collisions.
        // For 'God Mode' MVP, let's assume Grid Mode mostly.
        document.getElementById('detailsTableBody').innerHTML = '';
    }

    if (items.length === 0) {
        if (state.isSearching) {
            showNoResults();
        } else {
            showEmptyState(); // Needs update to support target
        }
        // Update counts even if empty
        updateItemCount(0);
        return;
    }

    // Sort items
    const sortedItems = sortItems(items);

    // Filter items if needed
    const filteredItems = filterItems(sortedItems);

    // Cache for navigation
    state.currentItems = filteredItems;

    // Display based on view mode
    if (state.viewMode === 'details') {
        displayItemsDetails(filteredItems);
    } else {
        displayItemsGrid(filteredItems, pane.grid);
    }

    updateItemCount(filteredItems.length);
}

function displayItemsGrid(items, targetGrid = null) {
    const fileGrid = targetGrid || document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    // Display items
    items.forEach((item, index) => {
        const fileItem = createFileItem(item, index);
        fileItem.style.animationDelay = `${index * 20}ms`;
        fileGrid.appendChild(fileItem);
    });
}

function createFileItem(item, index) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.dataset.path = item.path;
    div.dataset.isDirectory = item.isDirectory;
    div.dataset.index = index;

    const icon = getFileIcon(item);
    const size = item.isDirectory ? '' : formatFileSize(item.size);
    const modified = formatDate(item.modified);

    // Create detailed tooltip
    const tooltip = `${item.name}\n${size ? `Size: ${size}\n` : ''}Modified: ${modified}`;
    div.title = tooltip;

    // Enable Draggable
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', (e) => {
        e.preventDefault();
        window.electronAPI.startDrag(item.path);
    });

    div.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-name">${item.name}</div>
        ${size ? `<div class="file-info">${size} • ${modified}</div>` : `<div class="file-info">${modified}</div>`}
    `;

    // Double click to open
    // Add tag dots
    const tags = window.tagSystem ? window.tagSystem.getTagsForFile(item.path) : [];
    if (tags.length > 0) {
        const tagContainer = document.createElement('div');
        tagContainer.className = 'file-tag-indicator';
        tags.forEach(tagId => {
            const tagInfo = window.tagSystem.getTagInfo(tagId);
            if (tagInfo) {
                const dot = document.createElement('div');
                dot.className = 'file-tag-dot';
                dot.style.backgroundColor = tagInfo.color;
                dot.title = tagInfo.label;
                tagContainer.appendChild(dot);
            }
        });
        div.appendChild(tagContainer);
    }

    // Double click to open
    div.addEventListener('dblclick', async () => {
        if (item.isDirectory) {
            await navigateTo(item.path);
        } else {
            await window.electronAPI.openItem(item.path);
        }
    });

    // Single click to select
    div.addEventListener('click', (e) => {
        if (e.shiftKey && state.lastSelectedIndex !== -1) {
            // Range selection
            selectRange(state.lastSelectedIndex, index);
        } else if (e.ctrlKey) {
            toggleSelection(item.path, div, item);
            state.lastSelectedIndex = index;
        } else {
            clearSelection();
            selectItem(item.path, div, item);
            state.lastSelectedIndex = index;
        }
        state.focusedItemIndex = index;
        div.classList.add('focused');
    });

    // Right click for context menu
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!state.selectedItems.has(item.path)) {
            clearSelection();
            selectItem(item.path, div, item);
        }
        // Use the new showContextMenu signature
        showContextMenu(e, item.path);
    });


    // Custom Tooltip
    div.addEventListener('mouseenter', () => {
        if (window.TooltipManager) window.TooltipManager.show(div, item);
    });
    div.addEventListener('mouseleave', () => {
        if (window.TooltipManager) window.TooltipManager.hide();
    });

    return div;
}


function getFileIcon(item) {
    if (item.isDirectory) {
        return FILE_ICONS.folder;
    }

    const ext = item.extension;
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
    const videoExts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'];
    const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'];
    const codeExts = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.html', '.css'];
    const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    const docExts = ['.txt', '.doc', '.docx', '.pdf', '.rtf'];

    if (imageExts.includes(ext)) return FILE_ICONS.image;
    if (videoExts.includes(ext)) return FILE_ICONS.video;
    if (audioExts.includes(ext)) return FILE_ICONS.audio;
    if (codeExts.includes(ext)) return FILE_ICONS.code;
    if (archiveExts.includes(ext)) return FILE_ICONS.archive;
    if (docExts.includes(ext)) return FILE_ICONS.document;

    return FILE_ICONS.file;
}

function sortItems(items) {
    const sorted = [...items];

    // Always put folders first
    sorted.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;

        switch (state.sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'date':
                return new Date(b.modified) - new Date(a.modified);
            case 'size':
                return b.size - a.size;
            case 'type':
                const extA = a.extension || '';
                const extB = b.extension || '';
                return extA.localeCompare(extB);
            default:
                return 0;
        }
    });

    return sorted;
}

function filterItems(items) {
    if (state.filterType === 'all') return items;

    return items.filter(item => {
        if (state.filterType === 'folder') return item.isDirectory;

        const ext = item.extension;
        switch (state.filterType) {
            case 'document':
                return ['.txt', '.doc', '.docx', '.pdf', '.rtf', '.odt'].includes(ext);
            case 'image':
                return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(ext);
            case 'video':
                return ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'].includes(ext);
            case 'audio':
                return ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'].includes(ext);
            case 'code':
                return ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.html', '.css', '.json'].includes(ext);
            case 'archive':
                return ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext);
            default:
                return true;
        }
    });
}

function selectItem(path, element, item) {
    state.selectedItems.add(path);
    element.classList.add('selected');
    state.currentItem = item;
    updateSelectedCount();
    updateToolbarButtons();

    // Update preview if visible
    if (state.previewVisible && item) {
        updatePreview(item);
    }
}

function toggleSelection(path, element, item) {
    if (state.selectedItems.has(path)) {
        state.selectedItems.delete(path);
        element.classList.remove('selected');
    } else {
        state.selectedItems.add(path);
        element.classList.add('selected');
        state.currentItem = item;
    }
    updateSelectedCount();
    updateToolbarButtons();
}

function clearSelection() {
    state.selectedItems.clear();
    state.currentItem = null;
    document.querySelectorAll('.file-item.selected').forEach(el => {
        el.classList.remove('selected');
    });
    updateSelectedCount();
    updateToolbarButtons();
}

function updateToolbarButtons() {
    const hasSelection = state.selectedItems.size > 0;
    const hasClipboard = state.clipboard.items.length > 0;

    document.getElementById('copyBtn').disabled = !hasSelection;
    document.getElementById('cutBtn').disabled = !hasSelection;
    document.getElementById('pasteBtn').disabled = !hasClipboard;
    document.getElementById('renameBtn').disabled = state.selectedItems.size !== 1;
    document.getElementById('deleteBtn').disabled = !hasSelection;
}

function setViewMode(mode) {
    state.viewMode = mode;
    const fileGrid = document.getElementById('fileGrid');
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');

    if (mode === 'grid') {
        fileGrid.classList.remove('list-view');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        fileGrid.classList.add('list-view');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    }
}

function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';

    const parts = path.split('\\').filter(p => p);

    parts.forEach((part, index) => {
        if (index > 0) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '›';
            breadcrumb.appendChild(separator);
        }

        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        if (index === parts.length - 1) {
            item.classList.add('active');
        }
        item.textContent = part;

        const itemPath = parts.slice(0, index + 1).join('\\');
        item.addEventListener('click', () => navigateTo(itemPath));

        breadcrumb.appendChild(item);
    });
}

function updateNavigationButtons() {
    document.getElementById('backBtn').disabled = state.historyIndex <= 0;
    document.getElementById('forwardBtn').disabled = state.historyIndex >= state.history.length - 1;
    document.getElementById('upBtn').disabled = !state.currentPath || state.currentPath.split('\\').length <= 1;
}

function updateStatusBar(path, items) {
    document.getElementById('currentPath').textContent = path;
}

function updateItemCount(count) {
    document.getElementById('itemCount').textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

function updateSelectedCount() {
    const selectedCount = document.getElementById('selectedCount');
    if (state.selectedItems.size > 0) {
        selectedCount.textContent = `${state.selectedItems.size} selected`;
        selectedCount.classList.remove('hidden');
    } else {
        selectedCount.classList.add('hidden');
    }
}

function setViewMode(mode) {
    state.viewMode = mode;
    const fileGrid = document.getElementById('fileGrid');
    const fileDetails = document.getElementById('fileDetails');
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const detailsBtn = document.getElementById('detailsViewBtn');

    // Remove all active states
    gridBtn.classList.remove('active');
    listBtn.classList.remove('active');
    detailsBtn.classList.remove('active');

    if (mode === 'grid') {
        fileGrid.classList.remove('list-view', 'hidden');
        fileDetails.classList.add('hidden');
        gridBtn.classList.add('active');
    } else if (mode === 'list') {
        fileGrid.classList.add('list-view');
        fileGrid.classList.remove('hidden');
        fileDetails.classList.add('hidden');
        listBtn.classList.add('active');
    } else if (mode === 'details') {
        fileGrid.classList.add('hidden');
        fileDetails.classList.remove('hidden');
        detailsBtn.classList.add('active');
    }

    // Re-render with new view
    if (state.currentItems.length > 0) {
        displayItems(state.currentItems);
    }
}

function updateToolbarButtons() {
    const hasSelection = state.selectedItems.size > 0;
    const hasClipboard = state.clipboard.items.length > 0;

    document.getElementById('copyBtn').disabled = !hasSelection;
    document.getElementById('cutBtn').disabled = !hasSelection;
    document.getElementById('pasteBtn').disabled = !hasClipboard;
    document.getElementById('renameBtn').disabled = state.selectedItems.size !== 1;
    document.getElementById('deleteBtn').disabled = !hasSelection;
}

function showContextMenu(x, y, item) {
    const menu = document.getElementById('contextMenu');
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');

    // Remove old listeners
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);

    // Add new listeners
    newMenu.querySelectorAll('.context-item').forEach(menuItem => {
        menuItem.addEventListener('click', async () => {
            const action = menuItem.dataset.action;
            await handleContextAction(action, item);
            hideContextMenu();
        });
    });
}

function hideContextMenu() {
    document.getElementById('contextMenu').classList.add('hidden');
}

async function handleContextAction(action, item) {
    const selectedPaths = Array.from(state.selectedItems);

    switch (action) {
        case 'open':
            if (item.isDirectory) {
                await navigateTo(item.path);
            } else {
                await window.electronAPI.openItem(item.path);
            }
            break;
        case 'copy':
            copySelected();
            break;
        case 'cut':
            cutSelected();
            break;
        case 'paste':
            await pasteItems();
            break;
        case 'rename':
            showRenameDialog();
            break;
        case 'delete':
            if (confirm(`Delete ${selectedPaths.length} item(s)?`)) {
                const result = await window.electronAPI.deleteItems(selectedPaths);
                if (result.success) {
                    clearSelection();
                    refresh();
                } else {
                    showError('Failed to delete items');
                }
            }
            break;
        case 'properties':
            const props = await window.electronAPI.getItemProperties(item.path);
            alert(`Properties:\nSize: ${formatFileSize(props.size)}\nCreated: ${new Date(props.created).toLocaleString()}\nModified: ${new Date(props.modified).toLocaleString()}`);
            break;
    }
}

function handleKeyboard(e) {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT') return;

    // Ctrl+A - Select all
    if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        document.querySelectorAll('.file-item').forEach(item => {
            const itemData = {
                path: item.dataset.path,
                isDirectory: item.dataset.isDirectory === 'true'
            };
            selectItem(item.dataset.path, item, itemData);
        });
    }

    // Ctrl+C - Copy
    if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        copySelected();
    }

    // Ctrl+X - Cut
    if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        cutSelected();
    }

    // Ctrl+V - Paste
    if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        pasteItems();
    }

    // F2 - Rename
    if (e.key === 'F2') {
        e.preventDefault();
        showRenameDialog();
    }

    // Delete key
    if (e.key === 'Delete' && state.selectedItems.size > 0) {
        deleteSelected();
    }

    // Escape - Clear selection
    if (e.key === 'Escape') {
        clearSelection();
    }

    // Enter - Open selected
    if (e.key === 'Enter' && state.currentItem) {
        if (state.currentItem.isDirectory) {
            navigateTo(state.currentItem.path);
        } else {
            window.electronAPI.openItem(state.currentItem.path);
        }
    }

    // Backspace - Navigate up
    if (e.key === 'Backspace') {
        e.preventDefault();
        navigateUp();
    }

    // Arrow keys, Home, End, PageUp/Down - Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        handleArrowKeys(e);
    }
}

function showLoading() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('fileGrid').style.opacity = '0.5';
}

function hideLoading() {
    document.getElementById('loadingIndicator').classList.add('hidden');
    document.getElementById('fileGrid').style.opacity = '1';
}

function showEmptyState() {
    const pane = getActivePaneElements();
    if (pane.empty) {
        pane.empty.classList.remove('hidden');
        const h3 = pane.empty.querySelector('h3');
        if (h3) h3.textContent = 'This folder is empty';
    }
}
function showNoResults() {
    document.getElementById('noResults').classList.remove('hidden');
}

function showError(message) {
    alert(message); // In production, use a better notification system
}

function showNotification(message) {
    // Simple notification - could be enhanced with a toast system
    console.log('Notification:', message);
}

// ===== PHASE 2: DETAILS VIEW =====
function displayItemsDetails(items) {
    const tbody = document.getElementById('detailsTableBody');
    tbody.innerHTML = '';

    if (items.length === 0) {
        return;
    }

    // Sort items
    const sortedItems = sortItems(items);

    // Filter items if needed
    const filteredItems = filterItems(sortedItems);

    // Cache for navigation
    state.currentItems = filteredItems;

    // Display items
    filteredItems.forEach((item, index) => {
        const row = createDetailsRow(item, index);
        tbody.appendChild(row);
    });

    updateItemCount(filteredItems.length);
}

function createDetailsRow(item, index) {
    const tr = document.createElement('tr');
    tr.dataset.path = item.path;
    tr.dataset.isDirectory = item.isDirectory;
    tr.dataset.index = index;

    const icon = getFileIcon(item);
    const size = item.isDirectory ? '-' : formatFileSize(item.size);
    const type = item.isDirectory ? 'Folder' : (item.extension ? item.extension.substring(1).toUpperCase() + ' File' : 'File');
    const modified = new Date(item.modified).toLocaleString();

    tr.innerHTML = `
        <td class="file-name-cell">
            <span class="file-icon-small">${icon}</span>
            <span>${item.name}</span>
        </td>
        <td class="file-date">${modified}</td>
        <td class="file-type">${type}</td>
        <td class="file-size">${size}</td>
    `;

    // Double click to open
    tr.addEventListener('dblclick', async () => {
        if (item.isDirectory) {
            await navigateTo(item.path);
        } else {
            await window.electronAPI.openItem(item.path);
        }
    });

    // Single click to select
    tr.addEventListener('click', (e) => {
        if (e.shiftKey && state.lastSelectedIndex !== -1) {
            // Range selection
            selectRange(state.lastSelectedIndex, index);
        } else if (e.ctrlKey) {
            // Toggle selection
            toggleSelection(item.path, tr, item); // Keep original signature for now
            state.lastSelectedIndex = index;
        } else {
            // Single selection
            clearSelection();
            selectItem(item.path, tr, item); // Keep original signature for now
            state.lastSelectedIndex = index;
        }
        state.focusedItemIndex = index;
        tr.classList.add('focused');
    });

    // Right click for context menu
    tr.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!state.selectedItems.has(item.path)) {
            clearSelection();
            selectItem(item.path, tr, item);
        }
        showContextMenu(e.clientX, e.clientY, item);
    });

    return tr;
}

function handleColumnSort(column) {
    // Toggle sort direction if same column
    if (state.sortBy === column) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortBy = column;
        state.sortDirection = 'asc';
    }

    // Update column headers
    document.querySelectorAll('.details-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });

    const activeHeader = document.querySelector(`.details-table th[data-sort="${column}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sort-${state.sortDirection}`);
    }

    // Re-render
    refresh();
}

// ===== PHASE 2: RANGE SELECTION =====
function selectRange(startIndex, endIndex) {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);

    clearSelection();

    for (let i = start; i <= end; i++) {
        if (i < state.currentItems.length) {
            const item = state.currentItems[i];
            const element = getItemElement(i);
            if (element) {
                selectItem(item.path, element, item);
            }
        }
    }
}

function getItemElement(index) {
    if (state.viewMode === 'details') {
        return document.querySelector(`.details-table tbody tr[data-index="${index}"]`);
    } else {
        const items = document.querySelectorAll('.file-item');
        return items[index];
    }
}

// ===== TAG SYSTEM UI =====
function initializeTagsSidebar() {
    const list = document.getElementById('tagsList');
    if (!list) return;
    list.innerHTML = '';

    window.tagSystem.availableTags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.tagId = tag.id;
        item.innerHTML = `
            <span class="tag-dot" style="background-color: ${tag.color}"></span>
            <span>${tag.label}</span>
        `;

        item.addEventListener('click', () => {
            // Toggle active state
            document.querySelectorAll('.sidebar-item[data-tag-id]').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // Navigate to tag view
            navigateToTagView(tag.id);
        });

        list.appendChild(item);
    });
}

function navigateToTagView(tagId) {
    state.currentPath = 'tags://view';
    window.tagSystem.activeTagFilter = tagId;

    state.isSearching = false; // Disable regular search
    updateNavigationButtons();
    updateBreadcrumb(`Tag: ${window.tagSystem.getTagInfo(tagId).label}`);

    handleTagFilter(tagId);
}

function handleTagFilter(tagId) {
    if (state.currentPath !== 'tags://view') return;

    const allTags = window.tagSystem.fileTags;
    // We need to find all files that have this tag.
    // Since we only have the map filePath -> tags, we iterate.
    // In a tailored backend we would search by tag, but iterating client side cache is fine for now.

    const matchedFiles = [];
    Object.entries(allTags).forEach(([path, tags]) => {
        if (tags.includes(tagId)) {
            // We need file stats. The tag store only has path.
            // Ideally backend 'search-by-tag' would return stats.
            // For now, we'll mock the item object or try to read it.
            // Let's assume we can display it with just path and name.
            matchedFiles.push({
                name: path.split('\\').pop(),
                path: path,
                isDirectory: false, // Tags usually on files
                size: 0,
                modified: new Date(),
                extension: '.' + path.split('.').pop()
            });
        }
    });

    displayItems(matchedFiles);
    updateItemCount(matchedFiles.length);
    if (matchedFiles.length === 0) {
        showNoResults();
    }
}

// Update Context Menu to include Tags
function showContextMenu(e, itemPath) {
    e.preventDefault();
    const menu = document.getElementById('contextMenu');

    // ... existing logic to position menu ...
    // We need to inject the Tag submenu if not present

    if (!document.getElementById('context-tags')) {
        const tagItem = document.createElement('div');
        tagItem.className = 'context-item';
        tagItem.id = 'context-tags';
        tagItem.innerHTML = `
            <span>Tags</span>
            <span class="shortcut">▶</span>
            <div class="context-submenu" id="tagSubmenu"></div>
        `;

        // Insert before Properties (last item)
        const props = menu.querySelector('[data-action="properties"]');
        menu.insertBefore(tagItem, props);
        menu.insertBefore(document.createElement('div'), props).className = 'context-divider';
    }

    // Populate submenu with current state
    const submenu = document.getElementById('tagSubmenu');
    submenu.innerHTML = '';
    const fileTags = window.tagSystem.getTagsForFile(itemPath);

    window.tagSystem.availableTags.forEach(tag => {
        const container = document.createElement('div');
        container.className = 'tag-option';
        const hasTag = fileTags.includes(tag.id);

        container.innerHTML = `
            <span class="tag-dot" style="background-color: ${tag.color}"></span>
            <span>${tag.label}</span>
            ${hasTag ? '<span style="margin-left:auto;">✓</span>' : ''}
        `;

        container.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            if (hasTag) {
                await window.tagSystem.removeTag(itemPath, tag.id);
            } else {
                await window.tagSystem.addTag(itemPath, tag.id);
            }
            hideContextMenu();
        });

        submenu.appendChild(container);
    });

    const x = e.clientX;
    const y = e.clientY;

    // Boundary checks (basic)
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');

    // Store current target
    menu.dataset.targetPath = itemPath;
}

// Hook into creating file items to attach context menu
// Note: The original showContextMenu logic was inside the file item event listener or global.
// We need to make sure we replace/upgrade the global or local handler.
// Looking at original app.js, context menu logic specific to items wasn't fully visible in snippets.
// I will just add this 'showContextMenu' function and assume I need to call it.
// Wait, I need to attach it to the file items.

function handleArrowKeys(e) {
    if (state.currentItems.length === 0) return;

    let newIndex = state.focusedItemIndex;

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            newIndex = Math.max(0, state.focusedItemIndex - 1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            newIndex = Math.min(state.currentItems.length - 1, state.focusedItemIndex + 1);
            break;
        case 'ArrowLeft':
            if (state.viewMode === 'grid') {
                e.preventDefault();
                newIndex = Math.max(0, state.focusedItemIndex - 1);
            }
            break;
        case 'ArrowRight':
            if (state.viewMode === 'grid') {
                e.preventDefault();
                newIndex = Math.min(state.currentItems.length - 1, state.focusedItemIndex + 1);
            }
            break;
        case 'Home':
            e.preventDefault();
            newIndex = 0;
            break;
        case 'End':
            e.preventDefault();
            newIndex = state.currentItems.length - 1;
            break;
        case 'PageUp':
            e.preventDefault();
            newIndex = Math.max(0, state.focusedItemIndex - 10);
            break;
        case 'PageDown':
            e.preventDefault();
            newIndex = Math.min(state.currentItems.length - 1, state.focusedItemIndex + 10);
            break;
        default:
            return;
    }

    if (newIndex !== state.focusedItemIndex) {
        focusItem(newIndex, e.shiftKey);
    }
}

function focusItem(index, extendSelection = false) {
    if (index < 0 || index >= state.currentItems.length) return;

    const item = state.currentItems[index];
    const element = getItemElement(index);

    if (!element) return;

    // Remove old focus
    document.querySelectorAll('.file-item.focused, .details-table tr.focused').forEach(el => {
        el.classList.remove('focused');
    });

    // Add new focus
    element.classList.add('focused');
    state.focusedItemIndex = index;

    // Handle selection
    if (extendSelection && state.lastSelectedIndex !== -1) {
        selectRange(state.lastSelectedIndex, index);
    } else if (!extendSelection) {
        clearSelection();
        selectItem(item.path, element, item);
        state.lastSelectedIndex = index;
    }

    // Scroll into view
    scrollItemIntoView(element);

    // Update preview
    if (state.previewVisible) {
        updatePreview(item);
    }
}

function scrollItemIntoView(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== PHASE 2: EDITABLE ADDRESS BAR =====
function enablePathEditing(e) {
    if (state.isEditingPath) return;
    if (e.target.classList.contains('breadcrumb-item')) return; // Don't edit on item click

    state.isEditingPath = true;
    const breadcrumb = document.getElementById('breadcrumb');
    const currentPath = state.currentPath;

    breadcrumb.innerHTML = `
        <input 
            type="text" 
            id="pathInput" 
            value="${currentPath}"
            style="flex: 1; background: var(--glass-active); border: 1px solid var(--accent-primary); 
                   border-radius: var(--radius-sm); padding: 6px 12px; color: var(--text-primary); 
                   outline: none; font-size: 13px; font-family: inherit;"
        />
    `;

    const input = document.getElementById('pathInput');
    input.focus();
    input.select();

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateToPath(input.value);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelPathEditing();
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (state.isEditingPath) {
                cancelPathEditing();
            }
        }, 100);
    });
}

async function navigateToPath(path) {
    state.isEditingPath = false;

    try {
        await navigateTo(path);
    } catch (error) {
        showError('Invalid path or access denied');
        updateBreadcrumb(state.currentPath);
    }
}

function cancelPathEditing() {
    state.isEditingPath = false;
    updateBreadcrumb(state.currentPath);
}

// ===== SIDEBAR COLLAPSIBLE & SORTABLE SECTIONS =====
function initializeSidebarSections() {
    // Load saved section states from localStorage
    const savedStates = JSON.parse(localStorage.getItem('sidebarSectionStates') || '{}');
    const savedOrder = JSON.parse(localStorage.getItem('sidebarSectionOrder') || '[]');

    // Apply saved collapsed states
    document.querySelectorAll('.sidebar-section').forEach(section => {
        const sectionId = section.dataset.section;
        if (savedStates[sectionId] === 'collapsed') {
            section.classList.add('collapsed');
        }

        // Add collapse toggle listener
        const header = section.querySelector('.section-header');
        if (header) {
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking drag handle
                if (e.target.classList.contains('drag-handle')) return;
                toggleSection(section);
            });
        }
    });

    // Apply saved section order
    if (savedOrder.length > 0) {
        const sidebar = document.getElementById('sidebarSections');
        const sections = Array.from(sidebar.querySelectorAll('.sidebar-section'));

        savedOrder.forEach(sectionId => {
            const section = sections.find(s => s.dataset.section === sectionId);
            if (section) {
                sidebar.appendChild(section);
            }
        });
    }

    // Initialize drag and drop
    initializeSectionDragDrop();
}

function toggleSection(section) {
    section.classList.toggle('collapsed');

    // Save state
    const sectionId = section.dataset.section;
    const savedStates = JSON.parse(localStorage.getItem('sidebarSectionStates') || '{}');
    savedStates[sectionId] = section.classList.contains('collapsed') ? 'collapsed' : 'expanded';
    localStorage.setItem('sidebarSectionStates', JSON.stringify(savedStates));
}

function initializeSectionDragDrop() {
    const sidebar = document.getElementById('sidebarSections');
    const sections = sidebar.querySelectorAll('.sidebar-section');

    let draggedSection = null;

    sections.forEach(section => {
        const dragHandle = section.querySelector('.drag-handle');
        if (!dragHandle) return;

        // Make section draggable via handle
        dragHandle.addEventListener('mousedown', (e) => {
            section.setAttribute('draggable', 'true');
        });

        section.addEventListener('dragstart', (e) => {
            draggedSection = section;
            section.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        section.addEventListener('dragend', (e) => {
            section.classList.remove('dragging');
            section.setAttribute('draggable', 'false');

            // Remove all drag-over classes
            sections.forEach(s => s.classList.remove('drag-over'));

            // Save new order
            saveSectionOrder();
        });

        section.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (draggedSection && draggedSection !== section) {
                // Remove drag-over from all sections
                sections.forEach(s => s.classList.remove('drag-over'));
                section.classList.add('drag-over');
            }
        });

        section.addEventListener('dragleave', (e) => {
            section.classList.remove('drag-over');
        });

        section.addEventListener('drop', (e) => {
            e.preventDefault();
            section.classList.remove('drag-over');

            if (draggedSection && draggedSection !== section) {
                // Determine if we should insert before or after
                const rect = section.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;

                if (e.clientY < midpoint) {
                    sidebar.insertBefore(draggedSection, section);
                } else {
                    sidebar.insertBefore(draggedSection, section.nextSibling);
                }
            }
        });
    });
}

function saveSectionOrder() {
    const sidebar = document.getElementById('sidebarSections');
    const sections = sidebar.querySelectorAll('.sidebar-section');
    const order = Array.from(sections).map(s => s.dataset.section);
    localStorage.setItem('sidebarSectionOrder', JSON.stringify(order));
}

// ===== PROFESSIONAL TREE SYSTEM INTEGRATION =====
let fileTreeSystem;

async function initializeFolderTrees() {
    console.log('Initializing Professional FileTree System...');

    // Initialize the singleton
    fileTreeSystem = new window.FileTreeSystem(document.body, state);

    // Hook navigation callback
    fileTreeSystem.onNavigate = (path) => {
        navigateTo(path);
    };

    // Find all Nav Groups (Slot Pattern)
    const navGroups = document.querySelectorAll('.nav-group[data-path]');

    for (const group of navGroups) {
        let pathKey = group.dataset.path;
        let actualPath = pathKey;
        let containerId = 'tree-' + pathKey.replace(/\\/g, '-'); // Simple ID generation or use existing

        // Resolve special paths
        if (state.specialFolders[pathKey]) {
            actualPath = state.specialFolders[pathKey];
        } else {
            // For custom items, assume pathKey is path, or handle otherwise
        }

        // Find the specific container for this group
        const container = group.querySelector('.nav-tree-container');
        if (container && actualPath && actualPath.includes('\\')) {
            await fileTreeSystem.mountToContainer(actualPath, container.id);
        }
    }

    // Bind the global sidebar events (click to expand)
    fileTreeSystem.bindSidebarEvents();
}

// Hook to ensure we select tree items when navigating
const originalNavigateTo = window.navigateTo; // If it was exposed, but it's internal
// We'll update the global navigateTo logic or just add a listener if we had an event bus.
// For now, we assume `navigateTo` calls `updateUI` or similar. Since we don't want to rewrite navigateTo widely,
// we trust the `fileTreeSystem.onNavigate` handles the click, and for external nav (breadcrumbs),
// we might need to call fileTreeSystem.selectNode(path) explicitly inside `displayItems` or `navigateTo`.

function updateTreeSelection(path) {
    if (fileTreeSystem) {
        fileTreeSystem.selectNode(path);
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return d.toLocaleDateString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== CUSTOM TOOLTIP MANAGER =====
const TooltipManager = {
    element: null,
    target: null,
    timer: null,
    sizeAbortController: null,

    init() {
        this.element = document.getElementById('custom-tooltip');

        // Follow mouse movement for positioning
        document.addEventListener('mousemove', (e) => {
            if (this.element && this.element.classList.contains('visible')) {
                this.updatePosition(e);
            }
        });
    },

    show(target, item) {
        this.target = target;

        // Clear pending size calculation
        if (this.sizeAbortController) {
            this.sizeAbortController.abort();
            this.sizeAbortController = null;
        }

        // Base Content
        const modified = formatDate(item.modified);
        let sizeDisplay = item.isDirectory ? 'Calculating...' : formatFileSize(item.size);

        this.render(item.name, sizeDisplay, modified, item.isDirectory ? 'Folder' : 'File');

        // Show immediately
        this.element.classList.add('visible');

        // If directory, calculating size
        if (item.isDirectory) {
            this.calculateFolderSize(item.path);
        }
    },

    hide() {
        if (this.element) this.element.classList.remove('visible');
        this.target = null;
        if (this.sizeAbortController) {
            this.sizeAbortController.abort();
            this.sizeAbortController = null;
        }
    },

    updatePosition(e) {
        const offset = 15;
        let left = e.clientX + offset;
        let top = e.clientY + offset;

        // Boundary checks
        const rect = this.element.getBoundingClientRect();
        if (left + rect.width > window.innerWidth) {
            left = e.clientX - rect.width - offset;
        }
        if (top + rect.height > window.innerHeight) {
            top = e.clientY - rect.height - offset;
        }

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    },

    render(name, size, modified, type) {
        this.element.innerHTML = `
            <div class="tooltip-header">${name}</div>
            <div class="tooltip-row">
                <span>Type:</span>
                <span>${type}</span>
            </div>
            <div class="tooltip-row">
                <span>Size:</span>
                <span id="tooltip-size">${size}</span>
            </div>
            <div class="tooltip-row">
                <span>Modified:</span>
                <span>${modified}</span>
            </div>
        `;
    },

    async calculateFolderSize(path) {
        this.sizeAbortController = new AbortController();
        const signal = this.sizeAbortController.signal;

        try {
            await new Promise(r => setTimeout(r, 200));
            if (signal.aborted) return;

            const sizeBytes = await window.electronAPI.getFolderSize(path);

            if (signal.aborted) return;

            const sizeEl = document.getElementById('tooltip-size');
            if (sizeEl) {
                sizeEl.textContent = formatFileSize(sizeBytes);
            }
        } catch (e) {
            if (!signal.aborted) {
                const sizeEl = document.getElementById('tooltip-size');
                if (sizeEl) sizeEl.textContent = 'Unknown';
            }
        }
    }
};

// Initialize Tooltip Manager
TooltipManager.init();


