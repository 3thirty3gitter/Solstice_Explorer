class DragDropManager {
    constructor() {
        this.draggedFiles = [];
        this.currentTarget = null;

        // Bind methods
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);

        this.init();
    }

    init() {
        // We'll attach global listeners to handle drop targets dynamically
        // Use capture phase to ensure we catch events
        document.addEventListener('dragover', this.handleDragOver, false);
        document.addEventListener('dragleave', this.handleDragLeave, false);
        document.addEventListener('drop', this.handleDrop, false);
    }

    handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.stopPropagation();

        const target = this.getDropTarget(e.target);

        if (target) {
            // Visual feedback
            if (this.currentTarget && this.currentTarget !== target) {
                this.currentTarget.classList.remove('drop-target');
            }
            this.currentTarget = target;
            this.currentTarget.classList.add('drop-target');

            // Set drop effect
            // We default to 'move' for internal ops, 'copy' for external if ctrl is pressed?
            // Windows default logic:
            // - Same drive: Move
            // - Different drive: Copy
            // For now, let's just default to 'move' visually unless we implement logic.
            // e.dataTransfer.dropEffect = 'move';
        } else {
            // Dragging over empty space in a pane = drop in current folder
            const pane = e.target.closest('.explorer-pane');
            if (pane) {
                if (this.currentTarget && this.currentTarget !== pane) {
                    this.currentTarget.classList.remove('drop-target');
                }
                this.currentTarget = pane;
                this.currentTarget.classList.add('drop-target');
            } else {
                if (this.currentTarget) {
                    this.currentTarget.classList.remove('drop-target');
                    this.currentTarget = null;
                }
            }
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        // Only remove if we are genuinely leaving the element, not entering a child
        if (this.currentTarget && e.target === this.currentTarget) {
            this.currentTarget.classList.remove('drop-target');
            this.currentTarget = null;
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this.currentTarget) {
            this.currentTarget.classList.remove('drop-target');
            this.currentTarget = null;
        }

        const target = this.getDropTarget(e.target);
        let destinationPath = null;

        if (target) {
            // Dropped on a folder (sidebar or grid item)
            destinationPath = target.dataset.path;
        } else {
            // Dropped on the pane background -> Move to current folder of that pane
            const pane = e.target.closest('.explorer-pane');
            if (pane) {
                // Determine which pane it is to get path
                if (pane.id === 'pane-left') {
                    // This assumes single pane mode mainly or left focus
                    // Ideally we check window.dualPaneManager for pane pointers
                    // But standard logic:
                    destinationPath = window.state.currentPath; // Simplification for now
                } else if (pane.id === 'pane-right') {
                    // If dual pane logic allows separate paths
                    destinationPath = window.state.secondaryPath || window.state.currentPath;
                } else {
                    destinationPath = window.state.currentPath;
                }
            }
        }

        if (!destinationPath) return;

        // Get Dropped Files
        // e.dataTransfer.files contains the FileLayout list from OS drop or Internal drop
        const files = Array.from(e.dataTransfer.files).map(f => f.path);

        if (files.length === 0) return;

        // Filter out dragging a folder into itself
        const validSources = files.filter(src => {
            return src !== destinationPath && path.dirname(src) !== destinationPath;
        });

        if (validSources.length === 0) return;

        // Execute Move (Default)
        // TODO: Support Copy via Ctrl key
        try {
            const isCopy = e.ctrlKey;

            if (isCopy) {
                await window.electronAPI.copyItems(validSources, destinationPath);
                window.showNotification(`Copied ${validSources.length} items`);
            } else {
                await window.electronAPI.moveItems(validSources, destinationPath);
                window.showNotification(`Moved ${validSources.length} items`);
            }

            // Refresh
            window.refresh();
        } catch (error) {
            console.error('Drop failed:', error);
            window.showError('Failed to move items');
        }
    }

    getDropTarget(element) {
        // Check for specific drop targets
        // 1. Sidebar Item (Folder)
        const sidebarItem = element.closest('.sidebar-item');
        if (sidebarItem && sidebarItem.dataset.path) return sidebarItem;

        // 2. File Grid Item (Directory only)
        const fileItem = element.closest('.file-item');
        if (fileItem && fileItem.dataset.isDirectory === 'true' && fileItem.dataset.path) {
            return fileItem;
        }

        // 3. Tree Item (New Sidebar)
        const treeItem = element.closest('.tree-content'); // Assuming new sidebar structure
        // Actually drag drop styles for new sidebar might need updates

        return null;
    }
}

window.DragDropManagerClass = DragDropManager;
