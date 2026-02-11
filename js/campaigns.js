// Campaign Management Module
class CampaignManager {
    constructor() {
        this.campaigns = [];
        this.categories = [
            'education',
            'health',
            'emergency',
            'community',
            'environment'
        ];
        
        // Initialize utils if available
        if (typeof utils !== 'undefined') {
            this.utils = utils;
        } else {
            // Fallback utility methods
            this.utils = {
                getStorage: (key) => {
                    const value = localStorage.getItem(`micro_donation_${key}`);
                    if (!value && key === 'temp_campaigns') {
                        const legacyValue = localStorage.getItem('temp_campaigns');
                        if (legacyValue) {
                            localStorage.setItem(`micro_donation_${key}`, legacyValue);
                            localStorage.removeItem('temp_campaigns');
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
                }
            };
        }
        
        this.init();
    }
    
    init() {
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchCampaigns');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterCampaigns(e.target.value));
        }
        
        // Category filter
        const categoryFilter = document.getElementById('filterCategory');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.filterByCategory(e.target.value));
        }
        
        // Sort buttons
        document.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', (e) => this.sortCampaigns(e.target.dataset.sort));
        });
    }
    
    // campaigns.js - Update getAllCampaigns method
    async getAllCampaigns() {
        try {
            // Show loading state
            console.log('Fetching campaigns from API...');
            
            // Use utils.fetchAPI with only_active parameter
            const data = await utils.fetchAPI('campaigns/get-all.php?only_active=true');
            
            console.log('Parsed result:', data);
            
            if (data.success && Array.isArray(data.campaigns)) {
                // Transform database campaigns to match frontend format
                this.campaigns = data.campaigns.map(campaign => this.transformCampaignData(campaign));
                return this.campaigns;
            } else {
                console.log('No campaigns data in response, returning empty array');
                this.campaigns = [];
                return [];
            }
            
        } catch (error) {
            console.error('Error fetching campaigns from API:', error);
            // Use utils to handle the error
            utils.handleApiError(error, 'Failed to load campaigns');
            this.campaigns = [];
            return [];
        }
    }

    // Optional: Create a separate method to get ALL campaigns (including cancelled) for admin
    async getAllCampaignsForAdmin() {
        try {
            // Don't use only_active parameter for admin
            const data = await utils.fetchAPI('campaigns/get-all.php');
            
            if (data.success && Array.isArray(data.campaigns)) {
                return data.campaigns.map(campaign => this.transformCampaignData(campaign));
            }
            return [];
            
        } catch (error) {
            console.error('Error fetching all campaigns:', error);
            return [];
        }
    }
        
    // campaigns.js - Remove or modify loadSampleCampaigns
    loadSampleCampaigns() {
        // Return empty array instead of fake data
        console.log('No campaigns available');
        return [];
    }
    
    async getCampaignById(id) {
        try {
            // Try API first
            const response = await fetch(`../backend/api/campaigns/get-single.php?id=${id}`);
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.campaign) {
                    return this.transformCampaignData(result.campaign);
                }
            }
            
            // Fall back to local data
            const campaign = this.campaigns.find(c => c.id === parseInt(id));
            return new Promise((resolve, reject) => {
                if (campaign) {
                    resolve(campaign);
                } else {
                    reject(new Error('Campaign not found'));
                }
            });
            
        } catch (error) {
            console.error('Error fetching campaign:', error);
            
            // Fall back to local data
            const campaign = this.campaigns.find(c => c.id === parseInt(id));
            return new Promise((resolve, reject) => {
                if (campaign) {
                    resolve(campaign);
                } else {
                    reject(new Error('Campaign not found'));
                }
            });
        }
    }
    
    async getFeaturedCampaigns() {
        // First try to get all campaigns
        const campaigns = await this.getAllCampaigns();
        
        // Filter featured campaigns
        const featured = campaigns.filter(c => c.featured);
        
        return new Promise(resolve => {
            resolve(featured);
        });
    }
    
    async getCampaignsByCategory(category) {
        if (!category) return this.getAllCampaigns();
        
        const campaigns = await this.getAllCampaigns();
        const filtered = campaigns.filter(c => c.category === category);
        
        return new Promise(resolve => {
            resolve(filtered);
        });
    }
    
    async createCampaignInDB(campaignData) {
        try {
            const response = await fetch('../backend/api/campaigns/create.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(campaignData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Transform and add to local array for immediate display
                const transformedCampaign = this.transformCampaignData(result.campaign);
                this.campaigns.unshift(transformedCampaign);
                return {
                    success: true,
                    campaign: transformedCampaign,
                    message: 'Campaign submitted for admin review'
                };
            } else {
                throw new Error(result.message || 'Failed to create campaign');
            }
        } catch (error) {
            throw new Error('Network error: ' + error.message);
        }
    }

    async createCampaign(campaignData) {
        // Validate campaign data
        if (!this.validateCampaignData(campaignData)) {
            throw new Error('Invalid campaign data');
        }
        
        // Check if user is logged in
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('Please login to create a campaign');
        }
        
        // Prepare data for database
        const dbData = {
            ...campaignData,
            organizer: user.name || 'Anonymous',
            organizer_email: user.email,
            status: 'pending', // Admin needs to approve
            featured: false
        };
        
        try {
            // Try to save to database
            return await this.createCampaignInDB(dbData);
        } catch (error) {
            // If API fails, save locally as temporary campaign
            console.warn('API failed, saving campaign locally:', error);
            
            const tempCampaign = {
                ...dbData,
                id: Date.now(),
                raised: 0,
                progress: 0,
                donors: 0,
                daysLeft: dbData.days_left || 30,
                image: dbData.image_url || '/micro-donation-portal/assets/images/default-campaign.jpg',
                dateCreated: new Date().toISOString().split('T')[0],
                isTemporary: true
            };
            
            // Add to campaigns array
            this.campaigns.unshift(tempCampaign);
            
            // Save to storage
            this.saveTempCampaign(tempCampaign);
            
            return {
                success: true,
                campaign: tempCampaign,
                message: 'Campaign saved locally. Will sync when online.'
            };
        }
    }

    // In campaigns.js - FIX getCurrentUser method to use utils
    getCurrentUser() {
        if (typeof auth !== 'undefined' && auth.getCurrentUser) {
            return auth.getCurrentUser();
        }
        
        if (typeof utils !== 'undefined' && utils.getCurrentUser) {
            return utils.getCurrentUser();
        }
        
        // Fallback to localStorage check
        let userData = localStorage.getItem('micro_donation_user');
        
        // Fallback to old key
        if (!userData) {
            userData = localStorage.getItem('communitygive_user');
            if (userData) {
                localStorage.setItem('micro_donation_user', userData);
            }
        }
        
        return userData ? JSON.parse(userData) : null;
    }
    
    validateCampaignData(data) {
        const requiredFields = ['title', 'description', 'category', 'target'];
        
        for (const field of requiredFields) {
            if (!data[field]) {
                return false;
            }
        }
        
        if (data.target < 100) {
            return false;
        }
        
        if (!this.categories.includes(data.category)) {
            return false;
        }
        
        return true;
    }
    
    filterCampaigns(searchTerm) {
        if (!searchTerm) return this.campaigns;
        
        const term = searchTerm.toLowerCase();
        return this.campaigns.filter(campaign => 
            campaign.title.toLowerCase().includes(term) ||
            campaign.description.toLowerCase().includes(term) ||
            campaign.organizer.toLowerCase().includes(term)
        );
    }
    
    filterByCategory(category) {
        if (!category) return this.campaigns;
        return this.campaigns.filter(campaign => campaign.category === category);
    }
    
    sortCampaigns(sortBy) {
        const sorted = [...this.campaigns];
        
        switch (sortBy) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
                break;
            case 'ending':
                sorted.sort((a, b) => a.daysLeft - b.daysLeft);
                break;
            case 'popular':
                sorted.sort((a, b) => b.donors - a.donors);
                break;
            case 'progress':
                sorted.sort((a, b) => b.progress - a.progress);
                break;
            default:
                break;
        }
        
        return sorted;
    }
    
    getCategoryLabel(category) {
        const labels = {
            'education': 'Education',
            'health': 'Health & Medical',
            'emergency': 'Emergency Relief',
            'community': 'Community Development',
            'environment': 'Environment'
        };
        
        return labels[category] || category;
    }
    
    getCategoryColor(category) {
        const colors = {
            'education': 'primary',
            'health': 'danger',
            'emergency': 'warning',
            'community': 'success',
            'environment': 'info'
        };
        
        return colors[category] || 'secondary';
    }
    
    transformCampaignData(dbCampaign) {
        const target = parseFloat(dbCampaign.target_amount || dbCampaign.target || 0);
        const current = parseFloat(dbCampaign.current_amount || dbCampaign.raised || 0);
        
        // PRIORITIZE database progress_percentage (now it will be correct)
        let progress = parseFloat(dbCampaign.progress_percentage || 0);
        
        // Only calculate if database value is 0 or missing, AND we have valid target
        if ((!progress || progress === 0) && target > 0) {
            progress = Math.min(100, (current / target) * 100);
        }
        
        // Always round to 1 decimal place for consistency
        progress = Math.round(progress * 10) / 10;
        
        return {
            id: dbCampaign.id,
            title: dbCampaign.title,
            description: dbCampaign.description,
            category: dbCampaign.category,
            target: target,
            raised: current,
            progress: progress, // Now uses corrected database value first
            donors: parseInt(dbCampaign.donors_count || dbCampaign.donors || 0),
            daysLeft: parseInt(dbCampaign.days_left || 30),
            image: dbCampaign.image_url || dbCampaign.image || 'assets/images/default-campaign.jpg',
            organizer: dbCampaign.organizer || 'Anonymous',
            dateCreated: dbCampaign.created_at || dbCampaign.dateCreated || new Date().toISOString(),
            featured: dbCampaign.featured || false,
            status: dbCampaign.status || 'active'
        };
    }
            
    saveTempCampaign(campaign) {
        const tempCampaigns = this.utils.getStorage('temp_campaigns') || [];
        tempCampaigns.push(campaign);
        this.utils.setStorage('temp_campaigns', tempCampaigns);
    }
    
    loadTempCampaigns() {
        const tempCampaigns = this.utils.getStorage('temp_campaigns') || [];
        
        if (tempCampaigns.length > 0) {
            // Merge temp campaigns with existing campaigns
            tempCampaigns.forEach(tempCampaign => {
                if (!this.campaigns.some(c => c.id === tempCampaign.id)) {
                    this.campaigns.push(tempCampaign);
                }
            });
        }
        
        return tempCampaigns;
    }
    
    // campaigns.js - Update renderCampaignCard method
    renderCampaignCard(campaign) {
        const categoryLabel = this.getCategoryLabel(campaign.category);
        const categoryColor = this.getCategoryColor(campaign.category);
        
        // Determine if campaign is active
        const isActive = campaign.status === 'active';
        const isPending = campaign.status === 'pending';
        const isCancelled = campaign.status === 'cancelled';
        const isCompleted = campaign.status === 'completed';
        
        // Status badge
        let statusBadge = '';
        if (isPending) {
            statusBadge = '<span class="badge bg-warning ms-2">Pending</span>';
        } else if (isCancelled) {
            statusBadge = '<span class="badge bg-secondary ms-2">Cancelled</span>';
        } else if (isCompleted) {
            statusBadge = '<span class="badge bg-info ms-2">Completed</span>';
        }
        
        // Use utils.formatCurrency if available
        const raisedAmount = typeof utils !== 'undefined' && utils.formatCurrency ? 
            utils.formatCurrency(campaign.raised) : `RM ${campaign.raised.toLocaleString()}`;
        const targetAmount = typeof utils !== 'undefined' && utils.formatCurrency ? 
            utils.formatCurrency(campaign.target) : `RM ${campaign.target.toLocaleString()}`;
        
        return `
            <div class="col-md-6 col-lg-4 mb-4 stagger-item">
                <div class="card campaign-card h-100 hover-lift ${!isActive ? 'opacity-75' : ''}">
                    <img src="${campaign.image}" class="card-img-top" alt="${campaign.title}" height="200">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span class="badge bg-${categoryColor}">${categoryLabel}</span>
                                ${statusBadge}
                            </div>
                            ${isActive ? `<small class="text-muted">${campaign.daysLeft} days left</small>` : ''}
                        </div>
                        
                        <h5 class="card-title">${campaign.title}</h5>
                        <p class="card-text text-muted">${campaign.description.substring(0, 100)}...</p>
                        
                        ${isActive ? `
                        <div class="mb-3">
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-success" style="width: ${campaign.progress}%"></div>
                            </div>
                            <div class="d-flex justify-content-between mt-1">
                                <small><strong>${campaign.progress}%</strong> funded</small>
                                <small><strong>${campaign.donors}</strong> donors</small>
                            </div>
                        </div>
                        
                        <div class="row align-items-center">
                            <div class="col-7">
                                <div class="fw-bold text-success">${raisedAmount}</div>
                                <small class="text-muted">raised of ${targetAmount}</small>
                            </div>
                            <div class="col-5 text-end">
                                <a href="donation-page.html?campaign=${campaign.id}" 
                                class="btn btn-success btn-sm">
                                    <i class="fas fa-heart"></i> Donate
                                </a>
                            </div>
                        </div>
                        ` : `
                        <div class="alert alert-${isCompleted ? 'info' : 'secondary'} mb-3">
                            <small><i class="fas fa-info-circle me-1"></i>This campaign is ${campaign.status}.</small>
                        </div>
                        
                        <div class="row align-items-center">
                            <div class="col-12">
                                <div class="fw-bold text-muted">${raisedAmount}</div>
                                <small class="text-muted">raised of ${targetAmount}</small>
                            </div>
                        </div>
                        `}
                        
                        <div class="mt-3 pt-3 border-top">
                            <small class="text-muted">
                                <i class="fas fa-user-circle"></i> Organized by ${campaign.organizer}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // campaigns.js - Update renderCampaigns method
    async renderCampaigns(containerId, filter = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Show loading
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading campaigns...</span>
                </div>
                <p class="mt-2">Loading campaigns...</p>
            </div>
        `;
        
        try {
            let campaigns = await this.getAllCampaigns();
            
            // IMPORTANT: Filter out cancelled and completed campaigns
            campaigns = campaigns.filter(c => 
                c.status !== 'cancelled' && 
                c.status !== 'completed'
            );
            
            // Apply additional filters if specified
            if (filter.category) {
                campaigns = campaigns.filter(c => c.category === filter.category);
            }
            
            if (filter.featured) {
                campaigns = campaigns.filter(c => c.featured);
            }
            
            if (filter.search) {
                const term = filter.search.toLowerCase();
                campaigns = campaigns.filter(campaign => 
                    campaign.title.toLowerCase().includes(term) ||
                    campaign.description.toLowerCase().includes(term) ||
                    campaign.organizer.toLowerCase().includes(term)
                );
            }
            
            if (filter.sort) {
                campaigns = this.sortCampaigns(filter.sort, campaigns);
            }
            
            // Render campaigns
            if (campaigns.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h4>No campaigns found</h4>
                        <p class="text-muted">There are currently no active campaigns. Check back soon!</p>
                    </div>
                `;
            } else {
                container.innerHTML = campaigns.map(campaign => 
                    this.renderCampaignCard(campaign)
                ).join('');
            }
            
        } catch (error) {
            console.error('Error rendering campaigns:', error);
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h4>Error loading campaigns</h4>
                    <p class="text-muted">Please try again later</p>
                    <button class="btn btn-outline-primary mt-2" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
        
    // Overloaded sortCampaigns for external array
    sortCampaigns(sortBy, campaigns = null) {
        const sorted = campaigns ? [...campaigns] : [...this.campaigns];
        
        switch (sortBy) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
                break;
            case 'ending':
                sorted.sort((a, b) => a.daysLeft - b.daysLeft);
                break;
            case 'popular':
                sorted.sort((a, b) => b.donors - a.donors);
                break;
            case 'progress':
                sorted.sort((a, b) => b.progress - a.progress);
                break;
            default:
                break;
        }
        
        return sorted;
    }
    
    // Update campaign progress (simulate donation)
    async updateCampaignProgress(campaignId, amount) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        
        if (!campaign) {
            throw new Error('Campaign not found');
        }
        
        // Update campaign data
        campaign.raised += amount;
        campaign.progress = Math.min(100, Math.round((campaign.raised / campaign.target) * 100));
        campaign.donors += 1;
        
        // If it's a real campaign (not temporary), update database
        if (!campaign.isTemporary) {
            try {
                await fetch('micro-donation-portal/backend/api/campaigns/update.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: campaignId,
                        raised: campaign.raised,
                        donors: campaign.donors,
                        progress: campaign.progress
                    })
                });
            } catch (error) {
                console.warn('Failed to update campaign in database:', error);
            }
        }
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    campaign: campaign,
                    message: 'Campaign updated successfully'
                });
            }, 500);
        });
    }
}

    // campaigns.js - Add this function
    async function loadCampaignsStats() {
        try {
            // Get statistics without filtering (to get all stats)
            const data = await utils.fetchAPI('campaigns/get-all.php');
            
            if (data.success && data.stats) {
                const stats = data.stats;
                
                // Update the stats display on campaigns page
                updateStatsDisplay(stats);
                
                return stats;
            }
        } catch (error) {
            console.error('Error loading campaign stats:', error);
            utils.handleApiError(error, 'Could not load statistics');
        }
    }

    function updateStatsDisplay(stats) {
        // Update campaigns page stats
        const campaignCountElement = document.querySelector('.stats-item:first-child strong');
        const totalFundedElement = document.querySelector('.stats-item:nth-child(2) strong');
        
        if (campaignCountElement) {
            campaignCountElement.textContent = stats.total_active || 0;
        }
        
        if (totalFundedElement) {
            totalFundedElement.textContent = `RM${(stats.total_funded || 0).toFixed(2)}`;
        }
        
        // Also update any other stats displays
        document.querySelectorAll('.campaign-count').forEach(el => {
            el.textContent = stats.total_active || 0;
        });
        
        document.querySelectorAll('.total-funded').forEach(el => {
            el.textContent = `RM${(stats.total_funded || 0).toFixed(2)}`;
        });
    }

// Initialize campaign manager
const campaignManager = new CampaignManager();

// Global function to load all campaigns
async function loadAllCampaigns() {
    await campaignManager.renderCampaigns('campaignsGrid');
}

// Global function to load featured campaigns
async function loadFeaturedCampaigns() {
    await campaignManager.renderCampaigns('campaignsContainer', { featured: true });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CampaignManager };
}