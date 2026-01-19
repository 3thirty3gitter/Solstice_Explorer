class TagSystem {
    constructor(appState) {
        this.appState = appState;
        this.fileTags = {}; // Map of filePath -> [tags]
        this.activeTagFilter = null;

        this.availableTags = [
            { id: 'red', color: '#ff453a', label: 'Important' },
            { id: 'orange', color: '#ff9f0a', label: 'Work' },
            { id: 'yellow', color: '#ffd60a', label: 'Personal' },
            { id: 'green', color: '#32d74b', label: 'Done' },
            { id: 'blue', color: '#0a84ff', label: 'To Do' },
            { id: 'purple', color: '#bf5af2', label: 'Later' },
            { id: 'gray', color: '#8e8e93', label: 'Archive' }
        ];

        // Callbacks
        this.onTagsChanged = null;
    }

    async initialize() {
        await this.loadTags();
    }

    async loadTags() {
        try {
            this.fileTags = await window.electronAPI.getAllTags();
            if (this.onTagsChanged) this.onTagsChanged();
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    }

    getTagsForFile(filePath) {
        return this.fileTags[filePath] || [];
    }

    async addTag(filePath, tagId) {
        try {
            const result = await window.electronAPI.addFileTag(filePath, tagId);
            if (result.success) {
                this.fileTags = result.tags;
                if (this.onTagsChanged) this.onTagsChanged();
                return true;
            }
        } catch (error) {
            console.error('Failed to add tag:', error);
        }
        return false;
    }

    async removeTag(filePath, tagId) {
        try {
            const result = await window.electronAPI.removeFileTag(filePath, tagId);
            if (result.success) {
                this.fileTags = result.tags;
                if (this.onTagsChanged) this.onTagsChanged();
                return true;
            }
        } catch (error) {
            console.error('Failed to remove tag:', error);
        }
        return false;
    }

    getTagInfo(tagId) {
        return this.availableTags.find(t => t.id === tagId);
    }
}

window.TagSystemClass = TagSystem;
