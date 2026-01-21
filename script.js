// script.js - Main JavaScript for Homepage (Updated with Authentication)
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModalElement = document.getElementById('loginModal');
    const loginModal = loginModalElement ? new bootstrap.Modal(loginModalElement) : null;
    const campaignsContainer = document.getElementById('campaignsContainer');

    // Initialize fixed navbar
    if (typeof NavbarManager !== 'undefined') {
        window.navbarManager = new NavbarManager();
    }
    
    // Event Listeners for navigation
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginModal) {
                loginModal.show();
            }
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'register.html';
        });
    }
    
    // Setup password toggle for login modal
    setupLoginModal();
    
    // Load Campaigns
    if (campaignsContainer) {
        loadCampaigns();
    }
    
    
    // Function to setup login modal enhancements
    function setupLoginModal() {
        const loginToggleBtn = document.getElementById('loginTogglePassword');
        if (loginToggleBtn) {
            loginToggleBtn.addEventListener('click', function() {
                const passwordInput = document.getElementById('loginPassword');
                if (passwordInput) {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    this.innerHTML = type === 'password' ? 
                        '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
                }
            });
        }
        
        // Forgot password link
        const forgotPasswordLink = document.querySelector('a[onclick="showForgotPassword()"]');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                showForgotPassword();
            });
        }
    }
    
    // Function to load campaigns
    async function loadCampaigns() {
        try {
            // For now, using static data. Replace with API call later
            const campaigns = [
                {
                    id: 1,
                    title: "Emergency Relief Fund",
                    description: "Support families affected by recent floods",
                    target: 50000,
                    raised: 32500,
                    progress: 65,
                    image: "assets/images/campaign1.jpg",
                    category: "Emergency",
                    urgency: "High",
                    donors: 127
                },
                {
                    id: 2,
                    title: "Student Scholarship Program",
                    description: "Help underprivileged students continue their education",
                    target: 30000,
                    raised: 18500,
                    progress: 62,
                    image: "assets/images/campaign2.jpg",
                    category: "Education",
                    urgency: "Medium",
                    donors: 89
                },
                {
                    id: 3,
                    title: "Community Health Center",
                    description: "Renovate and equip local health center",
                    target: 75000,
                    raised: 42000,
                    progress: 56,
                    image: "assets/images/campaign3.jpg",
                    category: "Health",
                    urgency: "High",
                    donors: 156
                }
            ];
            
            displayCampaigns(campaigns);
        } catch (error) {
            console.error('Error loading campaigns:', error);
            campaignsContainer.innerHTML = '<div class="col-12"><p class="text-center text-danger">Unable to load campaigns. Please try again later.</p></div>';
        }
    }
    
    // Function to display campaigns
    function displayCampaigns(campaigns) {
        campaignsContainer.innerHTML = '';
        
        campaigns.forEach(campaign => {
            // Determine urgency badge
            let urgencyBadge = '';
            if (campaign.urgency === "High") {
                urgencyBadge = '<span class="badge bg-danger position-absolute top-2 start-2"><i class="fas fa-fire me-1"></i>Urgent</span>';
            } else if (campaign.urgency === "Medium") {
                urgencyBadge = '<span class="badge bg-warning position-absolute top-2 start-2">Ending Soon</span>';
            }
            
            const campaignCard = `
                <div class="col-md-4">
                    <div class="card campaign-card">
                        <div class="position-relative">
                            <img src="${campaign.image}" class="card-img-top" alt="${campaign.title}" height="200">
                            ${urgencyBadge}
                            <span class="badge bg-primary position-absolute bottom-2 start-2">${campaign.category}</span>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${campaign.title}</h5>
                            <p class="card-text">${campaign.description}</p>
                            
                            <!-- Campaign Stats -->
                            <div class="campaign-stats mb-3">
                                <div class="stat">
                                    <i class="fas fa-users text-primary"></i>
                                    <span>${campaign.donors} donors</span>
                                </div>
                                <div class="stat">
                                    <i class="fas fa-calendar-alt text-info"></i>
                                    <span>7 days left</span>
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
                                <a href="donation-page.html?campaign=${campaign.id}" class="btn btn-donate btn-lg">
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
    
    // Function to show forgot password modal
    function showForgotPassword() {
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
                                        onclick="sendResetLink()">
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
    }
    
    // Function to send reset link
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
    
    // Check donation buttons and add auth check
    setupDonationButtons();
    
    // Function to setup donation buttons with auth check
    function setupDonationButtons() {
        // Add event listener to all donation buttons
        document.addEventListener('click', function(e) {
            if (e.target.closest('.btn-donate')) {
                e.preventDefault();
                
                // Check if user is authenticated
                if (!auth.isAuthenticated()) {
                    // Show login modal
                    if (loginModal) {
                        loginModal.show();
                        
                        // Store the donation URL to redirect after login
                        const donateUrl = e.target.closest('.btn-donate').href;
                        sessionStorage.setItem('redirectAfterLogin', donateUrl);
                        
                        // Show message
                        auth.showNotification('Please login to make a donation', 'warning');
                    }
                } else {
                    // User is authenticated, proceed to donation
                    const donateUrl = e.target.closest('.btn-donate').href;
                    window.location.href = donateUrl;
                }
            }
        });
    }
    
    // Check if there's a redirect URL stored after login
    checkRedirectAfterLogin();
    
    // Function to check and handle redirect after login
    function checkRedirectAfterLogin() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl && auth.isAuthenticated()) {
            sessionStorage.removeItem('redirectAfterLogin');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 500);
        }
    }       
    
});

// Global functions for use in HTML onclick attributes
function showForgotPassword() {
    // This function is now handled by the event listener above
}

function sendResetLink() {
    // This function is now handled by the window.sendResetLink above
}

// Navbar Scroll Behavior
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
        
        // Optional: Hide navbar on scroll down, show on scroll up
        // Uncomment if you want this behavior
        /*
        if (scrollTop > this.lastScrollTop && scrollTop > this.navbarHeight) {
            // Scroll down - hide navbar
            this.navbar.style.transform = 'translateY(-100%)';
        } else {
            // Scroll up - show navbar
            this.navbar.style.transform = 'translateY(0)';
        }
        */
        
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
    
    // Public method to manually update (if navbar height changes dynamically)
    update() {
        this.navbarHeight = this.navbar.offsetHeight;
        this.updateBodyPadding();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navbarManager = new NavbarManager();
});