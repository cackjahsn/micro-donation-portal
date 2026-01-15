// auth.js - Updated with Backend API Integration
const API_BASE_URL = 'http://localhost/micro-donation-portal/backend/api';

class AuthManager {
    constructor() {
        console.log('AuthManager constructor called - Page:', window.location.pathname);
        
        this.currentUser = null;
        this.tokenKey = 'micro_donation_token';
        this.userKey = 'micro_donation_user';
        this.init();
    }
    
    init() {
        console.log('AuthManager init called');
        
        // Check for saved user session
        const savedToken = localStorage.getItem(this.tokenKey);
        const savedUser = localStorage.getItem(this.userKey);
        
        console.log('LocalStorage check:', {
            token: savedToken ? 'Exists' : 'Missing',
            user: savedUser ? 'Exists' : 'Missing'
        });
        
        if (savedToken && savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                console.log('User restored from localStorage:', this.currentUser);
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
                const emailInput = newForm.querySelector('input[type="email"], #loginEmail');
                const passwordInput = newForm.querySelector('input[type="password"], #loginPassword');
                
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
        
        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.logout-btn') || e.target.id === 'logoutBtn') {
                console.log('Logout button clicked');
                this.handleLogout(e);
            }
        });
    }
    
    async handleLogin(email, password) {
        console.log('=== LOGIN START ===');
        console.log('Email:', email, 'Type:', typeof email);
        console.log('Password:', 'Type:', typeof password);
        
        // Find login button - use multiple selectors
        let loginBtn = document.querySelector('#loginBtn, button[type="submit"]');
        
        if (!loginBtn) {
            console.error('Login button not found anywhere on page');
            // Try alternative - find any button in the login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginBtn = loginForm.querySelector('button');
            }
        }
        
        const originalText = loginBtn ? loginBtn.innerHTML : 'Login';
        console.log('Original button text:', originalText);
        
        // Safety timeout to prevent stuck button
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
                console.log('Button disabled and loading state set');
            }
            
            // Validate inputs
            if (typeof email !== 'string' || typeof password !== 'string') {
                console.error('Invalid input types:', { 
                    emailType: typeof email, 
                    passwordType: typeof password 
                });
                throw new Error('Invalid email or password format');
            }
            
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();
            
            console.log('Trimmed values - Email:', trimmedEmail);
            
            if (!trimmedEmail || !trimmedPassword) {
                throw new Error('Email and password are required');
            }
            
            // Prepare login data
            const loginData = {
                email: trimmedEmail,
                password: trimmedPassword
            };
            
            console.log('Sending login request:', loginData);
            
            // Add AbortController for timeout
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
            
            // Get raw response first for debugging
            const responseText = await response.text();
            console.log('Raw login response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed response:', data);
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                throw new Error('Invalid server response');
            }
            
            if (data.success && data.user && data.token) {
                console.log('Login successful for user:', data.user.name);
                
                // Set session with correct keys
                this.setSession(data.user, data.token);
                
                // Clear safety timeout
                clearTimeout(restoreTimeout);
                
                this.showNotification('Login successful!', 'success');
                
                // Close modal if exists
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    const modal = bootstrap.Modal.getInstance(loginModal);
                    if (modal) modal.hide();
                }
                
                // Redirect based on role
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        // Force page reload to update navigation
                        window.location.href = 'index.html';
                    }
                }, 1000);
                
                return true;
            } else {
                throw new Error(data.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error details:', error);
            
            // Handle different error types
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
            
            if (loginBtn && loginBtn.parentNode) { // Check if button still exists in DOM
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalText;
                console.log('Button restored. Disabled:', loginBtn.disabled);
            } else {
                console.warn('Could not restore button - element not found');
            }
        }
    }
    
    async handleRegister(userData) {
        console.log('Registration attempt for:', userData.email);
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            console.log('Registration response:', data);
            
            if (data.success) {
                // Auto-login after successful registration
                const loginResponse = await fetch(`${API_BASE_URL}/auth/login.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: userData.email,
                        password: userData.password
                    })
                });
                
                const loginData = await loginResponse.json();
                console.log('Auto-login response:', loginData);
                
                if (loginData.success) {
                    this.setSession(loginData.user, loginData.token);
                    return { success: true, user: loginData.user };
                } else {
                    console.error('Auto-login failed:', loginData.message);
                }
            }
            
            return { success: false, message: data.message };
            
        } catch (error) {
            console.error('Registration error:', error);
            return { 
                success: false, 
                message: 'Registration failed. Please try again.' 
            };
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
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
    
    setSession(user, token) {
        console.log('Setting session for user:', user);
        
        this.currentUser = user;
        
        // Save to localStorage with consistent keys
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        
        // Remove any old/conflicting keys
        localStorage.removeItem('communitygive_user');
        localStorage.removeItem('communitygive_token');
        
        console.log('Saved to localStorage. Token:', token ? 'Yes' : 'No', 'User:', user ? 'Yes' : 'No');
        
        // Setup auth header for API calls
        this.setupAuthHeader(token);
        
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
        
        // Remove from localStorage
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        
        console.log('LocalStorage cleared');
        
        // Clear auth header
        this.clearAuthHeader();
        
        // Update UI
        this.updateUI();
        
        // Dispatch custom event for other scripts
        window.dispatchEvent(new CustomEvent('authchange', { 
            detail: { user: null, authenticated: false } 
        }));
    }
    
    setupAuthHeader(token) {
        // This would be used for authenticated API calls
        // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    clearAuthHeader() {
        // axios.defaults.headers.common['Authorization'] = null;
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
        console.log('Creating user menu...');
        
        // Find navbar
        const navbarNav = document.querySelector('#navbarNav .navbar-nav');
        if (!navbarNav || !this.currentUser) {
            console.error('Cannot create user menu: navbarNav or currentUser missing');
            return;
        }
        
        // Remove existing user menu if it exists
        const existingMenu = document.getElementById('userMenu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const userMenuHTML = `
            <li class="nav-item dropdown" id="userMenu">
                <a class="nav-link dropdown-toggle" href="#" role="button" 
                   data-bs-toggle="dropdown">
                    <i class="fas fa-user-circle me-1"></i>
                    <span class="user-name">${this.currentUser.name?.split(' ')[0] || this.currentUser.email}</span>
                    ${this.currentUser.role === 'admin' ? ' (Admin)' : ''}
                </a>
                <ul class="dropdown-menu">
                    ${this.currentUser.role === 'admin' ? `
                        <li><a class="dropdown-item" href="admin-dashboard.html">
                            <i class="fas fa-tachometer-alt me-2"></i>Admin Dashboard
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                    ` : ''}
                    <li><a class="dropdown-item" href="pages/profile.html">
                        <i class="fas fa-user me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item" href="#">
                        <i class="fas fa-donate me-2"></i>My Donations
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger logout-btn" href="#">
                        <i class="fas fa-sign-out-alt me-2"></i>Logout
                    </a></li>
                </ul>
            </li>
        `;
        
        // Find where to insert (before login/register buttons)
        const loginItem = navbarNav.querySelector('.nav-item:has(#loginBtn)');
        if (loginItem) {
            loginItem.insertAdjacentHTML('beforebegin', userMenuHTML);
        } else {
            // Append to end if login button not found
            navbarNav.insertAdjacentHTML('beforeend', userMenuHTML);
        }
        
        console.log('User menu created successfully');
    }
    
    createAdminMenu() {
        const navbarNav = document.querySelector('#navbarNav .navbar-nav');
        if (!navbarNav) return;
        
        // Check if admin menu already exists
        if (document.getElementById('adminMenu')) return;
        
        const adminMenuHTML = `
            <li class="nav-item" id="adminMenu">
                <a class="nav-link" href="admin-dashboard.html">
                    <i class="fas fa-tachometer-alt me-1"></i>Admin
                </a>
            </li>
        `;
        
        // Add admin menu at the beginning
        navbarNav.insertAdjacentHTML('afterbegin', adminMenuHTML);
    }
    
    isAuthenticated() {
        const isAuth = this.currentUser !== null;
        console.log('isAuthenticated check:', isAuth);
        return isAuth;
    }
    
    isAdmin() {
        const isAdmin = this.isAuthenticated() && this.currentUser.role === 'admin';
        console.log('isAdmin check:', isAdmin);
        return isAdmin;
    }
    
    isDonor() {
        return this.isAuthenticated() && this.currentUser.role === 'user';
    }
    
    getCurrentUser() {
        console.log('getCurrentUser called:', this.currentUser);
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
        // Remove existing notifications
        const existingNotification = document.querySelector('.auth-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Map type to Bootstrap alert classes
        const alertClass = type === 'error' ? 'danger' : type;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `auth-notification alert alert-${alertClass} alert-dismissible fade show`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize auth manager
console.log('Initializing auth manager...');
const auth = new AuthManager();

// Make auth available globally
window.auth = auth;

// Listen for storage changes (when another tab logs in/out)
window.addEventListener('storage', function(e) {
    if (e.key === 'micro_donation_user' || e.key === 'micro_donation_token') {
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
}