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
    
    async getAllCampaigns() {
        try {
            // Try to fetch from API first
            const response = await fetch('/micro-donation-portal/backend/api/campaigns/get-all.php');
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.campaigns) {
                    // Transform database data to match frontend format
                    this.campaigns = result.campaigns.map(campaign => ({
                        id: campaign.id,
                        title: campaign.title,
                        description: campaign.description,
                        category: campaign.category,
                        target: parseFloat(campaign.target),
                        raised: parseFloat(campaign.raised || 0),
                        progress: parseFloat(campaign.progress || 0),
                        donors: parseInt(campaign.donors || 0),
                        daysLeft: parseInt(campaign.daysLeft || 30),
                        image: campaign.image || '/micro-donation-portal/assets/images/default-campaign.jpg',
                        organizer: campaign.organizer || 'Anonymous',
                        dateCreated: campaign.dateCreated || new Date().toISOString().split('T')[0],
                        featured: campaign.featured || false,
                        status: campaign.status || 'active'
                    }));
                    
                    return this.campaigns;
                }
            }
            
            // If API fails, fall back to sample data
            console.warn('API call failed, using sample campaigns');
            return this.loadSampleCampaigns();
            
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            // Fall back to sample data
            return this.loadSampleCampaigns();
        }
    }
    
    loadSampleCampaigns() {
        this.campaigns = [
            {
                id: 1,
                title: "Emergency Relief Fund",
                description: "Support families affected by recent floods in Johor. Help provide food, shelter, and medical supplies.",
                category: "emergency",
                target: 50000,
                raised: 32500,
                progress: 65,
                donors: 423,
                daysLeft: 15,
                image: "/micro-donation-portal/assets/images/campaign1.jpg",
                organizer: "MPP KPTM",
                dateCreated: "2025-11-01",
                featured: true,
                status: "active"
            },
            {
                id: 2,
                title: "Student Scholarship Program",
                description: "Provide scholarships for underprivileged students to continue their education at KPTM.",
                category: "education",
                target: 30000,
                raised: 18500,
                progress: 62,
                donors: 287,
                daysLeft: 30,
                image: "/micro-donation-portal/assets/images/campaign2.jpg",
                organizer: "Student Affairs",
                dateCreated: "2025-11-15",
                featured: true,
                status: "active"
            },
            {
                id: 3,
                title: "Community Health Center",
                description: "Renovate and equip the local health center with modern medical equipment.",
                category: "health",
                target: 75000,
                raised: 42000,
                progress: 56,
                donors: 512,
                daysLeft: 45,
                image: "/micro-donation-portal/assets/images/campaign3.jpg",
                organizer: "Community Council",
                dateCreated: "2025-10-20",
                featured: true,
                status: "active"
            },
            {
                id: 4,
                title: "Animal Shelter Support",
                description: "Help build a new shelter and provide care for stray animals in our community.",
                category: "community",
                target: 20000,
                raised: 12500,
                progress: 63,
                donors: 198,
                daysLeft: 20,
                image: "/micro-donation-portal/assets/images/campaign4.jpg",
                organizer: "Animal Welfare Club",
                dateCreated: "2025-11-10",
                featured: false,
                status: "active"
            },
            {
                id: 5,
                title: "Community Garden Project",
                description: "Create a sustainable community garden to provide fresh produce for local families.",
                category: "environment",
                target: 15000,
                raised: 8900,
                progress: 59,
                donors: 156,
                daysLeft: 25,
                image: "/micro-donation-portal/assets/images/campaign5.jpg",
                organizer: "Green Society",
                dateCreated: "2025-11-05",
                featured: false,
                status: "active"
            },
            {
                id: 6,
                title: "Digital Learning Lab",
                description: "Set up a computer lab for underprivileged children to access digital education.",
                category: "education",
                target: 40000,
                raised: 21000,
                progress: 53,
                donors: 234,
                daysLeft: 40,
                image: "/micro-donation-portal/assets/images/campaign6.jpg",
                organizer: "Tech Club KPTM",
                dateCreated: "2025-10-30",
                featured: false,
                status: "active"
            }
        ];
        
        return this.campaigns;
    }
    
    async getCampaignById(id) {
        try {
            // Try API first
            const response = await fetch(`micro-donation-portal/backend/api/campaigns/get-single.php?id=${id}`);
            
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
            const response = await fetch('backend/api/campaigns/create.php', {
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
            
            // Save to localStorage
            this.saveTempCampaign(tempCampaign);
            
            return {
                success: true,
                campaign: tempCampaign,
                message: 'Campaign saved locally. Will sync when online.'
            };
        }
    }

        // In campaigns.js - FIX getCurrentUser method
        getCurrentUser() {
        // Check both possible localStorage keys
        let userData = localStorage.getItem('micro_donation_user');
        
        // Fallback to old key
        if (!userData) {
            userData = localStorage.getItem('communitygive_user');
            // If found with old key, migrate to new key
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
        return {
            id: dbCampaign.id,
            title: dbCampaign.title,
            description: dbCampaign.description,
            category: dbCampaign.category,
            target: parseFloat(dbCampaign.target_amount || dbCampaign.target || 0),
            raised: parseFloat(dbCampaign.current_amount || dbCampaign.raised || 0),
            progress: parseFloat(dbCampaign.progress_percentage || dbCampaign.progress || 0),
            donors: parseInt(dbCampaign.donors_count || dbCampaign.donors || 0),
            daysLeft: parseInt(dbCampaign.days_left || dbCampaign.daysLeft || 30),
            image: dbCampaign.image_url || dbCampaign.image || '/micro-donation-portal/assets/images/default-campaign.jpg',
            organizer: dbCampaign.organizer || 'Anonymous',
            dateCreated: dbCampaign.created_at || dbCampaign.dateCreated || new Date().toISOString().split('T')[0],
            featured: dbCampaign.featured || false,
            status: dbCampaign.status || 'active'
        };
    }
    
    saveTempCampaign(campaign) {
        const tempCampaigns = JSON.parse(localStorage.getItem('temp_campaigns') || '[]');
        tempCampaigns.push(campaign);
        localStorage.setItem('temp_campaigns', JSON.stringify(tempCampaigns));
    }
    
    loadTempCampaigns() {
        const tempCampaigns = JSON.parse(localStorage.getItem('temp_campaigns') || '[]');
        
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
    
    // Render campaign card HTML
    renderCampaignCard(campaign) {
        const categoryLabel = this.getCategoryLabel(campaign.category);
        const categoryColor = this.getCategoryColor(campaign.category);
        
        // Add temporary badge for locally saved campaigns
        const temporaryBadge = campaign.isTemporary ? 
            '<span class="badge bg-warning ms-2">Local</span>' : '';
        
        // Add pending badge for campaigns awaiting approval
        const pendingBadge = campaign.status === 'pending' ? 
            '<span class="badge bg-secondary ms-2">Pending Approval</span>' : '';
        
        return `
            <div class="col-md-6 col-lg-4 mb-4 stagger-item">
                <div class="card campaign-card h-100 hover-lift">
                    <img src="${campaign.image}" class="card-img-top" alt="${campaign.title}" height="200">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span class="badge bg-${categoryColor}">${categoryLabel}</span>
                                ${temporaryBadge}
                                ${pendingBadge}
                            </div>
                            <small class="text-muted">${campaign.daysLeft} days left</small>
                        </div>
                        
                        <h5 class="card-title">${campaign.title}</h5>
                        <p class="card-text text-muted">${campaign.description.substring(0, 100)}...</p>
                        
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
                                <div class="fw-bold text-success">RM ${campaign.raised.toLocaleString()}</div>
                                <small class="text-muted">raised of RM ${campaign.target.toLocaleString()}</small>
                            </div>
                            <div class="col-5 text-end">
                                <a href="donation-page.html?campaign=${campaign.id}" 
                                class="btn btn-success btn-sm ${campaign.status !== 'active' ? 'disabled' : ''}">
                                    <i class="fas fa-heart"></i> ${campaign.status === 'active' ? 'Donate' : 'Pending'}
                                </a>
                            </div>
                        </div>
                        
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
    
    // Render campaigns to container
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
            let campaigns;
            
            // Always load campaigns first (now includes API call)
            campaigns = await this.getAllCampaigns();
            
            // Load any temporary campaigns from localStorage
            const tempCampaigns = this.loadTempCampaigns();
            
            // Apply category filter if specified
            if (filter.category) {
                campaigns = campaigns.filter(c => c.category === filter.category);
            }
            
            // Apply featured filter if specified
            if (filter.featured) {
                campaigns = campaigns.filter(c => c.featured);
            }
            
            // Apply status filter - by default show only active and pending
            campaigns = campaigns.filter(c => c.status === 'active' || c.status === 'pending');
            
            // Apply search filter
            if (filter.search) {
                const term = filter.search.toLowerCase();
                campaigns = campaigns.filter(campaign => 
                    campaign.title.toLowerCase().includes(term) ||
                    campaign.description.toLowerCase().includes(term) ||
                    campaign.organizer.toLowerCase().includes(term)
                );
            }
            
            // Apply sorting
            if (filter.sort) {
                campaigns = this.sortCampaigns(filter.sort, campaigns);
            }
            
            // Render campaigns
            if (campaigns.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h4>No campaigns found</h4>
                        <p class="text-muted">Try adjusting your search or filter criteria</p>
                    </div>
                `;
            } else {
                container.innerHTML = campaigns.map(campaign => 
                    this.renderCampaignCard(campaign)
                ).join('');
            }
            
        } catch (error) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h4>Error loading campaigns</h4>
                    <p class="text-muted">${error.message}</p>
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