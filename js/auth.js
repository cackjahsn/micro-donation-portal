// auth.js - Updated with Backend API Integration (FIXED REGISTRATION)

// Use API_BASE_URL from path-resolver.js if available, otherwise use fallback
const API_BASE_URL = window.API_BASE_URL || '/micro-donation-portal/backend/api';

// Also set it globally so other scripts can access it
window.API_BASE_URL = API_BASE_URL;

// Get logger instance (created by logger.js)
const logger = window.logger || console;

class AuthManager {
    constructor() {
        logger.log('AuthManager constructor called - Page:', window.location.pathname);
        logger.log('API Base URL set to:', window.API_BASE_URL);
        
        this.currentUser = null;
        this.tokenKey = 'micro_donation_token';
        this.userKey = 'micro_donation_user';
        AuthManager.cleanupStorage();
        
        // Initialize utils if available
        if (typeof utils !== 'undefined') {
            this.utils = utils;
        } else {
            // Fallback to localStorage
            console.warn('Utils not available, using localStorage directly');
            this.utils = {
                getStorage: (key) => {
                    const value = localStorage.getItem(`micro_donation_${key}`);
                    if (!value) {
                        // Try legacy key
                        const legacyKey = key === 'user' ? 'communitygive_user' : 
                                        key === 'token' ? 'communitygive_token' : 
                                        `micro_donation_${key}`;
                        const legacyValue = localStorage.getItem(legacyKey);
                        if (legacyValue && (key === 'user' || key === 'token')) {
                            // Migrate to new key
                            localStorage.setItem(`micro_donation_${key}`, legacyValue);
                            localStorage.removeItem(legacyKey);
                            return legacyValue;
                        }
                    }
                    try {
                        return value ? JSON.parse(value) : null;
                    } catch {
                        return value;
                    }
                },
                setStorage: (key, value) => {
                    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                    localStorage.setItem(`micro_donation_${key}`, stringValue);
                },
                removeStorage: (key) => {
                    localStorage.removeItem(`micro_donation_${key}`);
                    localStorage.removeItem(`communitygive_${key}`);
                }
            };
        }
        
        this.init();
    }

        // Add this method to your AuthManager class in auth.js
    static cleanupStorage() {
        // Remove conflicting user keys
        if (localStorage.getItem('user') && localStorage.getItem('micro_donation_user')) {
            console.warn('Removing conflicting user data from localStorage');
            localStorage.removeItem('user');
        }
        
        // Remove other potential conflicts
        if (localStorage.getItem('token') && localStorage.getItem('auth_token')) {
            // Keep auth_token, remove token if they're different
            const authToken = localStorage.getItem('auth_token');
            const legacyToken = localStorage.getItem('token');
            if (authToken !== legacyToken) {
                localStorage.removeItem('token');
            }
        }
    }
    
