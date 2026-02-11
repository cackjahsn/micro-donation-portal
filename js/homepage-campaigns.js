// homepage-campaigns.js - Load campaigns on homepage with proper modal handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('Homepage campaigns loader initialized');
    
    // Clean up any leftover modal state on page load
    cleanupModalState();
    
    // Setup login success handler
    setupLoginSuccessHandler();
    
    // Wait a bit for utils to be available
    setTimeout(() => {
        loadHomepageCampaigns();
    }, 500);
});

async function loadHomepageCampaigns() {
    console.log('Loading campaigns for homepage...');
    
    const container = document.getElementById('campaigns-container');
    if (!container) {
        console.error('Campaigns container not found');
        return;
    }
    
    try {
        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading campaigns...</span>
                </div>
                <p class="mt-2">Loading campaigns...</p>
            </div>
        `;
        
        // Get campaigns from API
        const campaigns = await getAllCampaigns();
        
        if (!campaigns || campaigns.length === 0) {
            showNoCampaignsMessage(container);
            return;
        }
        
        // Display campaigns (limit to 6 for homepage)
        displayCampaigns(campaigns.slice(0, 6), container);
        
    } catch (error) {
        console.error('Error loading homepage campaigns:', error);
        showErrorMessage(container, error);
    }
}

    async function getAllCampaigns() {
        console.log('Fetching campaigns for homepage...');
        
        try {
            const data = await utils.fetchAPI('campaigns/get-all.php?only_active=true');
            
            console.log('API response data:', data);
            
            if (data.success) {
                const campaigns = data.campaigns || data.data || [];
                
                console.log('Active campaigns:', campaigns.length);
                
                const transformedCampaigns = campaigns.map(campaign => {
                    const target = parseFloat(campaign.target_amount || campaign.target || 0);
                    const current = parseFloat(campaign.current_amount || campaign.raised || 0);
                    
                    // PRIORITIZE database progress_percentage
                    let progress = parseFloat(campaign.progress_percentage || 0);
                    
                    // Only calculate if database value is 0 or missing
                    if ((!progress || progress === 0) && target > 0) {
                        progress = Math.min(100, (current / target) * 100);
                    }
                    
                    // Round to 1 decimal place
                    progress = Math.round(progress * 10) / 10;
                    
                    return {
                        id: campaign.id,
                        title: campaign.title,
                        description: campaign.description,
                        category: campaign.category,
                        target: target,
                        raised: current,
                        progress: progress, // Use database value first
                        donors: parseInt(campaign.donors_count || campaign.donors || 0),
                        daysLeft: parseInt(campaign.days_left || 30),
                        image: campaign.image_url || campaign.image || 'assets/images/default-campaign.jpg',
                        organizer: campaign.organizer || 'Anonymous',
                        dateCreated: campaign.created_at || campaign.dateCreated || new Date().toISOString(),
                        status: campaign.status || 'active'
                    };
                });
                                
                return transformedCampaigns;
                
            } else {
                throw new Error(data.message || 'Failed to load campaigns');
            }
            
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            utils.showNotification('Could not load campaigns.', 'warning');
            return [];
        }
    }

    function displayCampaigns(campaigns, container) {
        console.log('Displaying campaigns:', campaigns);
        
        if (!campaigns || campaigns.length === 0) {
            showNoCampaignsMessage(container);
            return;
        }
        
        // Filter out non-active campaigns for homepage (extra safety)
        const activeCampaigns = campaigns.filter(campaign => campaign.status === 'active');
        
        console.log('Active campaigns after filter:', activeCampaigns.length);
        
        if (activeCampaigns.length === 0) {
            showNoCampaignsMessage(container);
            return;
        }
        
        let html = '';
        
        // Display only active campaigns (limit to 6 for homepage)
        activeCampaigns.slice(0, 6).forEach(campaign => {
            console.log('Creating card for campaign:', campaign.title, 'ID:', campaign.id);
            html += createCampaignCard(campaign);
        });
        
        container.innerHTML = html;
        
        // Add event listeners to donation buttons
        addDonationButtonListeners();
    }

    // Update the createCampaignCard function in your homepage-campaigns.js
    // Replace your existing createCampaignCard function with this one:

    function createCampaignCard(campaign) {
        // Debug: Check what data we have
        console.log('Creating card with campaign data:', {
            id: campaign.id,
            title: campaign.title,
            raised: campaign.raised,
            target: campaign.target
        });
        
        // Get the correct values
        const raisedAmount = campaign.raised !== undefined ? campaign.raised : (campaign.current_amount || 0);
        const targetAmount = campaign.target !== undefined ? campaign.target : (campaign.target_amount || 1000);
        const donorCount = campaign.donors !== undefined ? campaign.donors : (campaign.donors_count || 0);
        
        // Format currency
        const raised = typeof utils !== 'undefined' && utils.formatCurrency 
            ? utils.formatCurrency(raisedAmount)
            : `RM ${raisedAmount.toFixed(2)}`;
        
        const target = typeof utils !== 'undefined' && utils.formatCurrency 
            ? utils.formatCurrency(targetAmount)
            : `RM ${targetAmount.toFixed(2)}`;
        
        // Calculate progress
        const progress = targetAmount > 0 
            ? Math.min(100, (raisedAmount / targetAmount) * 100)
            : 0;
        const displayProgress = Math.round(progress * 10) / 10;
        
        // Format date
        let dateText = '';
        if (campaign.dateCreated || campaign.created_at) {
            const date = campaign.dateCreated || campaign.created_at;
            if (typeof utils !== 'undefined' && utils.formatRelativeTime) {
                dateText = utils.formatRelativeTime(date);
            } else {
                dateText = new Date(date).toLocaleDateString();
            }
        }
        
        // Fix image path
        let imageUrl = campaign.image || campaign.image_url || 'assets/images/default-campaign.jpg';
        imageUrl = imageUrl.replace(/\\/g, '');
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/') && !imageUrl.startsWith('assets/')) {
            imageUrl = 'assets/' + imageUrl;
        }
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card campaign-card h-100">
                    <div class="card-img-container position-relative">
                        <img src="${imageUrl}" 
                            class="card-img-top" 
                            alt="${campaign.title}"
                            style="height: 200px; object-fit: cover;"
                            onerror="this.src='assets/images/default-campaign.jpg'">
                        <span class="campaign-category badge bg-primary position-absolute top-0 start-0 m-2">
                            ${campaign.category || 'General'}
                        </span>
                        
                        <!-- Quick View Button -->
                        <button onclick="viewCampaignDetails(${campaign.id})" 
                                class="btn btn-sm btn-light position-absolute top-0 end-0 m-2"
                                title="Quick View"
                                style="border-radius: 50%; width: 36px; height: 36px;">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${campaign.title || 'Untitled Campaign'}</h5>
                        <p class="card-text text-muted flex-grow-1">
                            ${campaign.description ? 
                                (campaign.description.length > 100 
                                    ? campaign.description.substring(0, 100) + '...' 
                                    : campaign.description) 
                                : 'No description available.'}
                        </p>
                        
                        <!-- Progress bar -->
                        <div class="campaign-progress mb-3">
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-success" 
                                    role="progressbar" 
                                    style="width: ${displayProgress}%"
                                    aria-valuenow="${displayProgress}" 
                                    aria-valuemin="0" 
                                    aria-valuemax="100">
                                </div>
                            </div>
                            <div class="d-flex justify-content-between mt-2">
                                <small class="text-muted">${displayProgress}% funded</small>
                                <small class="text-muted">${donorCount} donors</small>
                            </div>
                        </div>
                        
                        <!-- Funding info -->
                        <div class="funding-info mb-3">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted d-block">Raised</small>
                                    <strong class="text-success">${raised}</strong>
                                </div>
                                <div class="col-6 text-end">
                                    <small class="text-muted d-block">Goal</small>
                                    <strong>${target}</strong>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action buttons -->
                        <div class="mt-auto">
                            <div class="d-grid gap-2">
                                <div class="row g-2">
                                    <div class="col-6">
                                        <button onclick="viewCampaignDetails(${campaign.id})" 
                                                class="btn btn-outline-primary w-100">
                                            <i class="fas fa-info-circle me-2"></i>View Details
                                        </button>
                                    </div>
                                    <div class="col-6">
                                        <a href="donation-page.html?campaign=${campaign.id}" 
                                        class="btn btn-primary w-100 btn-donate"
                                        data-campaign-id="${campaign.id}">
                                            <i class="fas fa-heart me-2"></i>Donate
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="card-footer bg-transparent border-0 mt-3 pt-0 px-0">
                            <small class="text-muted">
                                <i class="far fa-clock me-1"></i>${dateText || 'Recently'}
                                ${campaign.organizer ? 
                                    `<span class="ms-2"><i class="fas fa-users me-1"></i>${campaign.organizer}</span>` 
                                    : ''}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

function addDonationButtonListeners() {
    // Remove any existing listeners first
    document.querySelectorAll('.btn-donate').forEach(button => {
        // Clone button to remove old event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Add new listeners
    document.querySelectorAll('.btn-donate').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Always prevent default
            
            const campaignId = this.getAttribute('data-campaign-id');
            const campaignTitle = this.getAttribute('data-campaign-title');
            
            console.log('Donate button clicked for:', campaignTitle, 'ID:', campaignId);
            
            // Check if user is logged in
            if (typeof auth !== 'undefined' && auth.isAuthenticated && !auth.isAuthenticated()) {
                // User is not logged in, show login modal
                showLoginModal(campaignId, campaignTitle);
            } else {
                // User is logged in, proceed to donation page
                window.location.href = `donation-page.html?id=${campaignId}`;
            }
        });
    });
}

function showLoginModal(campaignId, campaignTitle) {
    console.log('Showing login modal for campaign:', campaignTitle);
    
    // Store campaign ID for redirect after login
    if (campaignId) {
        sessionStorage.setItem('redirectAfterLogin', `donation-page.html?id=${campaignId}`);
        sessionStorage.setItem('campaignTitle', campaignTitle || '');
    }
    
    // First, check if we should use Bootstrap modal or custom modal
    const loginModal = document.getElementById('loginModal');
    
    if (loginModal && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        // Use Bootstrap modal
        useBootstrapModal(loginModal);
    } else {
        // Use custom modal
        useCustomModal(campaignTitle);
    }
}

function useBootstrapModal(loginModal) {
    console.log('Using Bootstrap modal');
    
    try {
        // Get or create modal instance
        let modalInstance = bootstrap.Modal.getInstance(loginModal);
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(loginModal, {
                backdrop: true, // Can click outside to close
                keyboard: true, // Can use ESC to close
                focus: true
            });
        }
        
        // Clear any existing close handlers
        const closeButtons = loginModal.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
        closeButtons.forEach(btn => {
            // Remove existing event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        
        // Listen for hidden event to clean up
        loginModal.addEventListener('hidden.bs.modal', function() {
            console.log('Bootstrap modal hidden - cleaning up');
            cleanupModalState();
            // Remove redirect since modal was closed
            sessionStorage.removeItem('redirectAfterLogin');
            sessionStorage.removeItem('campaignTitle');
        });
        
        // Show the modal
        modalInstance.show();
        
    } catch (error) {
        console.error('Error with Bootstrap modal:', error);
        useCustomModal();
    }
}

function useCustomModal(campaignTitle) {
    console.log('Using custom modal');
    
    // Remove existing custom modal
    const existingModal = document.getElementById('customLoginModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="customLoginModal" class="custom-login-modal">
            <div class="custom-modal-backdrop"></div>
            <div class="custom-modal-dialog">
                <div class="custom-modal-content">
                    <div class="custom-modal-header">
                        <h5 class="custom-modal-title">
                            <i class="fas fa-sign-in-alt me-2"></i>Login Required
                        </h5>
                        <button type="button" class="custom-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="custom-modal-body">
                        <div class="alert alert-info mb-3">
                            <i class="fas fa-info-circle me-2"></i>
                            ${campaignTitle ? 
                                `You need to login to donate to "${campaignTitle}"` : 
                                'You need to login to make a donation'}
                        </div>
                        <p class="mb-3">Please login or register to continue with your donation.</p>
                    </div>
                    <div class="custom-modal-footer">
                        <button type="button" class="btn btn-secondary btn-cancel">
                            <i class="fas fa-times me-2"></i>Cancel
                        </button>
                        <a href="register.html" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt me-2"></i>Go to Login
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add CSS if not already added
    if (!document.querySelector('#custom-modal-styles')) {
        const styles = `
            <style id="custom-modal-styles">
                .custom-login-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .custom-modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .custom-modal-dialog {
                    position: relative;
                    width: 90%;
                    max-width: 500px;
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                }
                
                @keyframes slideIn {
                    from { 
                        transform: translateY(-50px); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateY(0); 
                        opacity: 1; 
                    }
                }
                
                .custom-modal-content {
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    overflow: hidden;
                }
                
                .custom-modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #dee2e6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #f8f9fa;
                }
                
                .custom-modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #333;
                }
                
                .custom-modal-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    color: #6c757d;
                    cursor: pointer;
                    padding: 5px;
                    line-height: 1;
                }
                
                .custom-modal-close:hover {
                    color: #000;
                }
                
                .custom-modal-body {
                    padding: 20px;
                }
                
                .custom-modal-footer {
                    padding: 20px;
                    border-top: 1px solid #dee2e6;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    background-color: #f8f9fa;
                }
                
                .btn-cancel:hover {
                    background-color: #6c757d;
                    color: white;
                }
                
                /* Prevent body scroll when modal is open */
                body.modal-open {
                    overflow: hidden;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // Add close functionality
    const modal = document.getElementById('customLoginModal');
    const closeBtn = modal.querySelector('.custom-modal-close');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const backdrop = modal.querySelector('.custom-modal-backdrop');
    
    const closeModal = () => {
        // Add fade out animation
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            modal.remove();
            // Remove redirect storage
            sessionStorage.removeItem('redirectAfterLogin');
            sessionStorage.removeItem('campaignTitle');
            // Restore body scroll
            document.body.classList.remove('modal-open');
        }, 300);
    };
    
    // Add event listeners
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    // Prevent body scroll
    document.body.classList.add('modal-open');
    
    // Close with ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Clean up ESC listener when modal closes
    modal._escHandler = escHandler;
}

