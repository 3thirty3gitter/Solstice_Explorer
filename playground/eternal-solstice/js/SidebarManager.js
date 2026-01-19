class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar-root');
        this.container = document.querySelector('.main-content');
        this.resizer = null;

        this.startWidth = 240;
        this.isResizing = false;
        this.width = parseInt(localStorage.getItem('sidebarWidth')) || 240;

        this.initDOM();
        this.bindEvents();

        // Restore width
        if (this.sidebar) {
            this.sidebar.style.width = `${this.width}px`;
        }
    }

    initDOM() {
        if (!this.sidebar) return;

        // Create Resizer
        this.resizer = document.createElement('div');
        this.resizer.className = 'sidebar-resizer';

        // Insert Resizer after sidebar
        if (this.sidebar.nextSibling) {
            this.sidebar.parentNode.insertBefore(this.resizer, this.sidebar.nextSibling);
        } else {
            this.sidebar.parentNode.appendChild(this.resizer);
        }

        // Add class to sidebar just in case
        this.sidebar.classList.add('sidebar');
    }

    bindEvents() {
        if (!this.resizer) return;

        // Resize Events
        this.resizer.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.resize(e));
        document.addEventListener('mouseup', () => this.stopResize());

        // Toggle Button (to be hooked up externally via ID)
        const toggleBtn = document.getElementById('sidebarToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleCollapse());
        }
    }

    startResize(e) {
        this.isResizing = true;
        this.resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // Prevent text selection
    }

    resize(e) {
        if (!this.isResizing) return;

        const newWidth = e.clientX; // Simplified, assumes sidebar is at left 0

        if (newWidth > 150 && newWidth < 600) {
            this.width = newWidth;
            this.sidebar.style.width = `${newWidth}px`;
        }
    }

    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Save preference
            localStorage.setItem('sidebarWidth', this.width);
        }
    }

    toggleCollapse() {
        if (this.sidebar.classList.contains('collapsed')) {
            this.sidebar.classList.remove('collapsed');

            // Restore button icon
            const btn = document.getElementById('sidebarToggleBtn');
            if (btn) btn.classList.remove('collapsed');

            // Restore width logic if needed (handled by CSS removing class)
        } else {
            this.sidebar.classList.add('collapsed');

            // Update button icon
            const btn = document.getElementById('sidebarToggleBtn');
            if (btn) btn.classList.add('collapsed');
        }
    }
}

window.SidebarManagerClass = SidebarManager;
