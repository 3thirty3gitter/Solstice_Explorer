class SidebarResizer {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.resizer = null;
        this.isResizing = false;

        // Default or saved width
        this.width = parseInt(localStorage.getItem('sidebarWidth')) || 240;

        // Initial set
        if (this.sidebar) {
            this.sidebar.style.width = `${this.width}px`;
            this.sidebar.style.flexShrink = '0'; // Prevent flex shrinking
            this.init();
        }
    }

    init() {
        // Create the handle dynamically
        this.resizer = document.createElement('div');
        this.resizer.className = 'sidebar-resizer';

        // Insert immediately after sidebar
        if (this.sidebar.nextSibling) {
            this.sidebar.parentNode.insertBefore(this.resizer, this.sidebar.nextSibling);
        } else {
            this.sidebar.parentNode.appendChild(this.resizer);
        }

        this.bindEvents();
    }

    bindEvents() {
        this.resizer.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            this.resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // No text selection while dragging
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;

            // Calculate new width
            // e.clientX is X coordinate. Since sidebar is on left, width = clientX.
            // We can clamp it.
            let newWidth = e.clientX;

            if (newWidth < 150) newWidth = 150;
            if (newWidth > 600) newWidth = 600;

            this.width = newWidth;
            this.sidebar.style.width = `${newWidth}px`;
        });

        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                this.resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Save state
                localStorage.setItem('sidebarWidth', this.width);
            }
        });
    }
}

window.SidebarResizerClass = SidebarResizer;
