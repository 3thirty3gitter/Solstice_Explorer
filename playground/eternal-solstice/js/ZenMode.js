class ZenMode {
    constructor() {
        this.isActive = false;
        this.btn = document.getElementById('zenBtn');

        if (this.btn) {
            this.btn.addEventListener('click', () => this.toggle());
        }
    }

    toggle() {
        this.isActive = !this.isActive;

        if (this.isActive) {
            document.body.classList.add('zen-mode');
            this.showNotification('Entered Zen Mode (Press Esc to exit)');
        } else {
            document.body.classList.remove('zen-mode');
        }
    }

    showNotification(msg) {
        // Reuse app notification or simple toast
        if (window.showNotification) {
            window.showNotification(msg);
        }
    }
}

window.ZenMode = ZenMode;