function cleanupModalState() {
    console.log('Cleaning up modal state');
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    
    // Remove modal backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
    
    // Remove any inline styles added by Bootstrap
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Remove custom modal if exists
    const customModal = document.getElementById('customLoginModal');
    if (customModal) {
        customModal.remove();
    }
}

function setupLoginSuccessHandler() {
    // Handle successful login - redirect to stored campaign
    if (typeof auth !== 'undefined') {
        window.addEventListener('authchange', function(e) {
            if (e.detail.authenticated) {
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                const campaignTitle = sessionStorage.getItem('campaignTitle');
                
                if (redirectUrl) {
                    console.log('User logged in, redirecting to:', redirectUrl);
                    
                    // Show success message
                    if (typeof utils !== 'undefined' && utils.showNotification) {
                        utils.showNotification(
                            campaignTitle ? 
                                `Login successful! Redirecting to ${campaignTitle}...` : 
                                'Login successful! Redirecting...',
                            'success'
                        );
                    }
                    
                    // Clean up modal state
                    cleanupModalState();
                    
                    // Redirect after delay
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                        sessionStorage.removeItem('redirectAfterLogin');
                        sessionStorage.removeItem('campaignTitle');
                    }, 1500);
                }
            }
        });
    }
}

function getSampleCampaigns() {
    return [
        {
            id: 1,
            title: "Sample Campaign 1",
            description: "Help support this important initiative",
            category: "education",
            target: 5000,
            raised: 1250,
            donors: 24,
            image: "assets/images/campaign1.jpg",
            dateCreated: new Date().toISOString()
        },
        {
            id: 2,
            title: "Sample Campaign 2",
            description: "Make a difference in our community",
            category: "community",
            target: 3000,
            raised: 1800,
            donors: 42,
            image: "assets/images/campaign2.jpg",
            dateCreated: new Date().toISOString()
        },
        {
            id: 3,
            title: "Sample Campaign 3",
            description: "Support local environmental efforts",
            category: "environment",
            target: 8000,
            raised: 3200,
            donors: 18,
            image: "assets/images/campaign3.jpg",
            dateCreated: new Date().toISOString()
        }
    ];
}

