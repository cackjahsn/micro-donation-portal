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
        // Load sample campaigns
        this.loadSampleCampaigns();
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
                image: "assets/images/campaign1.jpg",
                organizer: "MPP KPTM",
                dateCreated: "2025-11-01",
                featured: true
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
                image: "assets/images/campaign2.jpg",
                organizer: "Student Affairs",
                dateCreated: "2025-11-15",
                featured: true
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
                image: "assets/images/campaign3.jpg",
                organizer: "Community Council",
                dateCreated: "2025-10-20",
                featured: true
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
                image: "assets/images/campaign4.jpg",
                organizer: "Animal Welfare Club",
                dateCreated: "2025-11-10",
                featured: false
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
                image: "assets/images/campaign5.jpg",
                organizer: "Green Society",
                dateCreated: "2025-11-05",
                featured: false
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
                image: "assets/images/campaign6.jpg",
                organizer: "Tech Club KPTM",
                dateCreated: "2025-10-30",
                featured: false
            }
        ];
    }
    
    async getAllCampaigns() {
        // Simulate API call delay
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.campaigns);
            }, 500);
        });
    }
    
    async getCampaignById(id) {
        const campaign = this.campaigns.find(c => c.id === parseInt(id));
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (campaign) {
                    resolve(campaign);
                } else {
                    reject(new Error('Campaign not found'));
                }
            }, 300);
        });
    }
    
    async getFeaturedCampaigns() {
        const featured = this.campaigns.filter(c => c.featured);
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(featured);
            }, 300);
        });
    }
    
    async getCampaignsByCategory(category) {
        if (!category) return this.getAllCampaigns();
        
        const filtered = this.campaigns.filter(c => c.category === category);
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(filtered);
            }, 300);
        });
    }
    
    async createCampaign(campaignData) {
        // Validate campaign data
        if (!this.validateCampaignData(campaignData)) {
            throw new Error('Invalid campaign data');
        }
        
        const newCampaign = {
            id: Date.now(),
            ...campaignData,
            raised: 0,
            progress: 0,
            donors: 0,
            daysLeft: 30,
            dateCreated: new Date().toISOString().split('T')[0],
            featured: false
        };
        
        // Simulate API call
        return new Promise(resolve => {
            setTimeout(() => {
                this.campaigns.unshift(newCampaign);
                resolve({
                    success: true,
                    campaign: newCampaign,
                    message: 'Campaign created successfully'
                });
            }, 1000);
        });
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
    
    // Render campaign card HTML
    renderCampaignCard(campaign) {
        const categoryLabel = this.getCategoryLabel(campaign.category);
        const categoryColor = this.getCategoryColor(campaign.category);
        
        return `
            <div class="col-md-6 col-lg-4 mb-4 stagger-item">
                <div class="card campaign-card h-100 hover-lift">
                    <img src="${campaign.image}" class="card-img-top" alt="${campaign.title}" height="200">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-${categoryColor}">${categoryLabel}</span>
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
                                class="btn btn-success btn-sm">
                                    <i class="fas fa-heart"></i> Donate
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
            
            if (filter.category) {
                campaigns = await this.getCampaignsByCategory(filter.category);
            } else if (filter.featured) {
                campaigns = await this.getFeaturedCampaigns();
            } else {
                campaigns = await this.getAllCampaigns();
            }
            
            // Apply search filter
            if (filter.search) {
                campaigns = this.filterCampaigns(filter.search);
            }
            
            // Apply sorting
            if (filter.sort) {
                campaigns = this.sortCampaigns(filter.sort);
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
        
        // Simulate API update
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