
// FileTree.js - Professional Grade Tree System

class FileTree {
    constructor(containerId, appState) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        this.appState = appState;
        this.nodes = new Map();
        this.expandedPaths = new Set();
        this.selectedPath = null;
        this.onNavigate = null;

        this.loadState();
    }

    async render(rootPath, rootName = 'Root') {
        this.container.innerHTML = '';
        this.container.classList.add('file-tree-container');
        this.container.tabIndex = 0;
        this.container.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    /* Slot Pattern: Mount to detached container */
    async mountToContainer(rootPath, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.dataset.path = rootPath;

        if (this.expandedPaths.has(rootPath)) {
            container.style.display = 'block';
            const group = container.closest('.nav-group');
            if (group) group.classList.add('expanded');

            if (container.children.length === 0) {
                // Start with -1 so first items are Level 0
                this.loadChildren(rootPath, container, -1);
            }
        }
    }

    bindSidebarEvents() {
        const groups = document.querySelectorAll('.nav-group');
        groups.forEach(group => {
            const header = group.querySelector('.nav-header');
            const container = group.querySelector('.nav-tree-container');
            if (!header || !container) return;

            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);

            newHeader.addEventListener('click', (e) => {
                e.stopPropagation();
                const realPath = container.dataset.path || group.dataset.path;
                const isExpanded = group.classList.contains('expanded');

                if (isExpanded) {
                    group.classList.remove('expanded');
                    container.style.display = 'none';
                    if (realPath) this.expandedPaths.delete(realPath);
                } else {
                    group.classList.add('expanded');
                    container.style.display = 'block';
                    if (realPath) {
                        this.expandedPaths.add(realPath);
                        if (container.children.length === 0) {
                            container.classList.add('loading');
                            // Start with -1 so first items are Level 0
                            this.loadChildren(realPath, container, -1)
                                .finally(() => container.classList.remove('loading'));
                        }
                    }
                }
                this.saveState();
            });
        });
    }

    createNodeUI(fileData, level) {
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.dataset.path = fileData.path;
        node.dataset.level = level;

        // Indentation: Level 0 = 0px + 8px padding. Level 1 = 20px...
        const paddingLeft = Math.max(0, level) * 20 + 8;

        const content = document.createElement('div');
        content.className = 'tree-content';
        content.style.paddingLeft = `${paddingLeft}px`;
        if (this.selectedPath === fileData.path) content.classList.add('selected');

        const toggle = document.createElement('div');
        toggle.className = 'tree-toggle';
        if (!fileData.isDirectory) toggle.classList.add('is-leaf');

        const isExpanded = this.expandedPaths.has(fileData.path);
        toggle.innerHTML = '▶';
        if (isExpanded) toggle.classList.add('is-expanded');

        const icon = document.createElement('div');
        icon.className = 'tree-icon';
        icon.textContent = fileData.customIcon || (fileData.isDirectory ? '📁' : '📄');

        const label = document.createElement('div');
        label.className = 'tree-label';
        label.textContent = fileData.name;
        label.title = fileData.name;

        content.appendChild(toggle);
        content.appendChild(icon);
        content.appendChild(label);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';

        if (this.expandedPaths.has(fileData.path)) {
            childrenContainer.classList.add('visible');
            childrenContainer.style.display = 'block';
            setTimeout(() => {
                if (childrenContainer.children.length === 0) {
                    // Pass CURRENT level logic is handled in expandNode
                    this.loadChildren(fileData.path, childrenContainer, level);
                }
            }, 0);
        } else {
            childrenContainer.style.display = 'none';
        }

        node.appendChild(content);
        node.appendChild(childrenContainer);

        content.addEventListener('click', (e) => {
            e.stopPropagation();
            const isToggleClick = e.target.classList.contains('tree-toggle');
            if (isToggleClick || fileData.isDirectory) {
                if (childrenContainer.classList.contains('visible') || childrenContainer.style.display === 'block') {
                    this.collapseNode(fileData.path, toggle, childrenContainer);
                } else {
                    this.expandNode(fileData.path, toggle, childrenContainer, level);
                }
            } else {
                this.selectNode(fileData.path);
                if (this.onNavigate) this.onNavigate(fileData.path);
            }
        });

        content.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (fileData.isDirectory) {
                if (this.expandedPaths.has(fileData.path)) {
                    this.collapseNode(fileData.path, toggle, childrenContainer);
                } else {
                    this.expandNode(fileData.path, toggle, childrenContainer, level);
                }
            }
        });

        return node;
    }

    selectNode(path) {
        if (this.selectedPath) {
            const oldNodes = document.querySelectorAll(`.tree-node[data-path="${CSS.escape(this.selectedPath)}"] > .tree-content`);
            oldNodes.forEach(n => n.classList.remove('selected'));
        }
        this.selectedPath = path;
        const newNodes = document.querySelectorAll(`.tree-node[data-path="${CSS.escape(path)}"] > .tree-content`);
        newNodes.forEach(n => n.classList.add('selected'));
    }

    async expandNode(path, toggle, container, level) {
        // Fallback level calculation
        if (typeof level === 'undefined' || level === null) {
            const parentNode = container.parentElement;
            if (parentNode && parentNode.dataset.level) {
                level = parseInt(parentNode.dataset.level);
            } else {
                level = 0;
            }
        }

        this.expandedPaths.add(path);
        this.saveState();

        toggle.classList.add('is-expanded');
        container.classList.add('visible');
        container.style.display = 'block';

        if (container.children.length === 0) {
            toggle.classList.add('loading');
            // FIX: Pass the CURRENT level. loadChildren handles the increment (nextLevel = level + 1).
            await this.loadChildren(path, container, level);
            toggle.classList.remove('loading');
        }
    }

    collapseNode(path, toggle, container) {
        this.expandedPaths.delete(path);
        this.saveState();
        toggle.classList.remove('is-expanded');
        container.classList.remove('visible');
        container.style.display = 'none';
    }

    async loadChildren(path, container, level) {
        try {
            const items = await window.electronAPI.readDirectory(path);

            // Sort: Folders first
            items.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory ? -1 : 1;
            });

            container.innerHTML = '';

            // Calculate Next Level from the provided Parent Level
            const nextLevel = (typeof level === 'number' && !isNaN(level)) ? level + 1 : 0;

            // Only show folders
            const children = items.filter(i => i.isDirectory);

            if (children.length === 0) {
                container.innerHTML = `<div style="padding-left: ${nextLevel * 20 + 20}px; opacity: 0.5; font-size: 11px; font-style: italic; color: #888; padding: 4px 0;">(0 Folders)</div>`;
            }

            for (const item of children) {
                const node = this.createNodeUI({
                    name: item.name,
                    path: item.path,
                    isDirectory: true
                }, nextLevel);
                container.appendChild(node);
            }

        } catch (err) {
            console.error("[FileTree] Tree Error", err);
            container.innerHTML = `<div style="color:red; padding-left: 20px">Error loading</div>`;
        }
    }

    saveState() {
        localStorage.setItem('treeExpanded', JSON.stringify([...this.expandedPaths]));
    }

    loadState() {
        try {
            const saved = localStorage.getItem('treeExpanded');
            if (saved) {
                this.expandedPaths = new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load tree state', e);
        }
    }

    handleKeyboard(e) { }
}

window.FileTreeSystem = FileTree;
