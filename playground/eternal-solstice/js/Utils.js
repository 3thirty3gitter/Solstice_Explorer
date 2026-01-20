/**
 * Shared utility functions for Eternal Solstice
 */

window.utils = {
    /**
     * Escapes special characters in HTML to prevent XSS.
     * @param {string} str - The string to escape.
     * @returns {string} - The escaped string.
     */
    escapeHTML: function (str) {
        if (!str) return "";
        return str.toString().replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }
};

// Global shorthand
window.escapeHTML = window.utils.escapeHTML;
