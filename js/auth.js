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
        // CRITICAL FIX: Update UI immediately on init
        this.updateUI();
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('Login form found, adding listener');
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.logout-btn')) {
                console.log('Logout button clicked');
                this.handleLogout(e);
            }
        });
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const email = form.querySelector('#loginEmail')?.value || 
                     form.querySelector('input[type="email"]')?.value;
        const password = form.querySelector('#loginPassword')?.value || 
                        form.querySelector('input[type="password"]')?.value;
        
        console.log('Login attempt for:', email);
        
        try {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
            
            // API call to backend
            const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log('Login response:', data);
            
            if (data.success) {
                // Set session
                this.setSession(data.user, data.token);
                
                // Show success message
                this.showNotification('Login successful!', 'success');
                
                // Close modal if exists
                const modalElement = form.closest('.modal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                }
                
                // Redirect based on role or stored redirect URL
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                setTimeout(() => {
                    if (redirectUrl) {
                        sessionStorage.removeItem('redirectAfterLogin');
                        window.location.href = redirectUrl;
                    } else if (data.user.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        // Force page reload to update navigation
                        window.location.reload();
                    }
                }, 1000);
                
            } else {
                throw new Error(data.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification(error.message, 'error');
            
            // Reset button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
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
        
        // Save to localStorage
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        
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
        const userMenu = document.getElementById('userMenu');
        const adminMenu = document.getElementById('adminMenu');
        
        if (this.isAuthenticated()) {
            console.log('User is authenticated, updating UI...');
            
            // User is logged in
            if (loginBtn) {
                loginBtn.style.display = 'none';
                loginBtn.parentElement.style.display = 'none'; // Hide the li item too
            }
            if (registerBtn) {
                registerBtn.style.display = 'none';
                registerBtn.parentElement.style.display = 'none'; // Hide the li item too
            }
            
            // Create user menu if it doesn't exist
            if (!userMenu) {
                this.createUserMenu();
            } else {
                userMenu.style.display = 'block';
                
                // Update user info
                const userName = userMenu.querySelector('.user-name');
                const userAvatar = userMenu.querySelector('.user-avatar');
                
                if (userName) {
                    userName.textContent = this.currentUser.name;
                }
                
                if (userAvatar && this.currentUser.avatar) {
                    userAvatar.src = this.currentUser.avatar;
                    userAvatar.alt = this.currentUser.name;
                }
            }
            
            // Show admin menu if admin
            if (this.isAdmin()) {
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
                loginBtn.parentElement.style.display = 'block';
            }
            if (registerBtn) {
                registerBtn.style.display = 'block';
                registerBtn.parentElement.style.display = 'block';
            }
            
            if (userMenu) userMenu.style.display = 'none';
            if (adminMenu) adminMenu.style.display = 'none';
        }
    }
    
    createUserMenu() {
        const navbarNav = document.querySelector('#navbarNav .navbar-nav');
        if (!navbarNav || !this.currentUser) {
            console.error('Cannot create user menu: navbarNav or currentUser missing');
            return;
        }
        
        console.log('Creating user menu for:', this.currentUser.name);
        
        // CRITICAL FIX: Correct profile link path
        const userMenuHTML = `
            <li class="nav-item dropdown" id="userMenu">
                <a class="nav-link dropdown-toggle" href="#" role="button" 
                   data-bs-toggle="dropdown">
                    <i class="fas fa-user-circle me-1"></i>
                    <span class="user-name">${this.currentUser.name.split(' ')[0]}</span>
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="pages/profile.html">
                        <i class="fas fa-user me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item" href="#">
                        <i class="fas fa-donate me-2"></i>My Donations
                    </a></li>
                    ${this.isAdmin() ? 
                        `<li><a class="dropdown-item" href="admin-dashboard.html">
                            <i class="fas fa-cog me-2"></i>Admin Dashboard
                        </a></li>` : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger logout-btn" href="#">
                        <i class="fas fa-sign-out-alt me-2"></i>Logout
                    </a></li>
                </ul>
            </li>
        `;
        
        // Add user menu before the login/register buttons
        const loginItem = navbarNav.querySelector('.nav-item:has(#loginBtn)');
        if (loginItem) {
            loginItem.insertAdjacentHTML('beforebegin', userMenuHTML);
        } else {
            // If no login button, add to end
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
}