/**
 * Logger Utility - Environment-aware logging system
 * 
 * Usage:
 *   logger.log('Message')     // Only in development
 *   logger.error('Error')     // Always shown
 *   logger.warn('Warning')    // Always shown
 *   logger.info('Info')       // Only in development
 */

class Logger {
    constructor() {
        // Check if we're in development mode
        this.isDevelopment = window.APP_ENV === 'development' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        
        // Prefix for all log messages
        this.prefix = '[CommunityGive]';
        
        // Store recent logs for debugging
        this.history = [];
        this.maxHistory = 100;
    }

    /**
     * Log message (development only)
     */
    log(...args) {
        if (this.isDevelopment) {
            const message = this._formatMessage(args);
            console.log(`${this.prefix}`, ...message);
            this._addToHistory('log', message);
        }
    }

    /**
     * Error message (always shown)
     */
    error(...args) {
        const message = this._formatMessage(args);
        console.error(`${this.prefix}`, ...message);
        this._addToHistory('error', message);
        
        // Auto-report errors to server (optional)
        if (this.isDevelopment === false) {
            this._reportError(message);
        }
    }

    /**
     * Warning message (always shown)
     */
    warn(...args) {
        const message = this._formatMessage(args);
        console.warn(`${this.prefix}`, ...message);
        this._addToHistory('warn', message);
    }

    /**
     * Info message (development only)
     */
    info(...args) {
        if (this.isDevelopment) {
            const message = this._formatMessage(args);
            console.info(`${this.prefix}`, ...message);
            this._addToHistory('info', message);
        }
    }

    /**
     * Debug message with object inspection (development only)
     */
    debug(label, data) {
        if (this.isDevelopment) {
            console.log(`${this.prefix} [DEBUG] ${label}:`, data);
        }
    }

    /**
     * Group related logs (development only)
     */
    group(label, callback) {
        if (this.isDevelopment) {
            console.group(`${this.prefix} ${label}`);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Performance timing (development only)
     */
    time(label) {
        if (this.isDevelopment) {
            console.time(`${this.prefix} ${label}`);
        }
    }

    /**
     * Performance time end (development only)
     */
    timeEnd(label) {
        if (this.isDevelopment) {
            console.timeEnd(`${this.prefix} ${label}`);
        }
    }

    /**
     * Get log history
     */
    getHistory() {
        return this.history;
    }

    /**
     * Clear log history
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Format message arguments
     */
    _formatMessage(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return '[Object]';
                }
            }
            return arg;
        });
    }

    /**
     * Add message to history
     */
    _addToHistory(type, message) {
        this.history.push({
            type,
            message,
            timestamp: new Date().toISOString()
        });

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Report error to server (for production)
     */
    _reportError(message) {
        // Send error to server for logging
        const errorData = {
            message: Array.isArray(message) ? message.join(' ') : message,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        // Fire and forget - don't wait for response
        navigator.sendBeacon?.('/backend/api/log-error.php', JSON.stringify(errorData));
    }
}

// Create global logger instance
window.logger = new Logger();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