function showNoCampaignsMessage(container) {
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="empty-state">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <h4>No Active Campaigns</h4>
                <p class="text-muted">There are currently no active campaigns. Check back soon!</p>
                <a href="pages/campaigns.html" class="btn btn-outline-primary mt-2">
                    Browse All Campaigns
                </a>
            </div>
        </div>
    `;
}

function showErrorMessage(container, error) {
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="error-state">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4>Unable to Load Campaigns</h4>
                <p class="text-muted">We're having trouble loading campaigns right now.</p>
                <button onclick="loadHomepageCampaigns()" class="btn btn-outline-primary mt-2">
                    <i class="fas fa-redo me-2"></i>Try Again
                </button>
            </div>
        </div>
    `;
}

// Add this function to test the API response
async function testApiResponse() {
    try {
        console.log('Testing API response structure...');
        const response = await fetch(utils.getApiUrl('campaigns/get-all.php?only_active=true'));
        const text = await response.text();
        console.log('Raw API response:', text);
        
        const data = JSON.parse(text);
        console.log('Parsed API response:', data);
        
        if (data.success) {
            console.log('Campaigns array:', data.campaigns || data.data);
            console.log('First campaign:', data.campaigns ? data.campaigns[0] : data.data[0]);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Add this function to js/homepage-campaigns.js

/**
 * View campaign details - opens modal with campaign information
 * @param {number|string} campaignId - The campaign ID
 */
window.viewCampaignDetails = async function(campaignId) {
    console.log('Viewing campaign details from homepage:', campaignId);
    
    if (typeof CampaignModal !== 'undefined') {
        await CampaignModal.showCampaignDetails(campaignId);
    } else {
        console.error('CampaignModal not loaded yet');
        // Load the script dynamically
        const script = document.createElement('script');
        script.src = 'js/campaign-modal.js';
        script.onload = async function() {
            if (typeof CampaignModal !== 'undefined') {
                await CampaignModal.showCampaignDetails(campaignId);
            }
        };
        document.head.appendChild(script);
    }
};

// Call it for debugging (remove after fixing)
document.addEventListener('DOMContentLoaded', function() {
    // Run test after a short delay
    setTimeout(testApiResponse, 1000);
});

// Make functions available globally for retry functionality
window.loadHomepageCampaigns = loadHomepageCampaigns;
window.cleanupModalState = cleanupModalState;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadHomepageCampaigns,
        getAllCampaigns,
        showLoginModal,
        cleanupModalState
    };
}