    init() {
        console.log('AuthManager init called');
        
        // Check for saved user session using utils
        const savedToken = this.utils.getStorage('token');
        const savedUser = this.utils.getStorage('user');
        
        console.log('Storage check:', {
            token: savedToken ? 'Exists' : 'Missing',
            user: savedUser ? 'Exists' : 'Missing'
        });
        
        if (savedToken && savedUser) {
            try {
                this.currentUser = savedUser;
                console.log('User restored from storage:', this.currentUser);
                this.setupAuthHeader(savedToken);
            } catch (error) {
                console.error('Error parsing saved user:', error);
                this.clearSession();
            }
        } else {
            console.log('No saved session found');
        }
        
        this.setupEventListeners();
        // Update UI immediately on init
        this.updateUI();
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners');

        // Login button click (opens modal)
        document.addEventListener('click', (e) => {
            // Check if login button was clicked
            if (e.target.id === 'loginBtn' || e.target.closest('#loginBtn')) {
                e.preventDefault();
                console.log('Login button clicked, showing modal');
                this.showLoginModal();
            }
            
            // Check if register button was clicked
            if (e.target.id === 'registerBtn' || e.target.closest('#registerBtn')) {
                e.preventDefault();
                console.log('Register button clicked, showing modal');
                this.showRegisterModal();
            }
        });

        // Setup modal hidden event listeners
        setTimeout(() => {
            const loginModal = document.getElementById('loginModal');
            const registerModal = document.getElementById('registerModal');
            
            if (loginModal) {
                loginModal.addEventListener('hidden.bs.modal', () => {
                    console.log('Login modal hidden - cleaning up');
                    this.cleanupModalBackdrop();
                });
            }
            
            if (registerModal) {
                registerModal.addEventListener('hidden.bs.modal', () => {
                    console.log('Register modal hidden - cleaning up');
                    this.cleanupModalBackdrop();
                });
            }
        }, 100);

        // Add emergency escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                console.log('Escape pressed - emergency modal cleanup');
                this.emergencyModalCleanup();
            }
        });
        
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('Login form found, adding listener');
            
            // Remove any existing listeners to prevent duplicates
            const newForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newForm, loginForm);
            
            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Login form submitted');
                
                // Get form values
                const emailInput = newForm.querySelector('input[type="email"], #loginEmail, input[name="email"]');
                const passwordInput = newForm.querySelector('input[type="password"], #loginPassword, input[name="password"]');
                
                if (!emailInput || !passwordInput) {
                    this.showNotification('Please fill in all fields', 'error');
                    return;
                }
                
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                
                if (!email || !password) {
                    this.showNotification('Please enter both email and password', 'error');
                    return;
                }
                
                console.log('Calling handleLogin with:', email);
                await this.handleLogin(email, password);
            });
        }
        
        // Registration form submission
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            console.log('Registration form found, adding listener');
            
            const newRegisterForm = registerForm.cloneNode(true);
            registerForm.parentNode.replaceChild(newRegisterForm, registerForm);
            
            newRegisterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Registration form submitted');
                
                // Get form values
                const nameInput = newRegisterForm.querySelector('#name, input[name="name"]');
                const emailInput = newRegisterForm.querySelector('#email, input[name="email"]');
                const passwordInput = newRegisterForm.querySelector('#password, input[name="password"]');
                const confirmPasswordInput = newRegisterForm.querySelector('#confirmPassword, input[name="confirmPassword"]');
                
                if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
                    this.showNotification('Please fill in all required fields', 'error');
                    return;
                }
                
                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                
                if (!name || !email || !password || !confirmPassword) {
                    this.showNotification('Please fill in all required fields', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    this.showNotification('Passwords do not match', 'error');
                    return;
                }
                
                if (!this.isValidEmail(email)) {
                    this.showNotification('Please enter a valid email address', 'error');
                    return;
                }
                
                const userData = {
                    name: name,
                    email: email,
                    password: password
                };
                
                console.log('Calling handleRegister with:', userData.email);
                await this.handleRegister(userData);
            });
        }
        
        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.logout-btn') || e.target.id === 'logoutBtn') {
                console.log('Logout button clicked');
                this.handleLogout(e);
            }
        });
    }

    showLoginModal() {
        console.log('showLoginModal called');
        const loginModal = document.getElementById('loginModal');
        
        if (!loginModal) {
            console.error('Login modal element not found!');
            return;
        }
        
        // Check if Bootstrap is available
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap not loaded!');
            return;
        }
        
        try {
            // Cleanup any existing modal first
            this.cleanupModalBackdrop();
            
            const modal = new bootstrap.Modal(loginModal);
            modal.show();
            console.log('Login modal shown successfully');
        } catch (error) {
            console.error('Error showing login modal:', error);
            this.emergencyModalCleanup();
        }
    }

    showRegisterModal() {
        console.log('showRegisterModal called');
        const registerModal = document.getElementById('registerModal');
        
        if (!registerModal) {
            console.error('Register modal element not found!');
            return;
        }
        
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap not loaded!');
            return;
        }
        
        try {
            // Cleanup any existing modal first
            this.cleanupModalBackdrop();
            
            const modal = new bootstrap.Modal(registerModal);
            modal.show();
            console.log('Register modal shown successfully');
        } catch (error) {
            console.error('Error showing register modal:', error);
            this.emergencyModalCleanup();
        }
    }

    cleanupModalBackdrop() {
        console.log('Cleaning up modal backdrop');
        
        // Remove modal backdrop if exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
            console.log('Removed modal backdrop');
        }
        
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        
        // Reset body style
        document.body.style = '';
        
        // Remove padding-right that Bootstrap adds
        document.body.style.paddingRight = '';
    }

    emergencyModalCleanup() {
        console.log('Emergency modal cleanup!');
        
        // Force remove all modal-related elements
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
        
        // Remove all backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Fix body
        document.body.classList.remove('modal-open');
        document.body.style = '';
        document.body.style.paddingRight = '';
        
        console.log('Emergency cleanup completed');
    }
    
    async handleLogin(email, password) {
        console.log('=== LOGIN START ===');
        console.log('Email:', email);
        console.log('API URL:', `${API_BASE_URL}/auth/login.php`);
        
        // Find login button
        let loginBtn = document.querySelector('#loginForm button[type="submit"]');
        if (!loginBtn) {
            loginBtn = document.querySelector('button[type="submit"]');
        }
        
        const originalText = loginBtn ? loginBtn.innerHTML : 'Login';
        
        // Safety timeout
        const restoreTimeout = setTimeout(() => {
            console.warn('Login timeout - forcing button restoration');
            if (loginBtn && loginBtn.disabled) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalText;
                this.showNotification('Login timeout. Please try again.', 'error');
            }
        }, 15000);
        
        try {
            // Disable button and show loading
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            }
            
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();
            
            if (!trimmedEmail || !trimmedPassword) {
                throw new Error('Email and password are required');
            }
            
            // Prepare login data
            const loginData = {
                email: trimmedEmail,
                password: trimmedPassword
            };
            
            console.log('Sending login request to:', `${API_BASE_URL}/auth/login.php`);
            
            // Add timeout
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 10000);
            
            // Make API call
            const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
                signal: controller.signal
            });
            
            clearTimeout(fetchTimeout);
            
            // Get raw response
            const responseText = await response.text();
            console.log('Raw login response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                throw new Error('Invalid server response');
            }
            
            if (data.success && data.user && data.token) {
                console.log('Login successful for user:', data.user.name);
                
                // Set session
                this.setSession(data.user, data.token);
                
                clearTimeout(restoreTimeout);
                this.showNotification('Login successful!', 'success');
                
                // Close modal if exists
                const loginModal = document.getElementById('loginModal');
                if (loginModal && typeof bootstrap !== 'undefined') {
                    const modal = bootstrap.Modal.getInstance(loginModal);
                    if (modal) modal.hide();
                }
                
                // Redirect based on role
                setTimeout(() => {
                    const rootPath = typeof window.getRootPath === 'function' ? window.getRootPath() : '';
                    if (data.user.role === 'admin') {
                        window.location.href = rootPath + 'admin-dashboard.html';
                    } else {
                        // Force page reload to update navigation
                        window.location.href = rootPath + 'index.html';
                    }
                }, 1000);
                
                return true;
            } else {
                throw new Error(data.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error details:', error);
            
            let errorMessage = error.message;
            if (error.name === 'AbortError') {
                errorMessage = 'Request timeout. Server not responding.';
            }
            
            this.showNotification(errorMessage, 'error');
            return false;
            
        } finally {
            // ALWAYS restore button state
            console.log('Finally block executing - restoring button...');
            clearTimeout(restoreTimeout);
            
            if (loginBtn && loginBtn.parentNode) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalText;
            }
        }
    }
    
    
    async handleRegister(userData) {
        console.log('Registration attempt for:', userData.email);
        console.log('API URL:', `${API_BASE_URL}/auth/register.php`);
        
        // Find register button
        let registerBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalText = registerBtn ? registerBtn.innerHTML : 'Register';
        
        try {
            // Disable button and show loading
            if (registerBtn) {
                registerBtn.disabled = true;
                registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
            }
            
            console.log('Sending registration request to:', `${API_BASE_URL}/auth/register.php`);
            
            const response = await fetch(`${API_BASE_URL}/auth/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            console.log('Registration response status:', response.status);
            
            const responseText = await response.text();
            console.log('Raw registration response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                throw new Error('Invalid server response format');
            }
            
            console.log('Registration parsed response:', data);
            
            if (data.success) {
                this.showNotification('Registration successful!', 'success');
                
                // Auto-login after successful registration
                console.log('Attempting auto-login after registration...');
                const loginResult = await this.handleLogin(userData.email, userData.password);
                
                if (loginResult) {
                    return { success: true, user: this.currentUser };
                } else {
                    console.warn('Auto-login failed, redirecting to login page');
                    this.showNotification('Registration successful! Please login.', 'success');
                    const rootPath = typeof window.getRootPath === 'function' ? window.getRootPath() : '';
                    setTimeout(() => {
                        window.location.href = rootPath + 'index.html';
                    }, 2000);
                }
            } else {
                throw new Error(data.message || 'Registration failed');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = error.message;
            if (error.message.includes('404')) {
                errorMessage = 'Registration service unavailable. Please try again later.';
            } else if (error.message.includes('409')) {
                errorMessage = 'Email already registered. Please use a different email or login.';
            }
            
            this.showNotification(errorMessage, 'error');
            return { 
                success: false, 
                message: errorMessage 
            };
            
        } finally {
            // Restore button state
            if (registerBtn) {
                setTimeout(() => {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = originalText;
                }, 1000);
            }
        }
    }
    
    async handleLogout(event) {
        if (event) event.preventDefault();

        console.log('Logout initiated');

        try {
            await fetch(`${API_BASE_URL}/auth/logout.php`);
        } catch (error) {
            console.log('Logout API call failed, continuing with client-side logout');
        }

        this.clearSession();
        this.showNotification('Logged out successfully', 'success');

        // Redirect to home page (use resolvePath if available, otherwise determine path)
        setTimeout(() => {
            // Check if we're in a subdirectory
            const currentPath = window.location.pathname;
            if (currentPath.includes('/pages/')) {
                // We're in /pages/ directory, go up one level
                window.location.href = '../index.html';
            } else if (typeof window.resolvePath === 'function') {
                // Use path-resolver if available
                window.location.href = window.resolvePath('index.html');
            } else {
                // Default to root-relative path
                const basePath = window.APP_BASE_PATH || '/micro-donation-portal/';
                const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
                window.location.href = base + '/index.html';
            }
        }, 1000);
    }
    
    setSession(user, token) {
        console.log('Setting session for user:', user);
        
        this.currentUser = user;
        
        // Save to storage using utils
        this.utils.setStorage('user', user);
        this.utils.setStorage('token', token);
        
        console.log('Saved to storage. Token:', token ? 'Yes' : 'No', 'User:', user ? 'Yes' : 'No');
        
        // Setup auth header for API calls
        this.setupAuthHeader(token);
        
        // Also store token in sessionStorage for quick access
        if (token) {
            sessionStorage.setItem('auth_token', token);
        }
        
        // Update UI
        this.updateUI();
        
        // Dispatch custom event for other scripts
        window.dispatchEvent(new CustomEvent('authchange', { 
            detail: { user: user, authenticated: true } 
        }));
    }
    
    clearSession() {
        console.log('Clearing session');
        
        this.currentUser = null;
        
        // Remove from storage using utils
        this.utils.removeStorage('user');
        this.utils.removeStorage('token');
        
        console.log('Storage cleared');
        
        // Clear auth header
        this.clearAuthHeader();
        
        // Update UI
        this.updateUI();
        
        // Dispatch custom event for other scripts
        window.dispatchEvent(new CustomEvent('authchange', { 
            detail: { user: null, authenticated: false } 
        }));
    }
    
    // In your AuthManager class, update setupAuthHeader:
    setupAuthHeader(token) {
        console.log('Setting up auth header with token:', token ? 'Exists' : 'Missing');
        
        // Store token globally for fetch requests
        window.authToken = token;
        
        // Also store in localStorage as backup
        if (token) {
            localStorage.setItem('micro_donation_token', token);
        }
        
        // Override global fetch to add auth header
        if (!window.originalFetch) {
            window.originalFetch = window.fetch;
            
            window.fetch = async function(url, options = {}) {
                // Make sure options is an object
                options = options || {};
                
                // Ensure headers object exists
                options.headers = options.headers || {};
                
                // Get token from multiple sources
                const token = window.authToken || 
                            localStorage.getItem('micro_donation_token') ||
                            localStorage.getItem('communitygive_token') ||
                            localStorage.getItem('token');
                
                // Only add auth header if we have a token
                if (token) {
                    // Check if this is an auth endpoint - we still need token for some auth endpoints
                    const urlString = typeof url === 'string' ? url : url.url || '';
                    const isAuthEndpoint = urlString.includes('/auth/') && 
                                        (urlString.includes('login.php') || urlString.includes('register.php'));
                    
                    // For ALL other endpoints, including donors and donations, add the token
                    if (!isAuthEndpoint) {
                        options.headers['Authorization'] = `Bearer ${token}`;
                        
                        // Also add X-User-ID and X-User-Role headers if we have user data
                        try {
                            const userStr = localStorage.getItem('micro_donation_user') || 
                                        localStorage.getItem('communitygive_user') ||
                                        localStorage.getItem('user');
                            if (userStr) {
                                const user = JSON.parse(userStr);
                                if (user && user.id) {
                                    options.headers['X-User-ID'] = user.id;
                                }
                                if (user && user.role) {
                                    options.headers['X-User-Role'] = user.role;
                                }
                            }
                        } catch (e) {
                            console.warn('Could not parse user for headers:', e);
                        }
                    }
                }
                
                // Log the request for debugging
                console.log('Fetch request:', {
                    url: typeof url === 'string' ? url.substring(0, 50) : 'Request object',
                    hasToken: !!token,
                    headers: options.headers ? Object.keys(options.headers) : []
                });
                
                try {
                    // Make the request
                    const response = await window.originalFetch(url, options);
                    
                    // If response is 401 Unauthorized, try to refresh or clear session
                    if (response.status === 401) {
                        console.warn('Received 401 Unauthorized response');
                        
                        // Check if we should clear session
                        const shouldClear = !urlString.includes('/auth/');
                        if (shouldClear) {
                            console.log('Clearing session due to 401');
                            // Don't call auth directly to avoid loops
                            setTimeout(() => {
                                if (window.auth && window.auth.clearSession) {
                                    window.auth.clearSession();
                                }
                            }, 100);
                        }
                    }
                    
                    return response;
                } catch (error) {
                    console.error('Fetch error:', error);
                    throw error;
                }
            };
        }
    }

    clearAuthHeader() {
        // Clear global token
        window.authToken = null;
        
        // Don't restore original fetch immediately as other components might still need it
        // Instead, just clear the token and let the fetch wrapper handle it
        console.log('Auth header cleared');
    }
    
    updateUI() {
        console.log('Updating UI. Authenticated:', this.isAuthenticated());
        
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        
        if (this.isAuthenticated()) {
            console.log('User is authenticated, updating UI...');
            
            // User is logged in
            if (loginBtn) {
                loginBtn.style.display = 'none';
                if (loginBtn.parentElement) {
                    loginBtn.parentElement.style.display = 'none';
                }
            }
            if (registerBtn) {
                registerBtn.style.display = 'none';
                if (registerBtn.parentElement) {
                    registerBtn.parentElement.style.display = 'none';
                }
            }
            
            // Create user menu if it doesn't exist
            const userMenu = document.getElementById('userMenu');
            if (!userMenu) {
                this.createUserMenu();
            } else {
                userMenu.style.display = 'block';
            }
            
            // Show admin menu if admin
            if (this.isAdmin()) {
                const adminMenu = document.getElementById('adminMenu');
                if (!adminMenu) {
                    this.createAdminMenu();
                } else {
                    adminMenu.style.display = 'block';
                }
            }
        } else {
            console.log('User is NOT authenticated, showing login buttons');
            
            // User is not logged in
            if (loginBtn) {
                loginBtn.style.display = 'block';
                if (loginBtn.parentElement) {
                    loginBtn.parentElement.style.display = 'block';
                }
            }
            if (registerBtn) {
                registerBtn.style.display = 'block';
                if (registerBtn.parentElement) {
                    registerBtn.parentElement.style.display = 'block';
                }
            }
            
            // Remove user menu if exists
            const userMenu = document.getElementById('userMenu');
            if (userMenu) {
                userMenu.remove();
            }
            
            // Remove admin menu if exists
            const adminMenu = document.getElementById('adminMenu');
            if (adminMenu) {
                adminMenu.remove();
            }
        }
    }
    
    createUserMenu() {
        console.log('Creating user menu... Current user:', this.currentUser);
        
        // Remove existing user menu
        const existingMenu = document.getElementById('userMenu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Check if we have a user
        if (!this.currentUser) {
            console.error('Cannot create user menu: No current user');
            return;
        }
        
        // Find the navbar
        let navbarNav = document.querySelector('#navbarNav .navbar-nav');
        if (!navbarNav) {
            navbarNav = document.querySelector('.navbar-nav');
        }
        if (!navbarNav) {
            console.error('Cannot create user menu: Navbar not found');
            return;
        }
        
        const userName = this.currentUser.name?.split(' ')[0] || 
                        this.currentUser.email?.split('@')[0] || 
                        'User';
        
        // MODIFIED: Added inline styles to ensure dropdown visibility
            const userMenuHTML = `
                <li class="nav-item dropdown" id="userMenu" style="position: relative; overflow: visible;">
                    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" 
                    data-bs-toggle="dropdown" aria-expanded="false" 
                    style="display: flex; align-items: center; gap: 0.5rem; background-color: #4e73df; color: white; border-radius: 0.35rem; padding: 0.5rem 1rem;">
                        <i class="fas fa-user-circle"></i>
                        <span class="user-name">${userName}</span>
                        ${this.currentUser.role === 'admin' ? ' <small>(Admin)</small>' : ''}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown"
                        style="position: absolute; top: 100%; right: 0; left: auto; min-width: 200px; z-index: 9999; margin-top: 0.5rem; background-color: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.35rem; box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.3);">
                        <li><a class="dropdown-item" href="${typeof getRootPath === 'function' ? getRootPath() : ''}pages/profile.html" style="display: block; padding: 0.5rem 1.5rem; clear: both; color: #f1f5f9; text-decoration: none;">
                            <i class="fas fa-user me-2"></i>My Profile
                        </a></li>
                        <li><hr class="dropdown-divider" style="margin: 0.5rem 0; border-top: 1px solid #334155;"></li>
                        <li><a class="dropdown-item text-danger logout-btn" href="#" style="display: block; padding: 0.5rem 1.5rem; clear: both; color: #f87171 !important; text-decoration: none;">
                            <i class="fas fa-sign-out-alt me-2"></i>Logout
                        </a></li>
                    </ul>
                </li>
            `;
        
        // Find login buttons to insert before them
        const loginBtn = navbarNav.querySelector('#loginBtn');
        const loginItem = loginBtn ? loginBtn.closest('.nav-item') : null;
        
        if (loginItem) {
            loginItem.insertAdjacentHTML('beforebegin', userMenuHTML);
        } else {
            // Append to end if no login button found
            navbarNav.insertAdjacentHTML('beforeend', userMenuHTML);
        }
        
        console.log('User menu created successfully');
    }
    
    createAdminMenu() {
        const navbarNav = document.querySelector('#navbarNav .navbar-nav');
        if (!navbarNav) return;
        
        // Check if admin menu already exists
        if (document.getElementById('adminMenu')) return;
        
        // MODIFIED: Added proper styling and positioning
        const adminMenuHTML = `
            <li class="nav-item" id="adminMenu" style="position: relative; margin-right: 0.5rem;">
                <a class="nav-link" href="${typeof getRootPath === 'function' ? getRootPath() : ''}admin-dashboard.html"
                style="display: flex; align-items: center; gap: 0.5rem; background-color: #f6c23e; color: #fff; border-radius: 0.35rem; padding: 0.5rem 1rem; font-weight: 600;">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>Admin</span>
                </a>
            </li>
        `;
        
        // Add admin menu at the beginning
        navbarNav.insertAdjacentHTML('afterbegin', adminMenuHTML);
    }
    
    isAuthenticated() {
        const isAuth = this.currentUser !== null;
        return isAuth;
    }
    
    isAdmin() {
        const isAdmin = this.isAuthenticated() && this.currentUser.role === 'admin';
        return isAdmin;
    }
    
    isDonor() {
        return this.isAuthenticated() && this.currentUser.role === 'user';
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Password strength checker
    checkPasswordStrength(password) {
        let strength = 0;
        let feedback = [];
        
        if (password.length >= 8) strength++;
        else feedback.push('Password should be at least 8 characters long');
        
        if (/[a-z]/.test(password)) strength++;
        else feedback.push('Add lowercase letters');
        
        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('Add uppercase letters');
        
        if (/[0-9]/.test(password)) strength++;
        else feedback.push('Add numbers');
        
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        else feedback.push('Add special characters');
        
        return {
            score: strength,
            maxScore: 5,
            feedback: feedback,
            strength: strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong'
        };
    }
    
    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    showNotification(message, type = 'info') {
        // Use utils.showNotification if available, otherwise use local method
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification(message, type);
        } else {
            // Local fallback notification
            const existingNotification = document.querySelector('.auth-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            const alertClass = type === 'error' ? 'danger' : type;
            
            const notification = document.createElement('div');
            notification.className = `auth-notification alert alert-${alertClass} alert-dismissible fade show`;
            notification.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }
    }
}

// Initialize auth manager
console.log('Initializing auth manager...');
console.log('Global API_BASE_URL set to:', window.API_BASE_URL);
const auth = new AuthManager();

// Make auth available globally
window.auth = auth;

// Listen for storage changes (when another tab logs in/out)
window.addEventListener('storage', function(e) {
    if (e.key === 'micro_donation_user' || e.key === 'micro_donation_token' ||
        e.key === 'communitygive_user' || e.key === 'communitygive_token') {
        console.log('Auth storage changed, reloading auth state');
        auth.init(); // Re-initialize to sync state
    }
});

// Add global unstuck function to fix stuck buttons
document.addEventListener('DOMContentLoaded', function() {
    // Fix stuck login buttons every 5 seconds
    setInterval(function() {
        const stuckButtons = document.querySelectorAll('button:disabled');
        stuckButtons.forEach(btn => {
            // If button has spinner text and has been disabled
            if (btn.innerHTML.includes('fa-spinner')) {
                console.log('Found stuck button:', btn);
                btn.disabled = false;
                btn.innerHTML = btn.innerHTML.includes('Login') ? 'Login' : 'Submit';
            }
        });
    }, 5000);
    
    // Force restore login button on page unload
    window.addEventListener('beforeunload', function() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
        }
    });
});

// Check if we're on registration page and auth exists
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('register.html')) {
        console.log('On registration page, ensuring auth is available');
        if (typeof auth === 'undefined') {
            console.log('Auth not initialized on register page, initializing...');
            window.auth = new AuthManager();
        }
    }
});

// Force page visibility fix - add this at the very end of auth.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading page visibility fix');
    
    // Monitor for page being hidden
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                
                // Check if body is hidden or has modal-open class
                const bodyStyle = window.getComputedStyle(document.body);
                if (bodyStyle.display === 'none' || 
                    document.body.classList.contains('modal-open') && bodyStyle.overflow === 'hidden') {
                    
                    console.log('Page was hidden! Forcing visible...');
                    
                    // Force page to be visible
                    document.body.style.display = 'block';
                    document.body.style.overflow = 'visible';
                    document.body.classList.remove('modal-open');
                    
                    // Remove any modal backdrops
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(backdrop => backdrop.remove());
                    
                    // Hide all modals
                    document.querySelectorAll('.modal.show').forEach(modal => {
                        modal.classList.remove('show');
                        modal.style.display = 'none';
                    });
                }
            }
        });
    });
    
    // Start observing the body element
    observer.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['style', 'class'] 
    });
    
    // Also add a click handler for modal close buttons
    document.addEventListener('click', function(e) {
        const closeBtn = e.target.closest('[data-bs-dismiss="modal"], .btn-close');
        if (closeBtn) {
            console.log('Modal close button clicked - ensuring page stays visible');
            
            // Wait a bit then ensure page is visible
            setTimeout(function() {
                document.body.style.display = 'block';
                document.body.classList.remove('modal-open');
                
                // Force cleanup
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
            }, 100);
        }
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
}

// Add at the bottom of auth.js for debugging
console.log('=== AUTH DEBUG ===');
console.log('Token from localStorage:', localStorage.getItem('micro_donation_token'));
console.log('User from localStorage:', localStorage.getItem('micro_donation_user'));
console.log('Current user object:', auth?.currentUser);
console.log('Is authenticated:', auth?.isAuthenticated());
console.log('==================');

// Fix for dropdown visibility
document.addEventListener('DOMContentLoaded', function() {
    // Ensure dropdowns work properly
    if (typeof bootstrap !== 'undefined') {
        // Initialize any dropdowns that might exist
        const dropdowns = document.querySelectorAll('.dropdown-toggle');
        dropdowns.forEach(dropdown => {
            new bootstrap.Dropdown(dropdown);
        });
    }
});