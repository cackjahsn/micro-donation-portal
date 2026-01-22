// Enhanced Utils.js with localStorage management and all previous features
class Utils {
    constructor() {
        this.initialized = false;
        this.storagePrefix = 'micro_donation_'; // Consistent storage prefix
    }
    
    init() {
        if (this.initialized) return;
        
        this.setupTooltips();
        this.setupFormValidation();
        this.setupBackToTop();
        this.setupPrintButtons();
        this.setupMobileMenu();
        this.setupSmoothScroll();
        this.setupLazyLoading();
        this.setupCharacterCounters();
        this.setupPasswordToggles();
        this.setupFileUploadPreview();
        this.setupAPIDebugging();
        
        this.initialized = true;
    }
    
    // ==================== STORAGE MANAGEMENT ====================
    
    // Update ONLY the getStorage method in utils.js:
    getStorage(key, returnRaw = false) {
        // Try new key first
        const newKey = `${this.storagePrefix}${key}`;
        let value = localStorage.getItem(newKey);
        
        // If not found, try legacy keys
        if (value === null) {
            const legacyKeys = {
                'user': 'communitygive_user',
                'token': 'communitygive_token',
                'campaigns': 'temp_campaigns'
            };
            
            if (legacyKeys[key]) {
                value = localStorage.getItem(legacyKeys[key]);
                if (value !== null) {
                    // Migrate to new key system
                    localStorage.setItem(newKey, value);
                    localStorage.removeItem(legacyKeys[key]);
                    console.log(`Migrated ${legacyKeys[key]} to new key system`);
                }
            }
        }
        
        // If not found at all
        if (value === null) {
            return returnRaw ? null : null;
        }
        
        // SPECIAL HANDLING FOR TOKENS - they are strings, not JSON
        if (key === 'token') {
            return value; // Return token as plain string
        }
        
        // For other keys, try to parse as JSON
        try {
            // Check if it's JSON by looking for object/array start
            const trimmed = value.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                return JSON.parse(value);
            }
            // If not JSON, return as-is
            return value;
        } catch (e) {
            console.warn(`Could not parse storage key "${key}" as JSON. Returning raw value.`, e);
            return value; // Return raw value
        }
    }
    
    // Set item in localStorage
    setStorage(key, value) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(`${this.storagePrefix}${key}`, stringValue);
    }
    
    // Remove item from localStorage
    removeStorage(key) {
        localStorage.removeItem(`${this.storagePrefix}${key}`);
        
        // Also remove legacy keys
        const legacyKeys = {
            'user': 'communitygive_user',
            'token': 'communitygive_token',
            'campaigns': 'temp_campaigns'
        };
        
        if (legacyKeys[key]) {
            localStorage.removeItem(legacyKeys[key]);
        }
    }
    
    // Clear all app storage
    clearAllStorage() {
        const keysToRemove = [];
        
        // Remove all prefixed keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.storagePrefix)) {
                keysToRemove.push(key);
            }
        }
        
        // Also remove legacy keys
        const legacyKeys = ['communitygive_user', 'communitygive_token', 'temp_campaigns'];
        
        keysToRemove.concat(legacyKeys).forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('Cleared all app storage');
    }
    
    // Get storage statistics
    getStorageStats() {
        const stats = {
            total: 0,
            prefixed: 0,
            legacy: 0,
            size: 0
        };
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            stats.total++;
            stats.size += (key.length + value.length) * 2; // Approximate size in bytes
            
            if (key.startsWith(this.storagePrefix)) {
                stats.prefixed++;
            } else if (key.includes('communitygive') || key.includes('temp_')) {
                stats.legacy++;
            }
        }
        
        return stats;
    }
    
    // ==================== AUTH UTILITIES ====================
    
    // Check if user is authenticated
    isAuthenticated() {
        const user = this.getStorage('user');
        const token = this.getStorage('token');
        return !!(user && token);
    }
    
    // Check if user is admin
    isAdmin() {
        const user = this.getStorage('user');
        return user && user.role === 'admin';
    }
    
    // Get current user
    getCurrentUser() {
        return this.getStorage('user');
    }
    
    // Get auth token
    getAuthToken() {
        return this.getStorage('token');
    }
    
    // Update user profile
    updateUserProfile(updates) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        const updatedUser = { ...user, ...updates };
        this.setStorage('user', updatedUser);
        
        // Dispatch event for other parts of the app
        window.dispatchEvent(new CustomEvent('userUpdated', { 
            detail: { user: updatedUser } 
        }));
        
        return true;
    }
    
    // ==================== FORMATTING UTILITIES ====================
    
    // Format currency
    formatCurrency(amount, currency = 'RM', decimals = 2) {
        const formatter = new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        
        return formatter.format(parseFloat(amount) || 0).replace('MYR', currency);
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
            },
            time: {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            },
            datetime: {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        };
        
        return d.toLocaleDateString('en-MY', options[format] || options.medium);
    }
    
    // Format relative time (e.g., "2 hours ago")
    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 7) {
            return this.formatDate(date, 'short');
        } else if (diffDay > 0) {
            return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        } else if (diffHour > 0) {
            return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else if (diffMin > 0) {
            return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }
    
    // Format number with commas
    formatNumber(num, decimals = 0) {
        const number = parseFloat(num) || 0;
        return number.toLocaleString('en-MY', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    
    // Calculate percentage
    calculatePercentage(part, whole) {
        if (whole === 0) return 0;
        const percentage = (part / whole) * 100;
        return Math.round(percentage * 100) / 100; // 2 decimal places
    }
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // ==================== STRING UTILITIES ====================
    
    // Truncate text
    truncateText(text, maxLength = 100, suffix = '...') {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }
    
    // Capitalize first letter
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    
    // Generate slug from text
    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    }
    
    // Generate random ID
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    }
    
    // ==================== VALIDATION UTILITIES ====================
    
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Validate phone number (Malaysian format)
    isValidPhone(phone) {
        const phoneRegex = /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }
    
    // Validate password strength
    checkPasswordStrength(password) {
        let strength = 0;
        const feedback = [];
        
        // Length check
        if (password.length >= 8) strength++;
        else feedback.push('At least 8 characters');
        
        // Lowercase check
        if (/[a-z]/.test(password)) strength++;
        else feedback.push('Lowercase letters');
        
        // Uppercase check
        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('Uppercase letters');
        
        // Number check
        if (/[0-9]/.test(password)) strength++;
        else feedback.push('Numbers');
        
        // Special character check
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        else feedback.push('Special characters');
        
        return {
            score: strength,
            maxScore: 5,
            feedback: feedback,
            strength: strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong',
            isValid: strength >= 3
        };
    }
    
    // ==================== PERFORMANCE UTILITIES ====================
    
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
    
    // ==================== DOM UTILITIES ====================
    
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
    
    // Scroll to element
    scrollToElement(elementId, offset = 100) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    // Toggle element visibility
    toggleElement(elementId, show = null) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (show === null) {
            element.style.display = element.style.display === 'none' ? '' : 'none';
        } else {
            element.style.display = show ? '' : 'none';
        }
    }
    
    // Add/remove CSS class with animation
    animateClass(element, className, duration = 300) {
        if (!element) return;
        
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }
    
    // ==================== NOTIFICATION SYSTEM ====================
    
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
        
        // Add animation styles if not present
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .notification-exit {
                    animation: slideOutRight 0.3s ease-out forwards;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to document
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('notification-exit');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
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
    
    // ==================== FILE UTILITIES ====================
    
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
    
    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // Read file as data URL
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // ==================== URL UTILITIES ====================
    
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
    
    // Get current page name
    getCurrentPage() {
        return window.location.pathname.split('/').pop().replace('.html', '');
    }
    
    // ==================== SETUP FUNCTIONS ====================
    
    // Setup Bootstrap tooltips
    setupTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Setup form validation
    setupFormValidation() {
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
        
        window.addEventListener('scroll', this.throttle(() => {
            if (window.pageYOffset > 300) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        }, 100));
        
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
                
                // Add/remove invalid class
                if (remaining < 0) {
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-invalid');
                }
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
    
    // ==================== API UTILITIES ====================
    
    // Make API request with authentication
    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
            defaultOptions.headers.Authorization = `Bearer ${token}`;
        }
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, mergedOptions);
            
            // Handle HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
            }
            
            // Try to parse JSON response
            try {
                return await response.json();
            } catch (jsonError) {
                return { success: false, message: 'Invalid JSON response' };
            }
            
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    // Handle API errors
    handleApiError(error, fallbackMessage = 'An error occurred') {
        const message = error.message || fallbackMessage;
        this.showNotification(message, 'error');
        
        // Auto logout on 401 Unauthorized
        if (error.message.includes('401')) {
            this.removeStorage('user');
            this.removeStorage('token');
            window.location.href = 'index.html';
        }
        
        return { success: false, message };
    }

        // Add to utils.js
    setupAPIDebugging() {
        // Log all fetch requests
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            console.log('Fetch request:', args[0], args[1]);
            return originalFetch.apply(this, args)
                .then(response => {
                    console.log('Fetch response:', args[0], response.status);
                    return response;
                })
                .catch(error => {
                    console.error('Fetch error:', args[0], error);
                    throw error;
                });
        };
    }

        getApiUrl(endpoint) {
        // Check if we have a global API base URL
        if (window.API_BASE_URL) {
            return `${window.API_BASE_URL}${endpoint}`;
        }
        
        const currentPath = window.location.pathname;
        
        // If path contains micro-donation-portal, use it as base
        if (currentPath.includes('/micro-donation-portal/')) {
            // Extract the base path up to /micro-donation-portal/
            const baseMatch = currentPath.match(/(.*\/micro-donation-portal\/)/);
            if (baseMatch && baseMatch[1]) {
                return `${baseMatch[1]}backend/api/${endpoint}`;
            }
        }
        
        // Fallback for local development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return `/micro-donation-portal/backend/api/${endpoint}`;
        }
        
        // Default relative path
        return `backend/api/${endpoint}`;
    }

        // Also add this utility method:
    async testApi(endpoint) {
        const url = this.getApiUrl(endpoint);
        console.log(`Testing API: ${url}`);
        
        try {
            const response = await fetch(url);
            console.log(`API ${endpoint} status: ${response.status}`);
            return response;
        } catch (error) {
            console.error(`API ${endpoint} error:`, error);
            throw error;
        }
    }
}

// Initialize utilities globally
const utils = new Utils();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    utils.init();
    
    // Make utils available globally
    window.utils = utils;
    
    console.log('Utils initialized with storage management');
    console.log('Storage stats:', utils.getStorageStats());
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils, utils };
}