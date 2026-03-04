/**
 * Input Sanitizer - Security utility for sanitizing user input
 * Prevents XSS (Cross-Site Scripting) attacks
 * 
 * Usage:
 *   Sanitizer.escapeHtml(userInput)
 *   Sanitizer.sanitizeEmail(email)
 *   Sanitizer.sanitizeNumber(amount, min, max)
 */

class Sanitizer {
    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string safe for HTML insertion
     */
    static escapeHtml(str) {
        if (typeof str !== 'string') {
            return str;
        }

        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };

        return str.replace(/[&<>"'`=\/]/g, char => htmlEscapes[char]);
    }

    /**
     * Unescape HTML entities
     * @param {string} str - String with HTML entities
     * @returns {string} - Unescaped string
     */
    static unescapeHtml(str) {
        if (typeof str !== 'string') {
            return str;
        }

        const htmlUnescapes = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#x2F;': '/',
            '&#x60;': '`',
            '&#x3D;': '='
        };

        return str.replace(/&(amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g, entity => htmlUnescapes[entity]);
    }

    /**
     * Sanitize email address
     * @param {string} email - Email to sanitize
     * @returns {string} - Sanitized email
     */
    static sanitizeEmail(email) {
        if (typeof email !== 'string') {
            return '';
        }

        // Trim and convert to lowercase
        let sanitized = email.trim().toLowerCase();

        // Remove any characters that aren't valid in emails
        sanitized = sanitized.replace(/[^a-z0-9._%+-@]/g, '');

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
            return '';
        }

        return sanitized;
    }

    /**
     * Sanitize number input
     * @param {number|string} num - Number to sanitize
     * @param {number} min - Minimum allowed value (default: 0)
     * @param {number} max - Maximum allowed value (default: Infinity)
     * @returns {number} - Sanitized number within range
     */
    static sanitizeNumber(num, min = 0, max = Infinity) {
        // Convert to number
        let sanitized = parseFloat(num);

        // Check if valid number
        if (isNaN(sanitized)) {
            return min;
        }

        // Clamp to range
        return Math.min(Math.max(sanitized, min), max);
    }

    /**
     * Sanitize URL
     * @param {string} url - URL to sanitize
     * @returns {string} - Sanitized URL or empty string if invalid
     */
    static sanitizeUrl(url) {
        if (typeof url !== 'string') {
            return '';
        }

        let sanitized = url.trim();

        // Only allow http and https protocols
        try {
            const parsedUrl = new URL(sanitized);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return '';
            }
            return parsedUrl.href;
        } catch (e) {
            // If URL parsing fails, check if it's a relative URL
            if (sanitized.startsWith('/') || sanitized.startsWith('./') || sanitized.startsWith('../')) {
                return sanitized;
            }
            return '';
        }
    }

    /**
     * Sanitize file name (prevent directory traversal)
     * @param {string} filename - File name to sanitize
     * @returns {string} - Sanitized file name
     */
    static sanitizeFilename(filename) {
        if (typeof filename !== 'string') {
            return '';
        }

        // Remove path components
        let sanitized = filename.replace(/[/\\?%*:|"<>]/g, '');

        // Remove leading/trailing dots and spaces
        sanitized = sanitized.replace(/^\.+|\.+$/g, '').trim();

        // Limit length
        return sanitized.substring(0, 255);
    }

    /**
     * Sanitize text input (general purpose)
     * @param {string} text - Text to sanitize
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} - Sanitized text
     */
    static sanitizeText(text, maxLength = 1000) {
        if (typeof text !== 'string') {
            return '';
        }

        // Trim whitespace
        let sanitized = text.trim();

        // Remove control characters (except newlines and tabs)
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Limit length
        return sanitized.substring(0, maxLength);
    }

    /**
     * Sanitize rich text (allow some HTML tags)
     * @param {string} html - HTML to sanitize
     * @param {string[]} allowedTags - Array of allowed tag names
     * @returns {string} - Sanitized HTML
     */
    static sanitizeRichText(html, allowedTags = ['p', 'br', 'strong', 'em', 'u']) {
        if (typeof html !== 'string') {
            return '';
        }

        // Create a temporary DOM element
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove disallowed tags
        const allElements = temp.getElementsByTagName('*');
        for (let i = allElements.length - 1; i >= 0; i--) {
            const tagName = allElements[i].tagName.toLowerCase();
            if (!allowedTags.includes(tagName)) {
                // Replace with text content
                const text = allElements[i].textContent;
                allElements[i].parentNode.replaceChild(
                    document.createTextNode(text),
                    allElements[i]
                );
            }
        }

        // Remove event handlers and javascript: URLs
        const safeElements = temp.querySelectorAll('*');
        safeElements.forEach(el => {
            // Remove all attributes that start with 'on'
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        return temp.innerHTML;
    }

    /**
     * Sanitize form data object
     * @param {Object} formData - Form data to sanitize
     * @param {Object} schema - Schema defining field types
     * @returns {Object} - Sanitized form data
     */
    static sanitizeFormData(formData, schema) {
        const sanitized = {};

        for (const [key, value] of Object.entries(formData)) {
            const fieldSchema = schema[key];

            if (!fieldSchema) {
                // Skip unknown fields
                continue;
            }

            switch (fieldSchema.type) {
                case 'email':
                    sanitized[key] = this.sanitizeEmail(value);
                    break;
                case 'number':
                    sanitized[key] = this.sanitizeNumber(
                        value,
                        fieldSchema.min,
                        fieldSchema.max
                    );
                    break;
                case 'url':
                    sanitized[key] = this.sanitizeUrl(value);
                    break;
                case 'text':
                    sanitized[key] = this.sanitizeText(value, fieldSchema.maxLength || 1000);
                    break;
                case 'html':
                    sanitized[key] = this.sanitizeRichText(value, fieldSchema.allowedTags);
                    break;
                default:
                    sanitized[key] = this.escapeHtml(String(value));
            }
        }

        return sanitized;
    }
}

// Make globally available
window.Sanitizer = Sanitizer;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sanitizer;
}
