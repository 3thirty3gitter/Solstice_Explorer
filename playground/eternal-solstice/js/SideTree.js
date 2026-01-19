
// SideTree.js - Greenfield Implementation

class SideTree {
    constructor(containerId, appState) {
        this.containerInfo = containerId;
        this.appState = appState;
        this.expandedPaths = new Set();

        // Load persisted expansion state
        try {
            const saved = localStorage.getItem('sidetree_expanded');
            if (saved) this.expandedPaths = new Set(JSON.parse(saved));
        } catch (e) {
            console.warn('Load state failed', e);
        }
    }

    init() {
        this.root = document.getElementById(this.containerInfo);
        if (!this.root) return;
        this.root.innerHTML = '';

        // 0. Favorites (Custom Quicklinks)
        this.renderFavorites();

        // 1. Quick Access
        this.renderSection('Quick Access', [
            { name: 'Desktop', path: this.appState.specialFolders.desktop, icon: '🖥️' },
            { name: 'Documents', path: this.appState.specialFolders.documents, icon: '📄' },
            { name: 'Downloads', path: this.appState.specialFolders.downloads, icon: '⬇️' },
            { name: 'Pictures', path: this.appState.specialFolders.pictures, icon: '🖼️' },
            { name: 'Music', path: this.appState.specialFolders.music, icon: '🎵' },
            { name: 'Videos', path: this.appState.specialFolders.videos, icon: '🎬' }
        ]);

        // 2. Drives (Async)
        this.renderDrives();
    }

