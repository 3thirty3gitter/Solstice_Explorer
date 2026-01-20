class TabManager {
    constructor(appState) {
        this.tabs = [];
        this.activeTabId = null;
        this.tabCounter = 0;
        this.container = document.getElementById('tabs-container');
        this.viewContainer = document.getElementById('explorer-views');
        this.appState = appState;

        // This callback should be set by app.js to handle the actual file loading
        this.onTabSwitched = null;
    }

    createTab(path = null) {
        const id = `tab-${this.tabCounter++}`;

        // Default path if none provided
        if (!path) {
            path = this.appState.specialFolders?.documents || 'C:\\';
        }

        const tab = {
            id: id,
            path: path,
            history: [path],
            historyIndex: 0,
            scrollTop: 0,
            viewMode: 'grid',
            name: this.getNameFromPath(path)
        };

        this.tabs.push(tab);

        // Create UI
        this.renderTabUI(tab);

        // Activate it
        this.switchTab(id);

        return tab;
    }

    closeTab(id) {
        if (this.tabs.length <= 1) return; // Don't close last tab

        const index = this.tabs.findIndex(t => t.id === id);
        if (index === -1) return;

        // Remove from data
        const wasActive = this.activeTabId === id;
        this.tabs.splice(index, 1);

        // Remove from UI
        const tabEl = this.container.querySelector(`[data-tab-id="${id}"]`);
        if (tabEl) tabEl.remove();

        // Switch to neighbor if active
        if (wasActive) {
            const newIndex = Math.max(0, index - 1);
            this.switchTab(this.tabs[newIndex].id);
        }
    }

    switchTab(id) {
        if (this.activeTabId) {
            // Save state of current tab
            const currentTab = this.getTab(this.activeTabId);
            if (currentTab) {
                // Save scroll position
                const fileGrid = document.getElementById('fileGrid');
                if (fileGrid) currentTab.scrollTop = fileGrid.scrollTop;
            }

            // UI Update
            const oldTabEl = this.container.querySelector(`[data-tab-id="${this.activeTabId}"]`);
            if (oldTabEl) oldTabEl.classList.remove('active');
        }

        this.activeTabId = id;
        const newTab = this.getTab(id);

        // UI Update
        const newTabEl = this.container.querySelector(`[data-tab-id="${id}"]`);
        if (newTabEl) newTabEl.classList.add('active');

        // Notify App to Render
        if (this.onTabSwitched) {
            this.onTabSwitched(newTab);
        }
    }

    updateCurrentTab(path) {
        const tab = this.getTab(this.activeTabId);
        if (!tab) return;

        tab.path = path;
        tab.name = this.getNameFromPath(path);

        // Update Tab UI Title
        const tabEl = this.container.querySelector(`[data-tab-id="${tab.id}"]`);
        if (tabEl) {
            const titleEl = tabEl.querySelector('.tab-title');
            if (titleEl) titleEl.textContent = tab.name;
            titleEl.title = path;
        }

        // History Management
        // If we are at the end of history, push new state.
        // If we navigated back then went somewhere else, truncate future.
        if (tab.historyIndex < tab.history.length - 1) {
            tab.history = tab.history.slice(0, tab.historyIndex + 1);
        }
        // Only push if different
        if (tab.history[tab.history.length - 1] !== path) {
            tab.history.push(path);
            tab.historyIndex = tab.history.length - 1;
        }
    }

    getTab(id) {
        return this.tabs.find(t => t.id === id);
    }

    getActiveTab() {
        return this.getTab(this.activeTabId);
    }

    getNameFromPath(path) {
        if (!path) return 'New Tab';
        if (path.endsWith(':') || path.endsWith(':\\')) return path.substring(0, 2); // Drive letter
        return path.split('\\').pop() || path;
    }

    renderTabUI(tab) {
        const el = document.createElement('div');
        el.className = 'chrome-tab';
        el.dataset.tabId = tab.id;
        el.innerHTML = `
            <span class="tab-icon">📁</span>
            <span class="tab-title">${escapeHTML(tab.name)}</span>
            <span class="tab-close">×</span>
        `;

        el.addEventListener('click', () => this.switchTab(tab.id));
        el.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab.id);
        });

        this.container.insertBefore(el, document.getElementById('new-tab-btn'));
    }
}

window.TabManagerClass = TabManager;
