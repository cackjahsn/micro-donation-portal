// Utility Functions
class Utils {
    constructor() {
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        this.setupTooltips();
        this.setupFormValidation();
        this.setupBackToTop();
        this.setupPrintButtons();
        
        this.initialized = true;
    }
    
    // Format currency
    formatCurrency(amount, currency = 'RM') {
        return `${currency} ${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    }
    
    // Format date
    formatDate(date, format = 'medium') {
        const d = new Date(date);
        
        const options = {
            short: {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            },
            medium: {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            },
            long: {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }
        };
        
        return d.toLocaleDateString('en-MY', options[format] || options.medium);
    }
    
    // Format number with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Calculate percentage
    calculatePercentage(part, whole) {
        if (whole === 0) return 0;
        return Math.round((part / whole) * 100);
    }
    
    // Generate random ID
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    }
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Setup Bootstrap tooltips
    setupTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Setup form validation
    setupFormValidation() {
        // Add Bootstrap validation styles to custom validation
        const forms = document.querySelectorAll('.needs-validation');
        
        Array.from(forms).forEach(form => {
            form.addEventListener('submit', event => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                form.classList.add('was-validated');
            }, false);
        });
    }
    
    // Setup back to top button
    setupBackToTop() {
        const backToTopBtn = document.getElementById('backToTop');
        if (!backToTopBtn) return;
        
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        });
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Setup print buttons
    setupPrintButtons() {
        document.querySelectorAll('.print-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.print();
            });
        });
    }
    
    // Show notification/toast
    showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notification
        const existing = document.querySelector('.custom-notification');
        if (existing) {
            existing.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification alert alert-${type} alert-dismissible fade show`;
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${this.getNotificationIcon(type)} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Style notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        return notification;
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        return icons[type] || 'fa-info-circle';
    }
    
    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showNotification('Copied to clipboard!', 'success');
                return true;
            } catch (err) {
                this.showNotification('Failed to copy to clipboard', 'error');
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }
    
    // Download file
    downloadFile(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Get URL parameters
    getUrlParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        }
        
        return params;
    }
    
    // Set URL parameter
    setUrlParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }
    
    // Remove URL parameter
    removeUrlParam(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.pushState({}, '', url);
    }
    
    // Check if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // Lazy load images
    setupLazyLoading() {
        const lazyImages = [].slice.call(document.querySelectorAll('img.lazy'));
        
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        lazyImage.src = lazyImage.dataset.src;
                        lazyImage.classList.remove('lazy');
                        lazyImageObserver.unobserve(lazyImage);
                    }
                });
            });
            
            lazyImages.forEach((lazyImage) => {
                lazyImageObserver.observe(lazyImage);
            });
        } else {
            // Fallback for older browsers
            lazyImages.forEach((lazyImage) => {
                lazyImage.src = lazyImage.dataset.src;
                lazyImage.classList.remove('lazy');
            });
        }
    }
    
    // Mobile menu toggle
    setupMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (!menuToggle || !mobileMenu) return;
        
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
            menuToggle.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                mobileMenu.classList.remove('show');
                menuToggle.classList.remove('active');
            }
        });
    }
    
    // Smooth scroll to anchor
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    // Load more functionality
    setupLoadMore(containerId, itemsPerLoad = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const items = container.querySelectorAll('.loadable-item');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        
        if (!loadMoreBtn || items.length <= itemsPerLoad) {
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        
        // Initially hide extra items
        items.forEach((item, index) => {
            if (index >= itemsPerLoad) {
                item.style.display = 'none';
            }
        });
        
        let visibleCount = itemsPerLoad;
        
        loadMoreBtn.addEventListener('click', () => {
            // Show next batch of items
            for (let i = visibleCount; i < visibleCount + itemsPerLoad && i < items.length; i++) {
                items[i].style.display = 'block';
            }
            
            visibleCount += itemsPerLoad;
            
            // Hide button if all items are visible
            if (visibleCount >= items.length) {
                loadMoreBtn.style.display = 'none';
            }
        });
    }
    
    // Form field character counter
    setupCharacterCounters() {
        document.querySelectorAll('[data-maxlength]').forEach(field => {
            const maxLength = parseInt(field.dataset.maxlength);
            const counterId = field.id ? `${field.id}-counter` : `counter-${Math.random().toString(36).substr(2, 9)}`;
            
            // Create counter element
            const counter = document.createElement('div');
            counter.id = counterId;
            counter.className = 'form-text text-end';
            counter.style.fontSize = '0.8rem';
            
            field.parentNode.appendChild(counter);
            
            const updateCounter = () => {
                const currentLength = field.value.length;
                const remaining = maxLength - currentLength;
                
                counter.textContent = `${currentLength}/${maxLength} characters`;
                counter.style.color = remaining < 0 ? '#dc3545' : remaining < 20 ? '#ffc107' : '#6c757d';
            };
            
            field.addEventListener('input', updateCounter);
            updateCounter(); // Initial update
        });
    }
    
    // Password visibility toggle
    setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            const input = toggle.previousElementSibling;
            
            if (!input || input.type !== 'password') return;
            
            toggle.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                toggle.innerHTML = isPassword ? 
                    '<i class="fas fa-eye-slash"></i>' : 
                    '<i class="fas fa-eye"></i>';
            });
        });
    }
    
    // File upload preview
    setupFileUploadPreview() {
        document.querySelectorAll('input[type="file"][data-preview]').forEach(input => {
            const previewId = input.dataset.preview;
            const preview = document.getElementById(previewId);
            
            if (!preview) return;
            
            input.addEventListener('change', function() {
                const file = this.files[0];
                
                if (!file) {
                    preview.style.display = 'none';
                    return;
                }
                
                if (!file.type.match('image.*')) {
                    this.value = '';
                    this.showNotification('Please select an image file', 'error');
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                
                reader.readAsDataURL(file);
            });
        });
    }
}

// Initialize utilities
const utils = new Utils();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    utils.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils };
}