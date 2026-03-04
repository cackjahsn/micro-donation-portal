/**
 * Global Error Handler
 * Catches unhandled errors and promise rejections
 * 
 * Include this script EARLY in your HTML (before other scripts)
 */

(function() {
    'use strict';

    // Initialize logger if available, otherwise use console
    const logger = window.logger || console;

    /**
     * Global error handler for synchronous errors
     */
    window.onerror = function(message, source, lineno, colno, error) {
        // Log error
        logger.error('Global Error:', {
            message: message,
            source: source,
            line: lineno,
            column: colno,
            stack: error?.stack
        });

        // Don't show error for script load errors (handled separately)
        if (message === 'Script error.' || message.includes('script')) {
            return false;
        }

        // Show user-friendly message
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification(
                'An unexpected error occurred. Please refresh the page.',
                'error'
            );
        } else {
            // Fallback if utils not loaded
            console.error('Unhandled error:', message);
        }

        // Log to server (if not in development)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            logErrorToServer({
                type: 'sync_error',
                message: message,
                source: source,
                line: lineno,
                column: colno,
                stack: error?.stack,
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        }

        // Return true to prevent default browser error
        return true;
    };

    /**
     * Global handler for unhandled promise rejections
     */
    window.onunhandledrejection = function(event) {
        logger.error('Unhandled Promise Rejection:', event.reason);

        // Show user-friendly message
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification(
                'An operation failed. Please try again.',
                'error'
            );
        }

        // Log to server
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            logErrorToServer({
                type: 'promise_rejection',
                reason: event.reason?.message || event.reason,
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        }

        // Prevent default console output
        event.preventDefault();
    };

    /**
     * Log error to server
     */
    function logErrorToServer(errorData) {
        // Add timestamp
        errorData.timestamp = new Date().toISOString();

        // Use sendBeacon for reliable delivery (doesn't block page unload)
        if (navigator.sendBeacon) {
            try {
                const blob = new Blob([JSON.stringify(errorData)], { type: 'application/json' });
                navigator.sendBeacon('/backend/api/log-error.php', blob);
            } catch (e) {
                // Fallback to fetch
                fetch('/backend/api/log-error.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(errorData),
                    keepalive: true
                }).catch(err => {
                    console.error('Failed to log error to server:', err);
                });
            }
        }
    }

    /**
     * Handle script load errors
     */
    document.addEventListener('error', function(event) {
        if (event.target.tagName === 'SCRIPT') {
            logger.error('Script failed to load:', event.target.src);
            
            // Show notification for critical script failures
            if (typeof utils !== 'undefined' && utils.showNotification) {
                const scriptName = event.target.src.split('/').pop();
                utils.showNotification(
                    `Failed to load: ${scriptName}. Please refresh the page.`,
                    'error'
                );
            }
        }
    }, true); // Use capture phase to catch script errors

    /**
     * Handle uncaught exceptions in async functions
     */
    window.addEventListener('unhandledrejection', function(event) {
        // Already handled by onunhandledrejection
    });

    // Log initialization
    logger.info('Global error handler initialized');

})();
