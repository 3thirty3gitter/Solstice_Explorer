class DualPaneManager {
    constructor() {
        this.isActive = false;
        this.activePane = 'left'; // 'left' or 'right'

        // Panes
        this.leftPane = document.getElementById('pane-left');
        this.rightPane = document.getElementById('pane-right');

        // Grids
        this.leftGrid = document.getElementById('fileGrid');
        this.rightGrid = document.getElementById('fileGrid-right');

        // State for each pane
        this.states = {
            left: {
                path: null,
                history: [],
                historyIndex: 0
            },
            right: {
                path: null,
                history: [],
                historyIndex: 0
            }
        };

        this.bindEvents();
    }

    bindEvents() {
        // Click to activate pane
        this.leftPane.addEventListener('mousedown', () => this.setActivePane('left'));
        this.rightPane.addEventListener('mousedown', () => this.setActivePane('right'));

        // Toggle Button
        document.getElementById('dualPaneBtn').addEventListener('click', () => this.toggle());
    }

    toggle() {
        this.isActive = !this.isActive;
        const btn = document.getElementById('dualPaneBtn');

        if (this.isActive) {
            this.rightPane.classList.remove('hidden');
            btn.classList.add('active');

            // Initialize right pane with same path if empty, or default
            if (!this.states.right.path) {
                // Copy current path from app state safely
                const currentPath = (window.state && window.state.currentPath) ? window.state.currentPath : 'C:\\';
                this.loadPathInPane('right', currentPath);
            }
        } else {
            this.rightPane.classList.add('hidden');
            btn.classList.remove('active');
            this.setActivePane('left'); // Force left back to active
        }
    }

    setActivePane(paneId) {
        this.activePane = paneId;

        // UI Update
        if (paneId === 'left') {
            this.leftPane.classList.add('active-pane');
            this.leftPane.classList.remove('inactive-pane');
            this.rightPane.classList.remove('active-pane');
            if (this.isActive) this.rightPane.classList.add('inactive-pane');
        } else {
            this.rightPane.classList.add('active-pane');
            this.rightPane.classList.remove('inactive-pane');
            this.leftPane.classList.remove('active-pane');
            this.leftPane.classList.add('inactive-pane');
        }

        // Sync Global State to this pane's path
        // This is tricky: The main app relies on global `state.currentPath`.
        // We need to swap the global state when we click a pane so the address bar updates.
        this.syncGlobalState();
    }

    syncGlobalState() {
        const paneState = this.states[this.activePane];
        if (paneState.path) {
            // Update address bar without reloading files (since they are already there)
            // Or trigger a "silent" navigation update?
            // Actually, we should let the main app know we switched context.
            window.updateAddressBar(paneState.path); // Function from app.js
            window.state.currentPath = paneState.path;

            // Update history buttons?
            // app.js history is global. We might need per-pane history soon.
        }
    }

    async loadPathInPane(pane, path) {
        this.states[pane].path = path;

        // We need a way to render files into a specific target container
        // currently app.js `loadFiles` renders to `fileGrid` by default.
        // We should refactor `renderFiles` to accept a target container.

        const targetGrid = pane === 'left' ? this.leftGrid : this.rightGrid;

        // Fetch files
        try {
            const result = await window.electronAPI.readDirectory(path);
            if (result.success) {
                // We can reuse window.renderFiles if we modify it, 
                // OR we just duplicate logic for now (safer for "God Mode" prototype).
                // Let's call a modified Global renderer if possible, or do it manually.

                // For now, let's piggyback on the main render but we need to intercept it? 
                // No, better to expose a `renderToContainer` method in app.js.

                // Actually, let's create a Helper here to render.
                this.renderFilesToGrid(result.files, targetGrid);
            }
        } catch (e) {
            console.error('DualPane load failed:', e);
        }
    }

    // Mini-renderer for the second pane (or both)
    renderFilesToGrid(files, container) {
        container.innerHTML = '';
        files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item';
            // ... (Need to copy icon logic or make it shared) ...
            div.textContent = file.name;
            container.appendChild(div);
        });
        // Note: This is a "Lite" render. The main view has drag/drop, context menu, etc.
        // To make God Mode truly powerful, we need `FileView.js` component that instances per pane.
    }
}

// Expose updateAddressBar manually
window.updateAddressBar = (path) => {
    const input = document.getElementById('addressBarInput');
    if (input) input.value = path;
    updateBreadcrumb(path);
};

window.DualPaneManagerClass = DualPaneManager;
