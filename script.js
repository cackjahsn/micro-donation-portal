// script.js - Main JavaScript for Homepage (Updated with Authentication)
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModalElement = document.getElementById('loginModal');
    const loginModal = loginModalElement ? new bootstrap.Modal(loginModalElement) : null;
    const campaignsContainer = document.getElementById('campaignsContainer');
    
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
                    image: "assets/images/campaign1.jpg"
                },
                {
                    id: 2,
                    title: "Student Scholarship Program",
                    description: "Help underprivileged students continue their education",
                    target: 30000,
                    raised: 18500,
                    progress: 62,
                    image: "assets/images/campaign2.jpg"
                },
                {
                    id: 3,
                    title: "Community Health Center",
                    description: "Renovate and equip local health center",
                    target: 75000,
                    raised: 42000,
                    progress: 56,
                    image: "assets/images/campaign3.jpg"
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
            const campaignCard = `
                <div class="col-md-4">
                    <div class="card campaign-card">
                        <img src="${campaign.image}" class="card-img-top" alt="${campaign.title}" height="200">
                        <div class="card-body">
                            <h5 class="card-title">${campaign.title}</h5>
                            <p class="card-text">${campaign.description}</p>
                            
                            <div class="mb-3">
                                <strong>Raised: RM${campaign.raised.toLocaleString()}</strong>
                                <span class="float-end">Target: RM${campaign.target.toLocaleString()}</span>
                            </div>
                            
                            <div class="progress">
                                <div class="progress-bar bg-success" style="width: ${campaign.progress}%"></div>
                            </div>
                            
                            <div class="text-center mt-3">
                                <a href="donation-page.html?campaign=${campaign.id}" class="btn btn-donate btn-lg">
                                    <i class="fas fa-heart"></i> Donate Now
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