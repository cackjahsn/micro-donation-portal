// auth.js - Enhanced Authentication Module with localStorage persistence
const AUTH_STORAGE_KEY = 'microDonationUsers';
const CURRENT_USER_KEY = 'currentUser';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.tokenKey = 'communitygive_token';
        this.userKey = 'communitygive_user';
        this.users = this.loadUsers();
        this.init();
    }
    
    init() {
        // Check for saved user session
        const savedToken = localStorage.getItem(this.tokenKey);
        const savedUser = localStorage.getItem(this.userKey);
        
        if (savedToken && savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.setupAuthHeader(savedToken);
            } catch (error) {
                this.clearSession();
            }
        } else {
            // Fallback to session storage
            this.currentUser = this.loadCurrentUser();
        }
        
        this.setupEventListeners();
    }
    
    loadUsers() {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [
            // Default admin user
            {
                id: 1,
                email: 'admin@communitygive.com',
                password: 'admin123',
                name: 'System Admin',
                role: 'admin',
                avatar: 'assets/images/default-avatar.png',
                dateJoined: '2025-01-01',
                donations: [],
                totalDonated: 0
            }
        ];
    }
    
    saveUsers() {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.users));
    }
    
    loadCurrentUser() {
        const stored = sessionStorage.getItem(CURRENT_USER_KEY);
        return stored ? JSON.parse(stored) : null;
    }
    
    saveCurrentUser(user) {
        if (user) {
            // Don't store password in session
            const { password, ...userWithoutPassword } = user;
            sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
            localStorage.setItem(this.userKey, JSON.stringify(userWithoutPassword));
            this.currentUser = userWithoutPassword;
        }
    }
    
    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.logout-btn')) {
                this.handleLogout(e);
            }
        });
        
        // Check authentication status on page load
        this.updateUI();
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const email = form.querySelector('#loginEmail')?.value || form.querySelector('input[type="email"]')?.value;
        const password = form.querySelector('#loginPassword')?.value || form.querySelector('input[type="password"]')?.value;
        
        try {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
            
            // Use actual user validation from stored users
            const user = this.getUserByEmail(email);
            
            if (!user) {
                throw new Error('User not found');
            }
            
            if (user.password !== password) {
                throw new Error('Incorrect password');
            }
            
            // Generate token
            const mockToken = 'mock_jwt_token_' + Date.now();
            
            // Set session
            this.setSession(user, mockToken);
            
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
            
            // Redirect based on role
            setTimeout(() => {
                if (user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.reload(); // Reload to update UI
                }
            }, 1000);
            
        } catch (error) {
            this.showNotification(error.message || 'Login failed. Please try again.', 'error');
            
            // Reset button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = 'Login';
                submitBtn.disabled = false;
            }
        }
    }
    
    handleLogout(event) {
        if (event) event.preventDefault();
        
        this.clearSession();
        this.showNotification('Logged out successfully', 'success');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
    
    setSession(user, token) {
        this.currentUser = user;
        
        // Save to localStorage
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        
        // Save to session storage without password
        this.saveCurrentUser(user);
        
        // Setup auth header for API calls
        this.setupAuthHeader(token);
        
        // Update UI
        this.updateUI();
    }
    
    clearSession() {
        this.currentUser = null;
        
        // Remove from localStorage
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        
        // Remove from session storage
        sessionStorage.removeItem(CURRENT_USER_KEY);
        
        // Clear auth header
        this.clearAuthHeader();
        
        // Update UI
        this.updateUI();
    }
    
    setupAuthHeader(token) {
        // This would be used for API calls
        // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    clearAuthHeader() {
        // axios.defaults.headers.common['Authorization'] = null;
    }
    
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const adminMenu = document.getElementById('adminMenu');
        
        if (this.isAuthenticated()) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            
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
            // User is not logged in
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'block';
            
            if (userMenu) userMenu.style.display = 'none';
            if (adminMenu) adminMenu.style.display = 'none';
        }
    }
    
    createUserMenu() {
        const navbarNav = document.querySelector('#navbarNav .navbar-nav');
        if (!navbarNav || !this.currentUser) return;
        
        const userMenuHTML = `
            <li class="nav-item dropdown" id="userMenu">
                <a class="nav-link dropdown-toggle" href="#" role="button" 
                   data-bs-toggle="dropdown">
                    <i class="fas fa-user-circle me-1"></i>
                    <span class="user-name">${this.currentUser.name.split(' ')[0]}</span>
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="profile.html">
                        <i class="fas fa-user me-2"></i>My Profile
                    </a></li>
                    <li><a class="dropdown-item" href="my-donations.html">
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
            navbarNav.innerHTML += userMenuHTML;
        }
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
    
    getUserByEmail(email) {
        return this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
    }
    
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    isAdmin() {
        return this.isAuthenticated() && this.currentUser.role === 'admin';
    }
    
    isDonor() {
        return this.isAuthenticated() && this.currentUser.role === 'user';
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    async register(userData) {
        return new Promise((resolve, reject) => {
            // Validation
            if (!userData.email || !userData.password || !userData.name) {
                reject(new Error('All fields are required'));
                return;
            }
            
            if (this.getUserByEmail(userData.email)) {
                reject(new Error('Email already registered'));
                return;
            }
            
            if (userData.password.length < 6) {
                reject(new Error('Password must be at least 6 characters'));
                return;
            }
            
            // Create new user
            const newUser = {
                id: Date.now(),
                email: userData.email,
                password: userData.password,
                name: userData.name,
                role: 'user',
                avatar: 'assets/images/default-avatar.png',
                dateJoined: new Date().toISOString().split('T')[0],
                donations: [],
                totalDonated: 0
            };
            
            // Save user
            this.users.push(newUser);
            this.saveUsers();
            
            // Generate token
            const token = 'mock_jwt_token_' + Date.now();
            
            // Auto-login after registration
            this.setSession(newUser, token);
            
            resolve({
                success: true,
                user: newUser,
                token: token
            });
        });
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
    
    // Add donation to user
    addDonation(userId, donationData) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.donations.push({
                ...donationData,
                date: new Date().toISOString()
            });
            user.totalDonated = (user.totalDonated || 0) + donationData.amount;
            this.saveUsers();
            
            // Update current user if it's the same user
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser.donations = user.donations;
                this.currentUser.totalDonated = user.totalDonated;
                this.saveCurrentUser(this.currentUser);
            }
            
            return true;
        }
        return false;
    }
}

// Initialize auth manager
const auth = new AuthManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
}