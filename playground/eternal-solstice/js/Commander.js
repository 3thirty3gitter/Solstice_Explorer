class Commander {
    constructor() {
        this.isVisible = false;
        this.selectedIndex = 0;
        this.commands = this.getCommands();
        this.filteredCommands = [];

        this.createDOM();
        this.bindEvents();
    }

    getCommands() {
        return [
            { id: 'home', title: 'Go Home', icon: '🏠', desc: 'Navigate to user home directory', action: () => window.navigateTo(window.state.specialFolders.home) },
            { id: 'docs', title: 'Go to Documents', icon: '📄', desc: 'Navigate to Documents', action: () => window.navigateTo(window.state.specialFolders.documents) },
            { id: 'downloads', title: 'Go to Downloads', icon: '⬇️', desc: 'Navigate to Downloads', action: () => window.navigateTo(window.state.specialFolders.downloads) },
            { id: 'zen', title: 'Toggle Zen Mode', icon: '🧘', desc: 'Toggle distraction-free Zen Mode', action: () => window.zenMode.toggle() },
            { id: 'settings', title: 'Open Settings', icon: '⚙️', desc: 'Configure themes and preferences', action: () => window.themeManager.showSettings() },
            { id: 'dualpane', title: 'Toggle Split View', icon: '🌗', desc: 'Enable or disable dual pane mode', action: () => window.dualPaneManager.toggle() },
            { id: 'newfolder', title: 'New Folder', icon: '📁', desc: 'Create a new folder in current directory', action: () => window.showNewFolderDialog() },
            { id: 'refresh', title: 'Refresh', icon: '🔄', desc: 'Reload current directory', action: () => window.refresh() },
            { id: 'hidden', title: 'Toggle Hidden Files', icon: '👁️', desc: 'Show or hide hidden files', shortcut: 'Ctrl+H', action: () => this.toggleHiddenFiles() },
            { id: 'sort_name', title: 'Sort by Name', icon: '🔤', desc: 'Sort files alphabetically', action: () => this.changeSort('name') },
            { id: 'sort_date', title: 'Sort by Date', icon: '📅', desc: 'Sort files by modification date', action: () => this.changeSort('date') },
            { id: 'view_grid', title: 'Grid View', icon: '⏹️', desc: 'Switch to grid layout', action: () => this.changeView('grid') },
            { id: 'view_list', title: 'List View', icon: 'list', desc: 'Switch to list/details layout', action: () => this.changeView('details') },
            { id: 'github', title: 'Open GitHub', icon: '🐙', desc: 'Open GitHub in browser', action: () => window.electronAPI.openExternal('https://github.com') }
        ];
    }

    createDOM() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'commander-overlay';
        this.overlay.id = 'commanderOverlay';

        this.overlay.innerHTML = `
            <div class="commander-box">
                <div class="commander-input-wrapper">
                    <span class="commander-icon">⚡</span>
                    <input type="text" id="commanderInput" placeholder="Type a command..." autocomplete="off">
                </div>
                <div class="commander-results" id="commanderResults">
                    <!-- Results injected here -->
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.input = this.overlay.querySelector('#commanderInput');
        this.resultsContainer = this.overlay.querySelector('#commanderResults');
    }

    bindEvents() {
        // Toggle Shortcut (Ctrl+P or Ctrl+Shift+P)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.toggle();
            }

            if (this.isVisible) {
                if (e.key === 'Escape') this.close();
                if (e.key === 'ArrowDown') this.moveSelection(1);
                if (e.key === 'ArrowUp') this.moveSelection(-1);
                if (e.key === 'Enter') this.executeSelected();
            }
        });

        // Input handling
        this.input.addEventListener('input', () => this.filterCommands());

        // Close on click outside
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    toggle() {
        if (this.isVisible) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isVisible = true;
        this.overlay.classList.add('visible');
        this.input.value = '';
        this.input.focus();
        this.filterCommands(); // Show all initially
    }

    close() {
        this.isVisible = false;
        this.overlay.classList.remove('visible');
    }

    filterCommands() {
        const query = this.input.value.toLowerCase();

        if (!query) {
            this.filteredCommands = this.commands;
        } else {
            this.filteredCommands = this.commands.filter(cmd =>
                cmd.title.toLowerCase().includes(query) ||
                cmd.desc.toLowerCase().includes(query)
            );
        }

        this.selectedIndex = 0;
        this.renderResults();
    }

    renderResults() {
        this.resultsContainer.innerHTML = '';

        if (this.filteredCommands.length === 0) {
            this.resultsContainer.innerHTML = `<div style="padding:20px; text-align:center; opacity:0.5;">No commands found</div>`;
            return;
        }

        this.filteredCommands.forEach((cmd, index) => {
            const el = document.createElement('div');
            el.className = `cmd-item ${index === this.selectedIndex ? 'selected' : ''}`;
            el.innerHTML = `
                <span class="cmd-icon">${escapeHTML(cmd.icon)}</span>
                <div class="cmd-content">
                    <span class="cmd-title">${escapeHTML(cmd.title)}</span>
                    <span class="cmd-desc">${escapeHTML(cmd.desc)}</span>
                </div>
                ${cmd.shortcut ? `<span class="cmd-shortcut">${escapeHTML(cmd.shortcut)}</span>` : ''}
            `;

            el.addEventListener('click', () => {
                this.selectedIndex = index;
                this.executeSelected();
            });

            this.resultsContainer.appendChild(el);
        });

        this.ensureSelectionVisible();
    }

    moveSelection(direction) {
        this.selectedIndex += direction;

        if (this.selectedIndex < 0) this.selectedIndex = 0;
        if (this.selectedIndex >= this.filteredCommands.length) this.selectedIndex = this.filteredCommands.length - 1;

        this.renderResults();
    }

    ensureSelectionVisible() {
        // Simple scrolling logic if needed
        const selectedEl = this.resultsContainer.children[this.selectedIndex];
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest' });
        }
    }

    executeSelected() {
        const cmd = this.filteredCommands[this.selectedIndex];
        if (cmd) {
            this.close();
            cmd.action();
        }
    }

    // --- Command Actions ---

    toggleHiddenFiles() {
        // Assume filtered is a global state logic we can piggyback or implement later
        // For now, let's just alert strictly to show it works
        console.log('Toggle hidden files');
        // TODO: Implement actual filter toggle
        window.state.filterType = window.state.filterType === 'all' ? 'no-hidden' : 'all';
        // Need to re-fetch or re-filter
        window.refresh();
    }

    changeSort(type) {
        document.getElementById('sortBy').value = type;
        // Trigger change event manually or call sort function
        const event = new Event('change');
        document.getElementById('sortBy').dispatchEvent(event);
    }

    changeView(mode) {
        window.switchView(mode); // Assuming exposed from app.js, we might need to expose it
    }
}

window.CommanderClass = Commander;
