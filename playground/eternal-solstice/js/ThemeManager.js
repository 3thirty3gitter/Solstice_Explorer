class ThemeManager {
    constructor() {
        this.themes = {
            default: {
                name: 'Eternal Solstice',
                colors: {
                    '--app-bg': 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
                    '--glass-bg': 'rgba(20, 20, 30, 0.7)',
                    '--glass-border': 'rgba(255, 255, 255, 0.1)',
                    '--glass-hover': 'rgba(255, 255, 255, 0.05)',
                    '--glass-active': 'rgba(255, 255, 255, 0.1)',
                    '--accent-primary': 'hsl(240, 100%, 65%)',
                    '--accent-secondary': 'hsl(280, 100%, 70%)',
                    '--text-primary': 'rgba(255, 255, 255, 0.95)',
                    '--text-secondary': 'rgba(255, 255, 255, 0.7)'
                }
            },
            frost: {
                name: 'Arctic Frost',
                colors: {
                    '--app-bg': 'linear-gradient(135deg, #e0eafc, #89f7fe)',
                    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
                    '--glass-border': 'rgba(255, 255, 255, 0.4)',
                    '--glass-hover': 'rgba(0, 0, 0, 0.05)',
                    '--glass-active': 'rgba(0, 0, 0, 0.1)',
                    '--accent-primary': '#005bea',
                    '--accent-secondary': '#00c6fb',
                    '--text-primary': '#1a1a2e',
                    '--text-secondary': '#4a4a5e'
                }
            },
            oled: {
                name: 'Midnight Void',
                colors: {
                    '--app-bg': '#000000',
                    '--glass-bg': 'rgba(10, 10, 10, 0.8)',
                    '--glass-border': 'rgba(50, 50, 50, 0.5)',
                    '--glass-hover': 'rgba(255, 255, 255, 0.1)',
                    '--glass-active': 'rgba(255, 255, 255, 0.2)',
                    '--accent-primary': '#ffffff',
                    '--accent-secondary': '#888888',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#aaaaaa'
                }
            },
            cyberpunk: {
                name: 'Neon City',
                colors: {
                    '--app-bg': 'linear-gradient(135deg, #11001c, #0d001a, #29002e)',
                    '--glass-bg': 'rgba(20, 0, 30, 0.8)',
                    '--glass-border': 'rgba(255, 0, 255, 0.2)',
                    '--glass-hover': 'rgba(255, 0, 255, 0.1)',
                    '--glass-active': 'rgba(255, 0, 255, 0.2)',
                    '--accent-primary': '#ff00cc',
                    '--accent-secondary': '#3333ff',
                    '--text-primary': '#fff0ff',
                    '--text-secondary': '#ffccff'
                }
            },
            forest: {
                name: 'Deep Forest',
                colors: {
                    '--app-bg': 'linear-gradient(135deg, #134e5e, #71b280)',
                    '--glass-bg': 'rgba(10, 30, 20, 0.7)',
                    '--glass-border': 'rgba(150, 255, 180, 0.1)',
                    '--glass-hover': 'rgba(255, 255, 255, 0.1)',
                    '--glass-active': 'rgba(255, 255, 255, 0.2)',
                    '--accent-primary': '#43cea2',
                    '--accent-secondary': '#185a9d',
                    '--text-primary': '#f0fff4',
                    '--text-secondary': '#cceedd'
                }
            }
        };

        this.currentTheme = localStorage.getItem('theme') || 'default';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createSettingsUI();
    }

    applyTheme(themeId) {
        const theme = this.themes[themeId];
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Also update standard accent-gradient which is derived
        const p = theme.colors['--accent-primary'];
        const s = theme.colors['--accent-secondary'];
        // We re-set this manually to ensure it picks up the new var values if they were purely hex
        root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${p}, ${s})`);

        this.currentTheme = themeId;
        localStorage.setItem('theme', themeId);

        // Update Grid Selection Color if needed (usually handled by accent-primary)
        this.updateUISelection();
    }

    updateUISelection() {
        // Update active theme in UI if open
        const container = document.getElementById('themeGrid');
        if (container) {
            Array.from(container.children).forEach(btn => {
                if (btn.dataset.theme === this.currentTheme) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }
    }

    createSettingsUI() {
        // We'll inject the modal if it doesn't exist
        if (!document.getElementById('settingsModal')) {
            const modal = document.createElement('div');
            modal.id = 'settingsModal';
            modal.className = 'modal-overlay hidden';

            modal.innerHTML = `
                <div class="modal-content settings-modal" style="width: 500px; max-width: 90vw;">
                    <div class="modal-header">
                        <h2>Settings</h2>
                        <button class="close-modal" id="closeSettingsBtn">×</button>
                    </div>
                    <div class="modal-body">
                        <section class="settings-section">
                            <h3>Theme</h3>
                            <div class="theme-grid" id="themeGrid">
                                ${this.generateThemeButtons()}
                            </div>
                        </section>
                        <!-- Future sections: Fonts, Terminal, etc. -->
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Events
            modal.querySelector('#closeSettingsBtn').addEventListener('click', () => this.hideSettings());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideSettings();
            });

            // Bind Theme Buttons
            this.bindThemeButtons();
        }
    }

    generateThemeButtons() {
        return Object.entries(this.themes).map(([id, theme]) => `
            <div class="theme-option ${id === this.currentTheme ? 'active' : ''}" data-theme="${id}">
                <div class="theme-preview" style="background: ${theme.colors['--app-bg']}">
                    <div class="theme-glass-preview" style="background: ${theme.colors['--glass-bg']}; border-color: ${theme.colors['--accent-primary']}"></div>
                </div>
                <span>${theme.name}</span>
            </div>
        `).join('');
    }

    bindThemeButtons() {
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyTheme(btn.dataset.theme);
            });
        });
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Re-render buttons active state
            this.updateUISelection();
        }
    }

    hideSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('hidden');
    }
}

window.ThemeManagerClass = ThemeManager;
