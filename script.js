// script.js - Universal JavaScript for All Pages (UPDATED WITH LOGIN FIX)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script.js loaded on:', window.location.pathname);
    
    // DOM Elements (only initialize if they exist)
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModalElement = document.getElementById('loginModal');
    const loginModal = loginModalElement ? new bootstrap.Modal(loginModalElement) : null;
    const campaignsContainer = document.getElementById('campaignsContainer');

    // Initialize fixed navbar on all pages
    if (typeof NavbarManager !== 'undefined') {
        window.navbarManager = new NavbarManager();
    }
    
    // Event Listeners for navigation (if elements exist)
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Login button clicked, showing modal');
            loginModal.show();
        });
    }
    
        if (registerBtn) {
            registerBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Handle base path correctly
                let registerUrl = 'register.html';
                
                // If we're using base tag, need to handle it properly
                const baseTag = document.querySelector('base');
                if (baseTag && baseTag.href) {
                    // Base tag exists, use absolute path
                    const baseHref = baseTag.href;
                    if (baseHref.endsWith('/micro-donation-portal/')) {
                        // Already has base path, just use relative
                        registerUrl = 'register.html';
                    } else {
                        // Need to construct full URL
                        const currentPath = window.location.pathname;
                        if (currentPath.includes('/pages/')) {
                            // From pages folder
                            registerUrl = '../register.html';
                        } else {
                            // From root
                            registerUrl = 'register.html';
                        }
                    }
                } else {
                    // No base tag, use relative paths
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/pages/')) {
                        registerUrl = '../register.html';
                    } else {
                        registerUrl = 'register.html';
                    }
                }
                
                console.log('Redirecting to register:', registerUrl);
                window.location.href = registerUrl;
            });
        }
    
    // CRITICAL FIX: Setup login form handler
    setupLoginFormHandler();
    
    // Setup password toggle if login modal exists
    if (document.getElementById('loginPassword')) {
        setupPasswordToggle();
    }
    
    // Load Campaigns only if container exists (homepage)
    if (campaignsContainer) {
        loadCampaigns();
    }
    
    // Setup donation buttons on all pages
    setupDonationButtons();
    
    // Check for redirect after login
    checkRedirectAfterLogin();
    
    // --------------------------------------------------
    // FUNCTIONS
    // --------------------------------------------------
    
    // CRITICAL FIX: This function connects login form to auth.js
    function setupLoginFormHandler() {
        console.log('Setting up login form handler...');
        
        // Use event delegation for login form submission
        document.addEventListener('submit', async function(e) {
            if (e.target && e.target.id === 'loginForm') {
                e.preventDefault();
                console.log('Login form submitted via event delegation');
                
                const form = e.target;
                const emailInput = form.querySelector('input[type="email"], #loginEmail, input[name="email"]');
                const passwordInput = form.querySelector('input[type="password"], #loginPassword, input[name="password"]');
                
                if (!emailInput || !passwordInput) {
                    showNotification('Please fill in all fields', 'error');
                    return;
                }
                
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                
                if (!email || !password) {
                    showNotification('Please enter both email and password', 'error');
                    return;
                }
                
                console.log('Login attempt for:', email);
                
                // Disable submit button
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : 'Login';
                
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                }
                
                try {
                    // Use auth.handleLogin if available
                    if (typeof auth !== 'undefined' && auth.handleLogin) {
                        console.log('Using auth.handleLogin');
                        await auth.handleLogin(email, password);
                    } else {
                        // Fallback: direct login
                        console.log('Auth not available, using direct login');
                        await handleLoginDirectly(email, password, form);
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    showNotification(error.message || 'Login failed', 'error');
                } finally {
                    // Restore button after delay
                    setTimeout(() => {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalText;
                        }
                    }, 1000);
                }
            }
        });
        
        // Also attach directly to existing form (in case form is replaced)
        const existingForm = document.getElementById('loginForm');
        if (existingForm) {
            console.log('Found login form, attaching direct handler');
            
            // Clone to remove old listeners
            const newForm = existingForm.cloneNode(true);
            existingForm.parentNode.replaceChild(newForm, existingForm);
            
            newForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Login form submitted directly');
                
                const emailInput = this.querySelector('input[type="email"], #loginEmail, input[name="email"]');
                const passwordInput = this.querySelector('input[type="password"], #loginPassword, input[name="password"]');
                
                if (!emailInput || !passwordInput) {
                    showNotification('Please fill in all fields', 'error');
                    return;
                }
                
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                
                if (!email || !password) {
                    showNotification('Please enter both email and password', 'error');
                    return;
                }
                
                console.log('Direct login attempt for:', email);
                
                // Disable button
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : 'Login';
                
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                }
                
                try {
                    if (typeof auth !== 'undefined' && auth.handleLogin) {
                        await auth.handleLogin(email, password);
                    } else {
                        await handleLoginDirectly(email, password, this);
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    showNotification(error.message || 'Login failed', 'error');
                } finally {
                    setTimeout(() => {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalText;
                        }
                    }, 1000);
                }
            });
        }
    }
    
    // Direct login handler (fallback)
    async function handleLoginDirectly(email, password, form) {
        console.log('Direct login handling for:', email);
        
        try {
            // Determine correct API URL
            let apiUrl = '/micro-donation-portal/backend/api/auth/login.php';
            
            console.log('Calling API:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });
            
            console.log('Response status:', response.status);
            
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed response:', data);
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                throw new Error('Invalid server response');
            }
            
            if (data.success && data.user && data.token) {
                console.log('Login successful for:', data.user.name);
                
                // Save to storage
                if (typeof utils !== 'undefined' && utils.setStorage) {
                    utils.setStorage('user', data.user);
                    utils.setStorage('token', data.token);
                } else {
                    localStorage.setItem('micro_donation_user', JSON.stringify(data.user));
                    localStorage.setItem('micro_donation_token', data.token);
                }
                
                showNotification('Login successful!', 'success');
                
                // Close modal
                const loginModal = document.getElementById('loginModal');
                if (loginModal && typeof bootstrap !== 'undefined') {
                    const modal = bootstrap.Modal.getInstance(loginModal);
                    if (modal) modal.hide();
                }
                
                // Redirect based on role
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        // Force reload to update UI
                        window.location.reload();
                    }
                }, 1000);
                
                return true;
            } else {
                throw new Error(data.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message || 'Login failed. Please try again.', 'error');
            return false;
        }
    }
    
    // Function to setup password toggle
    function setupPasswordToggle() {
        const loginToggleBtn = document.getElementById('loginTogglePassword');
        if (loginToggleBtn) {
            // Remove any existing event listeners
            const newBtn = loginToggleBtn.cloneNode(true);
            loginToggleBtn.parentNode.replaceChild(newBtn, loginToggleBtn);
            
            newBtn.addEventListener('click', function() {
                const passwordInput = document.getElementById('loginPassword');
                if (passwordInput) {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    this.innerHTML = type === 'password' ? 
                        '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
                }
            });
        }
    }
    
    // Function to load campaigns (homepage only)
    async function loadCampaigns() {
        try {
            // Use API instead of static data
            if (typeof getAllCampaigns === 'function') {
                // Use existing function from campaigns.js or homepage-campaigns.js
                const campaigns = await getAllCampaigns();
                displayCampaigns(campaigns.slice(0, 3)); // Show only 3 on homepage
            } else {
                // Fallback to static data
                const campaigns = [
                    {
                        id: 1,
                        title: "Emergency Relief Fund",
                        description: "Support families affected by recent floods",
                        target: 50000,
                        raised: 32500,
                        progress: 65,
                        image: window.location.pathname.includes('/pages/') 
                            ? '../assets/images/campaign1.jpg' 
                            : 'assets/images/campaign1.jpg',
                        category: "Emergency",
                        donors: 127
                    },
                    {
                        id: 2,
                        title: "Student Scholarship Program",
                        description: "Help underprivileged students continue their education",
                        target: 30000,
                        raised: 18500,
                        progress: 62,
                        image: window.location.pathname.includes('/pages/') 
                            ? '../assets/images/campaign2.jpg' 
                            : 'assets/images/campaign2.jpg',
                        category: "Education",
                        donors: 89
                    },
                    {
                        id: 3,
                        title: "Community Health Center",
                        description: "Renovate and equip local health center",
                        target: 75000,
                        raised: 42000,
                        progress: 56,
                        image: window.location.pathname.includes('/pages/') 
                            ? '../assets/images/campaign3.jpg' 
                            : 'assets/images/campaign3.jpg',
                        category: "Health",
                        donors: 156
                    }
                ];
                
                displayCampaigns(campaigns);
            }
        } catch (error) {
            console.error('Error loading campaigns:', error);
            campaignsContainer.innerHTML = '<div class="col-12"><p class="text-center text-danger">Unable to load campaigns. Please try again later.</p></div>';
        }
    }
    
    // Function to display campaigns (homepage only)
    function displayCampaigns(campaigns) {
        campaignsContainer.innerHTML = '';
        
        campaigns.forEach(campaign => {
            const campaignCard = `
                <div class="col-md-4">
                    <div class="card campaign-card">
                        <div class="position-relative">
                            <img src="${campaign.image}" class="card-img-top" alt="${campaign.title}" height="200">
                            <span class="badge bg-primary position-absolute bottom-2 start-2">${campaign.category}</span>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${campaign.title}</h5>
                            <p class="card-text">${campaign.description}</p>
                            
                            <div class="campaign-stats mb-3">
                                <div class="stat">
                                    <i class="fas fa-users text-primary"></i>
                                    <span>${campaign.donors} donors</span>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Raised: RM${campaign.raised.toLocaleString()}</strong>
                                <span class="float-end">Target: RM${campaign.target.toLocaleString()}</span>
                            </div>
                            
                            <div class="progress mb-3">
                                <div class="progress-bar" style="width: ${campaign.progress}%"></div>
                            </div>
                            
                            <div class="text-center mt-3">
                                <a href="${window.location.pathname.includes('/pages/') ? '../' : ''}donation-page.html?campaign=${campaign.id}" 
                                   class="btn btn-donate btn-lg">
                                    <i class="fas fa-heart me-2"></i>Donate Now
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            campaignsContainer.innerHTML += campaignCard;
        });
    }
    
    // Function to setup donation buttons with auth check (works on all pages)
    function setupDonationButtons() {
        // Use event delegation to handle dynamically added buttons
        document.addEventListener('click', function(e) {
            const donateBtn = e.target.closest('.btn-donate');
            if (donateBtn) {
                e.preventDefault();
                
                // Get campaign ID from data attribute or href
                const campaignId = donateBtn.getAttribute('data-campaign-id') || 
                                 (donateBtn.href.includes('campaign=') ? 
                                  donateBtn.href.split('campaign=')[1] : null);
                
                // Get the donation URL
                const donateUrl = donateBtn.href;
                
                // Check if user is authenticated
                const isAuthenticated = auth && typeof auth.isAuthenticated === 'function' ? 
                    auth.isAuthenticated() : false;
                
                if (!isAuthenticated) {
                    // Show login modal
                    if (loginModal) {
                        loginModal.show();
                        
                        // Store the donation URL to redirect after login
                        sessionStorage.setItem('redirectAfterLogin', donateUrl);
                        
                        // Show message
                        showNotification('Please login to make a donation', 'warning');
                    } else {
                        // No modal, redirect to login page
                        const loginUrl = window.location.pathname.includes('/pages/') 
                            ? '../register.html' 
                            : 'register.html';
                        window.location.href = `${loginUrl}?redirect=${encodeURIComponent(donateUrl)}`;
                    }
                } else {
                    // User is authenticated, proceed to donation
                    window.location.href = donateUrl;
                }
            }
        });
    }
    
    // Function to check and handle redirect after login
    function checkRedirectAfterLogin() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        const isAuthenticated = auth && typeof auth.isAuthenticated === 'function' ? 
            auth.isAuthenticated() : false;
            
        if (redirectUrl && isAuthenticated) {
            sessionStorage.removeItem('redirectAfterLogin');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 500);
        }
    }
    
    // Helper function for notifications
    function showNotification(message, type = 'info') {
        // Use utils if available
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification(message, type);
            return;
        }
        
        // Use auth if available
        if (typeof auth !== 'undefined' && auth.showNotification) {
            auth.showNotification(message, type);
            return;
        }
        
        // Fallback
        const alertClass = type === 'error' ? 'danger' : 
                          type === 'warning' ? 'warning' : 
                          type === 'success' ? 'success' : 'info';
        
        const notification = document.createElement('div');
        notification.className = `alert alert-${alertClass} alert-dismissible fade show`;
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
});

// --------------------------------------------------
// GLOBAL FUNCTIONS & CLASSES (Available on all pages)
// --------------------------------------------------

// Navbar Scroll Behavior (Global Class)
class NavbarManager {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.navbarHeight = this.navbar ? this.navbar.offsetHeight : 70;
        this.lastScrollTop = 0;
        
        this.init();
    }
    
    init() {
        // Add scroll event listener
        window.addEventListener('scroll', () => this.handleScroll());
        
        // Initial check
        this.handleScroll();
        
        // Close mobile menu when clicking a link
        this.setupMobileMenu();
        
        // Update body padding based on navbar height
        this.updateBodyPadding();
    }
    
    handleScroll() {
        if (!this.navbar) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove scrolled class based on scroll position
        if (scrollTop > 50) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }
        
        this.lastScrollTop = scrollTop;
    }
    
    setupMobileMenu() {
        // Close mobile menu when clicking a link
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Check if mobile menu is open
                if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                    // Close the menu
                    navbarToggler.click();
                }
            });
        });
    }
    
    updateBodyPadding() {
        // Update body padding to match navbar height
        document.body.style.paddingTop = this.navbarHeight + 'px';
        
        // Update on resize
        window.addEventListener('resize', () => {
            this.navbarHeight = this.navbar.offsetHeight;
            document.body.style.paddingTop = this.navbarHeight + 'px';
        });
    }
    
    // Public method to manually update
    update() {
        this.navbarHeight = this.navbar.offsetHeight;
        this.updateBodyPadding();
    }
}

// Initialize globally when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already initialized
    if (!window.navbarManager) {
        window.navbarManager = new NavbarManager();
    }
});

// Global utility function for forgot password
window.showForgotPassword = function() {
    // Check if modal exists
    let forgotModalElement = document.getElementById('forgotPasswordModal');
    
    // Create modal if it doesn't exist
    if (!forgotModalElement) {
        const modalHTML = `
            <div class="modal fade" id="forgotPasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Reset Password</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Enter your email address and we'll send you a password reset link.</p>
                            <div class="mb-3">
                                <input type="email" class="form-control" 
                                       id="resetEmail" 
                                       placeholder="you@example.com">
                            </div>
                            <button class="btn btn-primary w-100" 
                                    onclick="window.sendResetLink()">
                                Send Reset Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        forgotModalElement = document.getElementById('forgotPasswordModal');
    }
    
    // Show the modal
    const forgotModal = new bootstrap.Modal(forgotModalElement);
    forgotModal.show();
};

// Global function to send reset link
window.sendResetLink = function() {
    const email = document.getElementById('resetEmail')?.value;
    if (email) {
        // In a real app, you would send an API request here
        alert(`Password reset link would be sent to: ${email}\n\n(Simulation only - No backend connected)`);
        
        // Close modal
        const forgotModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
        if (forgotModal) {
            forgotModal.hide();
        }
    } else {
        alert('Please enter your email address');
    }
};