    renderFavorites() {
        const saved = localStorage.getItem('sidetree_favorites');
        const favorites = saved ? JSON.parse(saved) : [];

        // Always render section, even if empty (so user can drop items? or maybe just show header)
        // For now, let's show a default "Add Favorites" if empty or just the header.

        const section = this.createSection('Favorites');
        const container = section.querySelector('.st-section-content');

        if (favorites.length === 0) {
            // Optional: Placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'st-item placeholder';
            placeholder.style.paddingLeft = '12px';
            placeholder.style.color = 'var(--text-secondary)';
            placeholder.style.fontStyle = 'italic';
            placeholder.style.fontSize = '11px';
            placeholder.textContent = 'Right-click to add...';
            // Context menu for placeholder
            placeholder.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, 'favorites-placeholder');
            });
            container.appendChild(placeholder);
        } else {
            favorites.forEach(fav => {
                const item = this.createItemUI({
                    name: fav.name,
                    path: fav.path,
                    isDirectory: true, // Assuming links are folders for now
                    icon: fav.icon || '⭐'
                }, 0);

                // Add "Favorite" context menu handler here later
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.showContextMenu(e, 'favorite-item', fav);
                });

                container.appendChild(item);

                if (this.expandedPaths.has(fav.path)) {
                    this.toggleExpand(fav.path, item);
                }
            });
        }

        this.root.appendChild(section);
    }

    async renderDrives() {
        const driveSection = this.createSection('This PC');
        this.root.appendChild(driveSection);
        const container = driveSection.querySelector('.st-section-content');

        try {
            const drives = await window.electronAPI.getDrives();
            drives.forEach(drive => {
                const item = this.createItemUI({
                    name: drive.label || `Local Disk (${drive.letter})`,
                    path: drive.path,
                    isDirectory: true,
                    icon: '💾'
                }, 0); // Root level = 0
                container.appendChild(item);

                // Auto-expand if saved
                if (this.expandedPaths.has(drive.path)) {
                    this.toggleExpand(drive.path, item);
                }
            });
        } catch (e) {
            console.error('Failed to load drives', e);
        }
    }

    renderSection(title, items) {
        const section = this.createSection(title);
        const container = section.querySelector('.st-section-content');

        items.forEach(def => {
            const fileData = {
                name: def.name,
                path: def.path,
                isDirectory: true,
                icon: def.icon
            };
            const item = this.createItemUI(fileData, 0);
            container.appendChild(item);

            if (this.expandedPaths.has(def.path)) {
                this.toggleExpand(def.path, item);
            }
        });

        this.root.appendChild(section);
    }

    createSection(title) {
        const div = document.createElement('div');
        div.className = 'st-section';
        div.innerHTML = `
            <div class="st-section-header">${title}</div>
            <div class="st-section-content"></div>
        `;
        return div;
    }

    /**
     * Creates the DOM for a single tree item (row + children container)
     */
    createItemUI(fileData, level) {
        const wrapper = document.createElement('div');
        wrapper.className = 'st-node';

        const row = document.createElement('div');
        row.className = 'st-item';
        // Precise indent: 12px base + (20px * level)
        row.style.paddingLeft = `${12 + (level * 20)}px`;
        row.dataset.path = fileData.path;

        if (!fileData.isDirectory) row.classList.add('is-leaf');

        // Arrow
        const arrow = document.createElement('div');
        arrow.className = 'st-arrow';
        arrow.textContent = fileData.isDirectory ? '▶' : '';

        // Icon
        const icon = document.createElement('div');
        icon.className = 'st-icon';
        icon.innerHTML = fileData.icon || (fileData.isDirectory ? '📁' : '📄');

        // Label
        const label = document.createElement('div');
        label.className = 'st-label';
        label.textContent = fileData.name;
        label.title = fileData.name;

        row.appendChild(arrow);
        row.appendChild(icon);
        row.appendChild(label);

        // Children Container
        const children = document.createElement('div');
        children.className = 'st-children';
        // No indent on container itself, the children rows handle it

        wrapper.appendChild(row);
        wrapper.appendChild(children);

        // Events
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target === arrow || fileData.isDirectory) {
                this.toggleExpand(fileData.path, wrapper);
            }
            this.handleSelection(fileData.path);
        });

        return wrapper;
    }

    async toggleExpand(path, wrapperElement) {
        const row = wrapperElement.querySelector('.st-item');
        const childrenContainer = wrapperElement.querySelector('.st-children');
        const arrow = wrapperElement.querySelector('.st-arrow');

        const isExpanded = row.classList.contains('expanded');

        if (isExpanded) {
            // Collapse
            row.classList.remove('expanded');
            childrenContainer.classList.remove('visible');
            childrenContainer.innerHTML = ''; // Clear DOM to save memory? Or keep it?
            // Let's clear it for simplicity and to ensure fresh state on re-open
            this.expandedPaths.delete(path);
        } else {
            // Expand
            row.classList.add('expanded');
            childrenContainer.classList.add('visible');
            this.expandedPaths.add(path);

            if (childrenContainer.children.length === 0) {
                row.classList.add('loading');
                arrow.textContent = '';

                // Determine current level from padding or dataset?
                // Better to pass it down. But checking DOM is okay for now.
                // Or just count parents?
                // Let's rely on data attribute if we added one, or calc from padding
                // Simple hack: (paddingLeft - 12) / 20
                const currentPadding = parseInt(row.style.paddingLeft || '12');
                const currentLevel = Math.round((currentPadding - 12) / 20);

                await this.loadChildren(path, childrenContainer, currentLevel + 1);

                row.classList.remove('loading');
                arrow.textContent = '▶';
            }
        }
        this.saveState();
    }

    async loadChildren(path, container, level) {
        try {
            const items = await window.electronAPI.readDirectory(path);

            // Sort: Folders first
            items.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                return a.isDirectory ? -1 : 1;
            });

            // Filter folders only (Sidebar preference)
            const folders = items.filter(i => i.isDirectory);

            if (folders.length === 0) {
                const empty = document.createElement('div');
                empty.style.paddingLeft = `${12 + (level * 20)}px`;
                empty.style.opacity = '0.5';
                empty.style.fontSize = '11px';
                empty.style.paddingTop = '4px';
                empty.style.paddingBottom = '4px';
                empty.textContent = '(Empty)';
                container.appendChild(empty);
                return;
            }

            for (const item of folders) {
                const node = this.createItemUI(item, level);
                container.appendChild(node);

                if (this.expandedPaths.has(item.path)) {
                    this.toggleExpand(item.path, node);
                }
            }

        } catch (err) {
            console.error('Load Error', err);
        }
    }

    handleSelection(path) {
        // Clear old selection
        const all = this.root.querySelectorAll('.st-item.selected');
        all.forEach(el => el.classList.remove('selected'));

        // Find new
        const target = this.root.querySelector(`.st-item[data-path="${CSS.escape(path)}"]`);
        if (target) target.classList.add('selected');

        if (window.navigateTo) window.navigateTo(path);
    }

    saveState() {
        localStorage.setItem('sidetree_expanded', JSON.stringify([...this.expandedPaths]));
    }

    // --- Context Menu & Favorites Logic ---

    showContextMenu(e, type, data) {
        // Remove existing menu
        const existing = document.querySelector('.st-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.className = 'st-context-menu';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        if (type === 'favorites-header' || type === 'favorites-placeholder') {
            this.addMenuItem(menu, 'Add New Favorite', () => this.openEditFavoritesDialog());
        } else if (type === 'favorite-item') {
            this.addMenuItem(menu, 'Open', () => this.handleSelection(data.path));
            this.addMenuItem(menu, 'Edit Favorite', () => this.openEditFavoritesDialog(data));
            this.addMenuSeparator(menu);
            this.addMenuItem(menu, 'Remove', () => this.removeFavorite(data));
        }

        document.body.appendChild(menu);

        // Close on click elsewhere
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    addMenuItem(menu, label, action) {
        const item = document.createElement('div');
        item.className = 'st-context-item';
        item.textContent = label;
        item.addEventListener('click', action);
        menu.appendChild(item);
    }

    addMenuSeparator(menu) {
        const sep = document.createElement('div');
        sep.className = 'st-context-separator';
        menu.appendChild(sep);
    }

    openEditFavoritesDialog(favToEdit = null) {
        const dialog = document.getElementById('editFavoriteDialog');
        const title = document.getElementById('editFavoriteTitle');
        const nameInput = document.getElementById('favNameInput');
        const pathInput = document.getElementById('favPathInput');
        const iconInput = document.getElementById('favIconInput');
        const browseBtn = document.getElementById('favPathBrowseBtn');
        const saveBtn = document.getElementById('editFavoriteConfirm');
        const closeBtn = document.querySelector('#editFavoriteDialog .dialog-close');
        const cancelBtn = document.querySelector('#editFavoriteDialog .dialog-btn-secondary');

        const iconPreview = document.getElementById('favIconPreview');
        const iconGrid = document.getElementById('favIconGrid');

        // Reset
        title.textContent = favToEdit ? 'Edit Favorite' : 'New Favorite';
        nameInput.value = favToEdit ? favToEdit.name : '';
        pathInput.value = favToEdit ? favToEdit.path : '';
        iconInput.value = favToEdit ? favToEdit.icon : '⭐';
        iconPreview.innerHTML = iconInput.value;

        // Populate Grid (Curated Modern Selection)
        const icons = [
            // Essentials
            '⭐', '🏠', '❤️', '🔥', '📍', '📌', '🏷️', '🔖',
            // Tech & Dev
            '💻', '🖥️', '⌨️', '🖱️', '💾', '💿', '🔌', '🔋',
            '📡', '📶', '🌐', '☁️', '🔒', '🔑', '🛡️', '⚙️',
            '🔧', '🔨', '🛠️', '📱', '📸', '🎥', '🎬', '🎧',
            '🎙️', '🎵', '🎹', '🎮', '🕹️', '👾', '🚀', '🛸',
            '🤖', '🧬', '🔬', '🔭', '🧪', '🩸', '💊', '🩹',
            // Office & Files
            '📂', '📁', '📄', '📃', '📑', '📊', '📈', '📉',
            '📋', '📅', '📆', '📇', '📦', '📫', '📧', '✉️',
            '📝', '✏️', '✒️', '📏', '📎', '💼', '💰', '💳',
            // Objects & Status
            '💡', '🔦', '🕯️', '💣', '💎', '🏺', '🔮', '🧿',
            '🎁', '🎈', '🎉', '🏆', '🏅', '🎯', '🎰', '🎲',
            '🎨', '🎭', '🎪', '🎫', '🕶️', '👓', '👔', '🧢',
            // Nature & Abstract
            '🌲', '🌵', '🍀', '🍁', '🍄', '🌍', '🌊', '🔥',
            '⚡', '🌈', '☀️', '🌙', '🌌', '⚛️', '🕉️', '☮️',
            '☢️', '☣️', '⚠️', '⛔', '🚫', '✅', '✔️', '❌',
            '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'
        ];

        iconGrid.innerHTML = '';
        icons.forEach(icon => {
            const el = document.createElement('div');
            el.className = 'icon-option';
            if (icon === iconInput.value) el.classList.add('selected');
            el.innerHTML = icon;
            el.addEventListener('click', () => {
                iconInput.value = icon;
                iconPreview.innerHTML = icon;
                document.querySelectorAll('.icon-option').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
            });
            iconGrid.appendChild(el);
        });

        // Toggle Grid visibility helper if needed, but it's always visible in layout now.

        dialog.classList.remove('hidden');

        // Save logic
        const onSave = () => {
            const newFav = {
                name: nameInput.value || 'Untitled',
                path: pathInput.value,
                icon: iconInput.value || '⭐'
            };

            this.saveFavorites(newFav, favToEdit); // Pass old object to identify replacement
            dialog.classList.add('hidden');
            cleanup();
        };

        const onCancel = () => {
            dialog.classList.add('hidden');
            cleanup();
        };

        const onBrowse = async () => {
            const path = await window.electronAPI.selectFolder();
            if (path) pathInput.value = path;
        };

        const cleanup = () => {
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onCancel);
            browseBtn.removeEventListener('click', onBrowse);
        };

        saveBtn.addEventListener('click', onSave);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);
        browseBtn.addEventListener('click', onBrowse);
    }

    saveFavorites(newFav, oldFav) {
        const saved = localStorage.getItem('sidetree_favorites');
        let favorites = saved ? JSON.parse(saved) : [];

        if (oldFav) {
            // Edit: Find and replace
            const idx = favorites.findIndex(f => f.path === oldFav.path && f.name === oldFav.name);
            if (idx !== -1) favorites[idx] = newFav;
        } else {
            // Add
            favorites.push(newFav);
        }

        localStorage.setItem('sidetree_favorites', JSON.stringify(favorites));
        // Re-render only favorites section? Or init whole tree? 
        // Init whole tree is safer to allow favorites to re-sort or just call renderFavorites if I clear it first.
        // Let's just clear Favorites section and re-render it.
        // But wait, renderFavorites appends to root. I need a way to replace just that section.
        // For simplicity, reload window or re-init logic.
        // Actually, re-calling init() clears root.
        this.init();
    }

    removeFavorite(fav) {
        if (!confirm(`Remove "${fav.name}" from favorites?`)) return;
        const saved = localStorage.getItem('sidetree_favorites');
        let favorites = saved ? JSON.parse(saved) : [];
        favorites = favorites.filter(f => f.path !== fav.path || f.name !== fav.name);
        localStorage.setItem('sidetree_favorites', JSON.stringify(favorites));
        this.init();
    }

    // --- End Context Menu Logic ---
}

window.SideTree = SideTree; // Keep export at bottom
