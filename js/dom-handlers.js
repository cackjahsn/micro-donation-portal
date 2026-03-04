/**
 * DOM Event Handlers - Centralized event listener registration
 * Replaces inline onclick attributes with proper event delegation
 * 
 * Include this script AFTER logger.js and error-handler.js
 */

(function() {
    'use strict';

    const logger = window.logger || console;

    /**
     * Initialize all event handlers when DOM is ready
     */
    document.addEventListener('DOMContentLoaded', function() {
        logger.log('Initializing DOM event handlers...');

        // Initialize reload buttons
        initReloadButtons();

        // Initialize image removal buttons
        initImageRemovalButtons();

        // Initialize form submit handlers
        initFormHandlers();

        // Initialize action buttons
        initActionButtons();

        logger.log('DOM event handlers initialized');
    });

    /**
     * Initialize reload buttons (replaces onclick="window.location.reload()")
     */
    function initReloadButtons() {
        // Find all buttons with data-action="reload"
        const reloadButtons = document.querySelectorAll('[data-action="reload"]');

        reloadButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logger.log('Reload button clicked');
                window.location.reload();
            });
        });

        logger.log(`Initialized ${reloadButtons.length} reload buttons`);
    }

    /**
     * Initialize image removal buttons (admin dashboard)
     */
    function initImageRemovalButtons() {
        const removeButtons = document.querySelectorAll('[data-action="remove-image"]');

        removeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logger.log('Remove image button clicked');

                // Get the target input field
                const targetId = this.getAttribute('data-target');
                const inputField = document.getElementById(targetId);

                if (inputField) {
                    inputField.value = '';

                    // Hide preview if exists
                    const previewContainer = document.getElementById('imagePreviewContainer');
                    if (previewContainer) {
                        previewContainer.style.display = 'none';
                    }

                    logger.log('Image removed');
                }
            });
        });

        logger.log(`Initialized ${removeButtons.length} image removal buttons`);
    }

    /**
     * Initialize form handlers
     */
    function initFormHandlers() {
        // Contact form handler
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', handleContactFormSubmit);
            logger.log('Contact form handler initialized');
        }

        // Password reset form handler
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', handlePasswordResetSubmit);
            logger.log('Password reset form handler initialized');
        }
    }

    /**
     * Handle contact form submission
     */
    async function handleContactFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        logger.log('Contact form submitted');

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        try {
            // In a real app, send to backend
            // For now, simulate success
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (typeof utils !== 'undefined' && utils.showNotification) {
                utils.showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
            }

            form.reset();
        } catch (error) {
            logger.error('Contact form error:', error);

            if (typeof utils !== 'undefined' && utils.showNotification) {
                utils.showNotification('Failed to send message. Please try again.', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    /**
     * Handle password reset submission
     */
    async function handlePasswordResetSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput ? emailInput.value : '';

        logger.log('Password reset requested for:', email);

        if (!email) {
            if (typeof utils !== 'undefined' && utils.showNotification) {
                utils.showNotification('Please enter your email address', 'warning');
            }
            return;
        }

        // In a real app, send API request
        // For now, simulate success
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification(`Password reset link would be sent to: ${email}`, 'info');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(form.closest('.modal'));
        if (modal) {
            modal.hide();
        }

        form.reset();
    }

    /**
     * Initialize action buttons
     */
    function initActionButtons() {
        // Print button handler
        const printButtons = document.querySelectorAll('[data-action="print"]');
        printButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logger.log('Print button clicked');
                window.print();
            });
        });

        // Back button handler
        const backButtons = document.querySelectorAll('[data-action="back"]');
        backButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logger.log('Back button clicked');
                window.history.back();
            });
        });

        // Close button handler
        const closeButtons = document.querySelectorAll('[data-action="close"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logger.log('Close button clicked');

                const modal = bootstrap.Modal.getInstance(button.closest('.modal'));
                if (modal) {
                    modal.hide();
                }
            });
        });

        logger.log(`Initialized action buttons: ${printButtons.length} print, ${backButtons.length} back, ${closeButtons.length} close`);
    }

    /**
     * Helper: Add event listener to dynamically created elements
     * Use event delegation for elements added after DOM load
     */
    function delegateEvent(selector, eventType, callback) {
        document.addEventListener(eventType, function(e) {
            const target = e.target.closest(selector);
            if (target) {
                callback.call(target, e, target);
            }
        });
    }

    // Export functions for external use
    window.DOMHandlers = {
        init: function() {
            // Re-initialize if needed (e.g., after AJAX content load)
            initReloadButtons();
            initImageRemovalButtons();
            initFormHandlers();
            initActionButtons();
        }
    };

})();
