class QuickLook {
    constructor() {
        this.isVisible = false;
        this.activeItem = null;
        this.createDOM();
        this.bindEvents();
    }

    createDOM() {
        // Main Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'quick-look-overlay';
        this.overlay.id = 'quickLookOverlay';

        // Window
        this.window = document.createElement('div');
        this.window.className = 'quick-look-window';

        // Header
        const header = document.createElement('div');
        header.className = 'ql-header';

        const titleGroup = document.createElement('div');
        titleGroup.className = 'ql-title';
        this.titleIcon = document.createElement('span');
        this.titleIcon.className = 'ql-title-icon';
        this.titleText = document.createElement('span');
        titleGroup.appendChild(this.titleIcon);
        titleGroup.appendChild(this.titleText);

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.alignItems = 'center';

        this.metaText = document.createElement('span');
        this.metaText.className = 'ql-meta';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ql-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.close();

        controls.appendChild(this.metaText);
        controls.appendChild(closeBtn);

        header.appendChild(titleGroup);
        header.appendChild(controls);

        // Content
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'ql-content';

        // Footer
        this.footer = document.createElement('div');
        this.footer.className = 'ql-footer';
        this.footerText = document.createElement('span');
        this.footer.appendChild(this.footerText);

        // Assemble
        this.window.appendChild(header);
        this.window.appendChild(this.contentArea);
        this.window.appendChild(this.footer);
        this.overlay.appendChild(this.window);

        document.body.appendChild(this.overlay);
    }

    bindEvents() {
        // Close on overlay click (outside window)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Global Key Handler for Spacebar
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input field or dialog
            if (e.target.matches('input, textarea') || e.target.closest('.dialog-overlay:not(.hidden)')) {
                return;
            }

            // Toggle on Space
            if (e.code === 'Space') {
                if (this.isVisible) {
                    e.preventDefault();
                    this.close();
                } else {
                    // Only open if we have a selection and no dialogs are open
                    const selection = window.state?.currentItem;
                    if (selection && !document.querySelector('.dialog-overlay:not(.hidden)')) {
                        e.preventDefault();
                        this.open(selection);
                    }
                }
            }

            // Close on Escape
            if (e.code === 'Escape' && this.isVisible) {
                e.preventDefault();
                this.close();
            }
        });
    }

    async open(item) {
        if (!item) return;
        this.activeItem = item;
        this.isVisible = true;
        this.overlay.classList.add('visible');

        // Update Header
        this.titleText.textContent = item.name;
        this.titleIcon.textContent = this.getFileIcon(item.name); // Simple helper

        let sizeText = '';
        if (item.size) {
            sizeText = this.formatSize(item.size);
        }
        this.metaText.textContent = sizeText;
        this.footerText.textContent = `${item.path}`;

        // Load Content
        this.contentArea.innerHTML = '<div class="spinner"></div>'; // Re-use spinner class

        try {
            await this.renderContent(item);
        } catch (e) {
            this.contentArea.innerHTML = `<div class="ql-error"><span>⚠️ Unable to preview</span><span style="font-size:11px">${e.message}</span></div>`;
        }
    }

    close() {
        this.isVisible = false;
        this.overlay.classList.remove('visible');
        // Clear content to stop videos/audio
        setTimeout(() => {
            if (!this.isVisible) this.contentArea.innerHTML = '';
        }, 250); // Wait for fade out
    }

    async renderContent(item) {
        if (item.isDirectory) {
            // Should render folder stats or list?
            this.contentArea.innerHTML = `
                <div style="text-align:center; color: #aaa;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📂</div>
                    <div>Folder Preview Not Supported Yet</div>
                    <div style="font-size: 12px; margin-top: 10px; opacity: 0.6;">${item.path}</div>
                </div>
            `;
            return;
        }

        const ext = item.name.split('.').pop().toLowerCase();
        const type = this.getFileType(ext);

        if (type === 'image') {
            const img = document.createElement('img');
            img.className = 'ql-image';
            img.src = `file:///${item.path.replace(/\\/g, '/')}`;
            this.contentArea.innerHTML = '';
            this.contentArea.appendChild(img);
        }
        else if (type === 'video') {
            const vid = document.createElement('video');
            vid.className = 'ql-video';
            vid.controls = true;
            vid.autoplay = true;
            vid.src = `file:///${item.path.replace(/\\/g, '/')}`;
            this.contentArea.innerHTML = '';
            this.contentArea.appendChild(vid);
        }
        else if (type === 'audio') {
            const wrapper = document.createElement('div');
            wrapper.className = 'ql-audio-container';

            const icon = document.createElement('div');
            icon.className = 'ql-audio-icon';
            icon.textContent = '🎵';

            const audio = document.createElement('audio');
            audio.controls = true;
            audio.autoplay = true;
            audio.src = `file:///${item.path.replace(/\\/g, '/')}`;

            wrapper.appendChild(icon);
            wrapper.appendChild(audio);

            this.contentArea.innerHTML = '';
            this.contentArea.appendChild(wrapper);
        }
        else if (type === 'code' || type === 'text') {
            const res = await window.electronAPI.readFileContent(item.path);
            if (res.success) {
                const pre = document.createElement('textarea'); // Using textarea for simple read-only view
                pre.className = 'ql-text';
                pre.readOnly = true;
                pre.value = res.content;
                this.contentArea.innerHTML = '';
                this.contentArea.appendChild(pre);
            } else {
                throw new Error(res.error);
            }
        }
        else {
            this.contentArea.innerHTML = `
                <div style="text-align:center; color: #aaa;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
                    <div>Preview not available</div>
                    <div style="font-size: 12px; margin-top: 10px; opacity: 0.6;">.${ext} files</div>
                </div>
            `;
        }
    }

    getFileType(ext) {
        const map = {
            'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'webp': 'image', 'svg': 'image', 'bmp': 'image',
            'mp4': 'video', 'webm': 'video', 'mkv': 'video', 'avi': 'video', 'mov': 'video',
            'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio',
            'txt': 'text', 'md': 'text', 'json': 'code', 'js': 'code', 'css': 'code', 'html': 'code', 'xml': 'code', 'py': 'code', 'ts': 'code'
        };
        return map[ext] || 'unknown';
    }

    getFileIcon(filename) {
        // Reuse similar logic from SideTree or App.js?
        // Basic map
        if (!filename) return '📄';
        if (filename.includes('.')) {
            const ext = filename.split('.').pop().toLowerCase();
            const map = {
                'pdf': '📕',
                'doc': '📘', 'docx': '📘',
                'xls': '📗', 'xlsx': '📗',
                'ppt': '📙', 'pptx': '📙',
                'zip': '📦', 'rar': '📦', '7z': '📦',
                'exe': '💿',
                'txt': '📄', 'md': '📝',
                'js': '📜', 'html': '🌐', 'css': '🎨',
                'mp3': '🎵', 'wav': '🎵',
                'mp4': '🎬', 'mkv': '🎬',
                'jpg': '🖼️', 'png': '🖼️', 'gif': '🖼️'
            };
            return map[ext] || '📄';
        }
        return '📁';
    }

    formatSize(bytes) {
        if (!bytes) return '';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
}

window.QuickLook = QuickLook;
