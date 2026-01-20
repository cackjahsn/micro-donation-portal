// Admin Dashboard JavaScript with full functionality
class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.sidebarCollapsed = false;
        this.dataTable = null;
        this.currentPage = 'overview';
        this.charts = {};
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.loadUserData();
        this.setupSidebarToggle();
        this.setupSidebarNavigation();
        this.setupEventListeners();
        this.loadPage('overview');
    }
    
    checkAuth() {
        if (typeof auth !== 'undefined') {
            if (!auth.isAuthenticated() || !auth.isAdmin()) {
                auth.showNotification('Access denied. Admin privileges required.', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return false;
            }
        }
        return true;
    }
    
    loadUserData() {
        // Use auth.getCurrentUser if available
        if (typeof auth !== 'undefined' && auth.getCurrentUser) {
            this.currentUser = auth.getCurrentUser();
        } else {
            // Fallback to localStorage with utils check
            const savedUser = localStorage.getItem('communitygive_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
            }
        }
        this.updateUserInfo();
    }
    
    updateUserInfo() {
        const userName = document.querySelector('.user-name');
        if (userName && this.currentUser) {
            userName.textContent = `Welcome, ${this.currentUser.name || 'Admin'}`;
        }
    }
    
    setupSidebarToggle() {
        const menuToggle = document.getElementById('menu-toggle');
        const wrapper = document.getElementById('wrapper');
        
        if (menuToggle && wrapper) {
            menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                wrapper.classList.toggle('sidebar-collapsed');
                menuToggle.innerHTML = wrapper.classList.contains('sidebar-collapsed') 
                    ? '<i class="fas fa-bars"></i>' 
                    : '<i class="fas fa-times"></i>';
                this.redrawCharts();
            });
        }
    }
    
    setupSidebarNavigation() {
        const navItems = document.querySelectorAll('#sidebar-wrapper .list-group-item[data-page]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Load page
                this.loadPage(page);
            });
        });
    }
    
    async loadPage(page) {
        // Destroy existing charts first
        this.destroyAllCharts();
        
        this.currentPage = page;
        const content = document.getElementById('main-content');
        
        // Clear content first
        content.innerHTML = '';
        
        switch(page) {
            case 'overview':
                content.innerHTML = this.getOverviewHTML();
                await this.loadOverviewData();
                break;
            case 'campaigns':
                content.innerHTML = this.getCampaignsHTML();
                await this.loadCampaignsData();
                break;
            case 'donors':
                content.innerHTML = this.getDonorsHTML();
                await this.loadDonorsData();
                break;
            case 'analytics':
                content.innerHTML = this.getAnalyticsHTML();
                await this.loadAnalyticsData();
                break;
            case 'reports':
                content.innerHTML = this.getReportsHTML();
                await this.loadReportsData();
                break;
            case 'settings':
                content.innerHTML = this.getSettingsHTML();
                break;
        }
    }

    // Add this helper method too
    renderCampaignsTable(campaigns) {
        const container = document.getElementById('campaignsTableContainer');
        if (!container) return;
        
        if (campaigns.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No campaigns found in the database.
                </div>
            `;
            return;
        }
        
        // Use utils.formatCurrency if available
        const formatCurrency = (amount) => {
            if (typeof utils !== 'undefined' && utils.formatCurrency) {
                return utils.formatCurrency(amount);
            }
            return `RM ${parseFloat(amount).toLocaleString()}`;
        };
        
        // Create a simple table
        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Target</th>
                            <th>Raised</th>
                            <th>Progress</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        campaigns.forEach(campaign => {
            const statusColor = campaign.status === 'active' ? 'success' : 
                            campaign.status === 'pending' ? 'warning' : 'secondary';
            
            html += `
                <tr>
                    <td>${campaign.id}</td>
                    <td><strong>${campaign.title}</strong></td>
                    <td><span class="badge bg-primary">${campaign.category}</span></td>
                    <td>${formatCurrency(campaign.target)}</td>
                    <td>${formatCurrency(campaign.raised || 0)}</td>
                    <td>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-success" style="width: ${campaign.progress || 0}%"></div>
                        </div>
                        <small>${campaign.progress || 0}%</small>
                    </td>
                    <td>
                        <span class="badge bg-${statusColor}">${campaign.status}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.viewCampaign(${campaign.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${campaign.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="adminDashboard.approveCampaign(${campaign.id})">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <small class="text-muted">Total: ${campaigns.length} campaigns</small>
            </div>
        `;
        
        container.innerHTML = html;
    }

        async loadPendingCampaigns() {
        try {
            console.log('Loading pending campaigns from API...');
            
            // Show loading state
            const container = document.getElementById('pendingCampaignsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading pending campaigns...</p>
                    </div>
                `;
            }
            
        
            const response = await fetch('backend/api/campaigns/get-pending.php', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('Pending campaigns response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Pending campaigns API result:', result);
            
            if (result.success && Array.isArray(result.campaigns)) {
                this.renderPendingCampaigns(result.campaigns);
                
                // Update pending count
                const pendingCount = document.getElementById('pendingCount');
                if (pendingCount) {
                    pendingCount.textContent = result.campaigns.length;
                }
                
                // Also update the pending count in the sidebar if exists
                const pendingBadge = document.querySelector('#pendingCampaignsCount');
                if (pendingBadge) {
                    pendingBadge.textContent = result.campaigns.length;
                }
            } else {
                throw new Error(result.message || 'Failed to load pending campaigns');
            }
            
        } catch (error) {
            console.error('Error loading pending campaigns:', error);
            
            // Show error in container
            const container = document.getElementById('pendingCampaignsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h5>Unable to load pending campaigns</h5>
                        <p class="text-muted">${error.message}</p>
                        <p class="text-muted small">Make sure the backend server is running</p>
                        <button class="btn btn-outline-primary mt-3" onclick="adminDashboard.loadPendingCampaigns()">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                `;
            }
        }
    }
    
        renderPendingCampaigns(campaigns) {
        const container = document.getElementById('pendingCampaignsContainer');
        if (!container) return;
        
        if (!campaigns || campaigns.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h5>No pending campaigns</h5>
                    <p class="text-muted">All campaigns have been reviewed</p>
                </div>
            `;
            return;
        }
        
        // Format currency using utils if available
        const formatCurrency = (amount) => {
            if (typeof utils !== 'undefined' && utils.formatCurrency) {
                return utils.formatCurrency(amount);
            }
            return `RM ${parseFloat(amount).toLocaleString()}`;
        };
        
        container.innerHTML = campaigns.map(campaign => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <img src="${campaign.image || '/micro-donation-portal/assets/images/default-campaign.jpg'}" 
                                class="img-fluid rounded" alt="${campaign.title}" style="max-height: 150px; object-fit: cover;">
                        </div>
                        <div class="col-md-6">
                            <h5>${campaign.title}</h5>
                            <p class="text-muted">${campaign.description.substring(0, 200)}${campaign.description.length > 200 ? '...' : ''}</p>
                            <div class="mt-2">
                                <span class="badge bg-primary">${campaign.category}</span>
                                <span class="badge bg-secondary ms-2">Target: ${formatCurrency(campaign.target)}</span>
                                <span class="badge bg-info ms-2">By: ${campaign.organizer}</span>
                                <span class="badge bg-warning ms-2">Submitted: ${new Date(campaign.dateCreated).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="col-md-3 text-end">
                            <div class="btn-group-vertical">
                                <button class="btn btn-success btn-sm mb-2" 
                                        onclick="adminDashboard.approveCampaign(${campaign.id})">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn btn-danger btn-sm mb-2" 
                                        onclick="adminDashboard.rejectCampaign(${campaign.id})">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                                <button class="btn btn-info btn-sm" 
                                        onclick="adminDashboard.viewCampaignDetails(${campaign.id})">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadAllCampaignsTable() {
        try {
            console.log('Loading all campaigns for admin table...');
            
            const container = document.getElementById('campaignsTableContainer');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading campaigns...</p>
                    </div>
                `;
            }
            
            // Fetch all campaigns (including active)
            const response = await fetch('backend/api/campaigns/get-all.php', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('All campaigns response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('All campaigns API result:', result);
            
            if (result.success && Array.isArray(result.campaigns)) {
                this.renderCampaignsTable(result.campaigns);
            } else {
                this.showNotification('No campaigns found or API error: ' + (result.message || 'Unknown error'), 'warning');
            }
            
        } catch (error) {
            console.error('Error loading campaigns table:', error);
            this.showNotification('Failed to load campaigns: ' + error.message, 'error');
            
            // Show error in container
            const container = document.getElementById('campaignsTableContainer');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load campaigns: ${error.message}
                    </div>
                `;
            }
        }
    }

    async approveCampaign(campaignId) {
        if (!confirm('Are you sure you want to approve this campaign? This will make it visible to donors.')) {
            return;
        }
        
        try {
            // Use correct path
            const response = await fetch('../backend/api/campaigns/approve.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    id: campaignId, 
                    action: 'approve' 
                })
            });
            
            console.log('Approve response status:', response.status);
            
            const result = await response.json();
            console.log('Approve API result:', result);
            
            if (result.success) {
                this.showNotification(`Campaign #${campaignId} approved successfully`, 'success');
                
                // Reload both pending campaigns and all campaigns
                this.loadPendingCampaigns();
                this.loadAllCampaignsTable();
            } else {
                this.showNotification('Failed to approve campaign: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error approving campaign:', error);
            this.showNotification('Error approving campaign: ' + error.message, 'error');
        }
    }

    async rejectCampaign(campaignId) {
        if (!confirm('Are you sure you want to reject this campaign? This will cancel it.')) {
            return;
        }
        
        try {
            const response = await fetch('../backend/api/campaigns/approve.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    id: campaignId, 
                    action: 'reject' 
                })
            });
            
            console.log('Reject response status:', response.status);
            
            const result = await response.json();
            console.log('Reject API result:', result);
            
            if (result.success) {
                this.showNotification(`Campaign #${campaignId} rejected`, 'success');
                
                // Reload both pending campaigns and all campaigns
                this.loadPendingCampaigns();
                this.loadAllCampaignsTable();
            } else {
                this.showNotification('Failed to reject campaign: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error rejecting campaign:', error);
            this.showNotification('Error rejecting campaign: ' + error.message, 'error');
        }
    }
    
    getOverviewHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Dashboard Overview</h1>
                        <div class="d-flex">
                            <input type="text" class="form-control me-2" id="searchInput" 
                                   placeholder="Search transactions..." style="width: 250px;">
                            <button class="btn btn-outline-primary" id="refreshBtn">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="row">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-primary shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                        Total Donations</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="totalDonations">Loading...</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 12%</span>
                                        <span>Since last month</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-dollar-sign fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-success shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Active Campaigns</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="activeCampaigns">Loading...</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 2</span>
                                        <span>This month</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-hand-holding-heart fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-info shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                        Total Donors</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="totalDonors">Loading...</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 24</span>
                                        <span>New this month</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-users fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-warning shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                        Success Rate</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="successRate">Loading...</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 1.2%</span>
                                        <span>Since last month</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-percentage fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="row mb-4">
                <div class="col-xl-8 col-lg-7">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">Monthly Revenue</h6>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" 
                                        data-bs-toggle="dropdown" id="chartPeriod">
                                    <i class="fas fa-calendar-alt"></i> This Year
                                </button>
                                <div class="dropdown-menu">
                                    <a class="dropdown-item" href="#" data-period="year">This Year</a>
                                    <a class="dropdown-item" href="#" data-period="quarter">This Quarter</a>
                                    <a class="dropdown-item" href="#" data-period="month">This Month</a>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="revenueChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-4 col-lg-5">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Donation Sources</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="sourcesChart"></canvas>
                            </div>
                            <div class="mt-4 text-center small">
                                <span class="mr-2">
                                    <i class="fas fa-circle text-primary"></i> QR Payment
                                </span>
                                <span class="mr-2">
                                    <i class="fas fa-circle text-success"></i> Online Banking
                                </span>
                                <span class="mr-2">
                                    <i class="fas fa-circle text-info"></i> Credit Card
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">Recent Transactions</h6>
                            <div>
                                <button class="btn btn-sm btn-outline-primary me-2" id="filterTransactions">
                                    <i class="fas fa-filter"></i> Filter
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="adminDashboard.exportData()">
                                    <i class="fas fa-download fa-sm"></i> Export
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="transactionsTable" width="100%" cellspacing="0">
                                    <thead class="thead-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Donor</th>
                                            <th>Campaign</th>
                                            <th>Amount</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th>Method</th>
                                        </tr>
                                    </thead>
                                    <tbody id="transactionsBody">
                                        <!-- Transactions loaded by JavaScript -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getAnalyticsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Advanced Analytics</h1>
                        <button class="btn btn-primary" id="openAnalyticsModal">
                            <i class="fas fa-chart-line me-2"></i> Detailed Analytics
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Key Metrics -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-primary shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                        Conversion Rate</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">12.5%</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 2.3%</span>
                                        <span>From last month</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-exchange-alt fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-success shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Avg. Donation</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">RM 65.40</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> RM 8.20</span>
                                        <span>From last month</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-coins fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-info shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                        Donor Retention</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">78.2%</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-danger mr-2"><i class="fas fa-arrow-down"></i> 1.8%</span>
                                        <span>From last month</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-user-check fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-warning shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                        Peak Hours</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">2-4 PM</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-clock"></i></span>
                                        <span>Most donations time</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-clock fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Analytics Charts -->
            <div class="row mb-4">
                <div class="col-xl-6 col-lg-6 mb-4">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Donation Trends by Campaign</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="campaignTrendsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-6 col-lg-6 mb-4">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Donor Demographics</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="demographicsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Analytics -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Performance Analysis</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <div class="analytics-card">
                                        <h6>Top Performing Campaigns</h6>
                                        <ul class="list-unstyled">
                                            <li class="mb-2">
                                                <span class="fw-bold">Flood Relief Fund</span>
                                                <span class="float-end text-success">94%</span>
                                            </li>
                                            <li class="mb-2">
                                                <span class="fw-bold">Student Scholarship</span>
                                                <span class="float-end text-success">87%</span>
                                            </li>
                                            <li class="mb-2">
                                                <span class="fw-bold">Health Center</span>
                                                <span class="float-end text-warning">72%</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="col-md-4 mb-3">
                                    <div class="analytics-card">
                                        <h6>Recurring Donors</h6>
                                        <div class="metric-value">42</div>
                                        <div class="metric-label">↑ 8 from last quarter</div>
                                        <div class="progress mt-3" style="height: 10px;">
                                            <div class="progress-bar bg-success" style="width: 65%"></div>
                                        </div>
                                        <small class="text-muted">65% of total donors</small>
                                    </div>
                                </div>
                                
                                <div class="col-md-4 mb-3">
                                    <div class="analytics-card">
                                        <h6>Average Processing Time</h6>
                                        <div class="metric-value">2.4 min</div>
                                        <div class="metric-label trend-down">↓ 0.6 min from last month</div>
                                        <canvas id="processingTimeChart" height="100"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getReportsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Reports & Export</h1>
                        <button class="btn btn-primary" id="generateReportBtn">
                            <i class="fas fa-file-export me-2"></i> Generate Report
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Report Templates -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card shadow h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-file-alt fa-3x text-primary mb-3"></i>
                            <h5 class="card-title">Summary Report</h5>
                            <p class="card-text text-muted">Monthly overview with key metrics</p>
                            <button class="btn btn-outline-primary" onclick="adminDashboard.generatePDF('summary')">
                                <i class="fas fa-download me-2"></i> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card shadow h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-list-alt fa-3x text-success mb-3"></i>
                            <h5 class="card-title">Transaction Report</h5>
                            <p class="card-text text-muted">Detailed transaction listing</p>
                            <button class="btn btn-outline-success" onclick="adminDashboard.generatePDF('transactions')">
                                <i class="fas fa-download me-2"></i> Download CSV
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card shadow h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-chart-bar fa-3x text-info mb-3"></i>
                            <h5 class="card-title">Analytics Report</h5>
                            <p class="card-text text-muted">Performance analytics & insights</p>
                            <button class="btn btn-outline-info" onclick="adminDashboard.generatePDF('analytics')">
                                <i class="fas fa-download me-2"></i> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card shadow h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-users fa-3x text-warning mb-3"></i>
                            <h5 class="card-title">Donor Report</h5>
                            <p class="card-text text-muted">Donor analysis & segmentation</p>
                            <button class="btn btn-outline-warning" onclick="adminDashboard.generatePDF('donors')">
                                <i class="fas fa-download me-2"></i> Download Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Report History -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Recent Reports</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="reportsTable">
                                    <thead>
                                        <tr>
                                            <th>Report Name</th>
                                            <th>Type</th>
                                            <th>Generated On</th>
                                            <th>Period</th>
                                            <th>Format</th>
                                            <th>Size</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="reportsBody">
                                        <!-- Reports will be loaded here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Report Customization -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Custom Report Builder</h6>
                        </div>
                        <div class="card-body">
                            <form id="customReportForm">
                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Report Type</label>
                                        <select class="form-select" required>
                                            <option value="">Select report type</option>
                                            <option value="financial">Financial Summary</option>
                                            <option value="campaign">Campaign Performance</option>
                                            <option value="donor">Donor Analysis</option>
                                            <option value="transaction">Transaction Details</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Date Range</label>
                                        <select class="form-select" required>
                                            <option value="month">This Month</option>
                                            <option value="quarter">This Quarter</option>
                                            <option value="year">This Year</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Format</label>
                                        <select class="form-select" required>
                                            <option value="pdf">PDF Document</option>
                                            <option value="excel">Excel Spreadsheet</option>
                                            <option value="csv">CSV File</option>
                                            <option value="json">JSON Data</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-12">
                                        <label class="form-label">Include Sections</label>
                                        <div class="row">
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="includeSummary" checked>
                                                    <label class="form-check-label" for="includeSummary">
                                                        Executive Summary
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="includeCharts" checked>
                                                    <label class="form-check-label" for="includeCharts">
                                                        Charts & Graphs
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="includeDetails" checked>
                                                    <label class="form-check-label" for="includeDetails">
                                                        Detailed Data
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="includeRecommendations">
                                                    <label class="form-check-label" for="includeRecommendations">
                                                        Recommendations
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-center mt-4">
                                    <button type="submit" class="btn btn-primary btn-lg px-5">
                                        <i class="fas fa-magic me-2"></i> Generate Custom Report
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadOverviewData() {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update stats
        document.getElementById('totalDonations').textContent = 'RM 10,230';
        document.getElementById('activeCampaigns').textContent = '8';
        document.getElementById('totalDonors').textContent = '156';
        document.getElementById('successRate').textContent = '94.5%';
        
        // Initialize charts
        this.initRevenueChart();
        this.initSourcesChart();
        this.loadTransactions();
        this.setupOverviewEventListeners();
    }
    
    async loadAnalyticsData() {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.initCampaignTrendsChart();
        this.initDemographicsChart();
        this.initProcessingTimeChart();
        this.setupAnalyticsEventListeners();
    }
    
    async loadReportsData() {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.loadReportHistory();
        this.setupReportsEventListeners();
    }
    
    initRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) {
            console.warn('Revenue chart canvas not found');
            return;
        }
        
        // Get the canvas context
        const canvas = ctx;
        
        // Check if a chart already exists on this canvas
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.log('Destroying existing chart with ID:', existingChart.id);
            existingChart.destroy();
        }
        
        // Clear the canvas completely
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set canvas to transparent background
        canvas.style.backgroundColor = 'transparent';
        
        // Wait a moment before creating new chart
        setTimeout(() => {
            try {
                console.log('Creating new revenue chart...');
                this.charts.revenue = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Monthly Donations (RM)',
                            data: [12000, 19000, 15000, 25000, 22000, 30000],
                            borderColor: '#4e73df',
                            backgroundColor: 'rgba(78, 115, 223, 0.05)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                display: false 
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: (value) => 'RM ' + value.toLocaleString()
                                }
                            }
                        }
                    }
                });
                
                console.log('Chart created successfully');
            } catch (chartError) {
                console.error('Error creating chart:', chartError);
            }
        }, 100);
    }
    
    initSourcesChart() {
        const ctx = document.getElementById('sourcesChart');
        if (!ctx) return;
        
        this.charts.sources = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['QR Payment', 'Online Banking', 'Credit Card', 'Other'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                cutout: '70%'
            }
        });
    }
    
    initCampaignTrendsChart() {
        const ctx = document.getElementById('campaignTrendsChart');
        if (!ctx) return;
        
        this.charts.campaignTrends = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Flood Relief', 'Scholarship', 'Health', 'Shelter', 'Garden'],
                datasets: [{
                    label: 'Current Month',
                    data: [45000, 28000, 32000, 15000, 12000],
                    backgroundColor: '#4e73df'
                }, {
                    label: 'Previous Month',
                    data: [38000, 25000, 28000, 12000, 10000],
                    backgroundColor: '#d1d3e2'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => 'RM ' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    }
    
    initDemographicsChart() {
        const ctx = document.getElementById('demographicsChart');
        if (!ctx) return;
        
        this.charts.demographics = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['18-25', '26-35', '36-45', '46-55', '55+'],
                datasets: [{
                    data: [25, 35, 20, 15, 5],
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }
    
    initProcessingTimeChart() {
        const ctx = document.getElementById('processingTimeChart');
        if (!ctx) return;
        
        this.charts.processingTime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Processing Time (min)',
                    data: [3.2, 2.8, 2.5, 2.4],
                    borderColor: '#e74a3b',
                    backgroundColor: 'rgba(231, 74, 59, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => value + ' min'
                        }
                    }
                }
            }
        });
    }
    
    async loadTransactions() {
        const transactions = [
            { id: 'DON-001234', donor: 'Ahmad Rahim', campaign: 'Flood Relief Fund', amount: 150.00, date: '2025-12-18 14:30', status: 'completed', method: 'QR Payment' },
            { id: 'DON-001233', donor: 'Siti Aminah', campaign: 'Student Scholarship', amount: 50.00, date: '2025-12-18 11:15', status: 'completed', method: 'Online Banking' },
            { id: 'DON-001232', donor: 'Anonymous', campaign: 'Health Center', amount: 25.00, date: '2025-12-18 09:45', status: 'completed', method: 'QR Payment' },
            { id: 'DON-001231', donor: 'John Lee', campaign: 'Community Garden', amount: 100.00, date: '2025-12-17 16:20', status: 'completed', method: 'Credit Card' },
            { id: 'DON-001230', donor: 'Maria Tan', campaign: 'Animal Shelter', amount: 30.00, date: '2025-12-17 13:10', status: 'pending', method: 'QR Payment' }
        ];
        
        const tbody = document.getElementById('transactionsBody');
        if (!tbody) return;
        
        tbody.innerHTML = transactions.map(transaction => `
            <tr>
                <td><strong>${transaction.id}</strong></td>
                <td>${transaction.donor}</td>
                <td>${transaction.campaign}</td>
                <td class="fw-bold text-success">RM ${transaction.amount.toFixed(2)}</td>
                <td>${this.formatDateTime(transaction.date)}</td>
                <td>
                    <span class="badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}">
                        ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-info">${transaction.method}</span>
                </td>
            </tr>
        `).join('');
        
        this.initializeDataTable();
    }
    
    loadReportHistory() {
        const reports = [
            { name: 'Monthly Summary Dec 2025', type: 'Financial', generated: '2025-12-18', period: 'Dec 2025', format: 'PDF', size: '2.4 MB' },
            { name: 'Campaign Performance Q4', type: 'Analytics', generated: '2025-12-15', period: 'Q4 2025', format: 'Excel', size: '1.8 MB' },
            { name: 'Donor Analysis Report', type: 'Donor', generated: '2025-12-10', period: 'Nov 2025', format: 'PDF', size: '3.1 MB' },
            { name: 'Transaction Log', type: 'Transaction', generated: '2025-12-05', period: 'Custom', format: 'CSV', size: '4.2 MB' }
        ];
        
        const tbody = document.getElementById('reportsBody');
        if (!tbody) return;
        
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>${report.name}</td>
                <td><span class="badge bg-primary">${report.type}</span></td>
                <td>${report.generated}</td>
                <td>${report.period}</td>
                <td>${report.format}</td>
                <td>${report.size}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.downloadReport('${report.name}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="adminDashboard.viewReport('${report.name}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    initializeDataTable() {
        if ($.fn.DataTable && $('#transactionsTable').length) {
            if (this.dataTable) {
                this.dataTable.destroy();
            }
            
            this.dataTable = $('#transactionsTable').DataTable({
                pageLength: 10,
                lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
                order: [[4, 'desc']],
                responsive: true,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                     '<"row"<"col-sm-12"tr>>' +
                     '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                buttons: [
                    'copy', 'csv', 'excel', 'pdf', 'print'
                ]
            });
        }
    }
    
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof auth !== 'undefined') {
                    auth.handleLogout();
                } else {
                    localStorage.removeItem('communitygive_token');
                    localStorage.removeItem('communitygive_user');
                    window.location.href = 'index.html';
                }
            });
        }
    }
    
    setupOverviewEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshOverview();
            });
        }
        
        // Chart period dropdown
        const dropdownItems = document.querySelectorAll('.dropdown-item[data-period]');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const period = item.getAttribute('data-period');
                document.getElementById('chartPeriod').innerHTML = 
                    `<i class="fas fa-calendar-alt"></i> ${item.textContent}`;
                this.updateChartPeriod(period);
            });
        });
    }
    
    setupAnalyticsEventListeners() {
        // Open analytics modal
        const openModalBtn = document.getElementById('openAnalyticsModal');
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                this.openAnalyticsModal();
            });
        }
    }
    
    setupReportsEventListeners() {
        // Generate report button
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.openReportSettingsModal();
            });
        }
        
        // Custom report form
        const customForm = document.getElementById('customReportForm');
        if (customForm) {
            customForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateCustomReport();
            });
        }
    }
    
    updateChartPeriod(period) {
        // Update chart based on selected period
        this.showNotification(`Chart updated to show ${period} data`, 'success');
    }
    
    refreshOverview() {
        this.showNotification('Refreshing dashboard data...', 'info');
        setTimeout(() => {
            this.loadOverviewData();
            this.showNotification('Dashboard refreshed successfully', 'success');
        }, 1000);
    }
    
    openAnalyticsModal() {
        const modal = new bootstrap.Modal(document.getElementById('analyticsModal'));
        modal.show();
        
        // Initialize modal charts
        setTimeout(() => {
            this.initModalCharts();
        }, 100);
    }
    
    initModalCharts() {
        // Frequency chart
        const freqCtx = document.getElementById('frequencyChart');
        if (freqCtx) {
            new Chart(freqCtx, {
                type: 'bar',
                data: {
                    labels: ['Once', '2-3 times', '4-5 times', '6+ times'],
                    datasets: [{
                        label: 'Number of Donors',
                        data: [45, 28, 15, 12],
                        backgroundColor: '#4e73df'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Time chart
        const timeCtx = document.getElementById('timeChart');
        if (timeCtx) {
            new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'],
                    datasets: [{
                        label: 'Donations',
                        data: [5, 12, 18, 25, 20, 15, 8],
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }
    
    openReportSettingsModal() {
        const modal = new bootstrap.Modal(document.getElementById('reportSettingsModal'));
        modal.show();
        
        // Setup date range toggle
        const dateRange = document.getElementById('dateRange');
        const customRange = document.getElementById('customDateRange');
        
        dateRange.addEventListener('change', () => {
            if (dateRange.value === 'custom') {
                customRange.classList.remove('d-none');
            } else {
                customRange.classList.add('d-none');
            }
        });
        
        // Setup generate button
        const generateBtn = document.getElementById('generateReportBtnModal');
        generateBtn.addEventListener('click', () => {
            this.generateReportFromModal();
            modal.hide();
        });
    }
    
    async generateReportFromModal() {
        const reportType = document.getElementById('reportType').value;
        const dateRange = document.getElementById('dateRange').value;
        const format = document.getElementById('reportFormat').value;
        const includeCharts = document.getElementById('includeCharts').checked;
        
        this.showNotification(`Generating ${reportType} report in ${format.toUpperCase()} format...`, 'info');
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (format === 'pdf') {
            this.generatePDF(reportType);
        } else if (format === 'excel') {
            this.exportToExcel(reportType);
        } else {
            this.exportToCSV(reportType);
        }
    }
    
    generatePDF(type = 'summary') {
        this.showNotification(`Generating ${type} PDF report...`, 'info');
        
        // For a real implementation, you would use jsPDF with server-side generation
        // This is a simplified example
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add report content
        doc.setFontSize(20);
        doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.text(`Period: ${document.getElementById('dateRange')?.value || 'This Month'}`, 20, 40);
        
        // Add data table for transactions
        if (type === 'transactions') {
            doc.text('Recent Transactions:', 20, 50);
            const transactions = [
                ['ID', 'Donor', 'Amount', 'Date'],
                ['DON-001234', 'Ahmad Rahim', 'RM 150.00', '2025-12-18'],
                ['DON-001233', 'Siti Aminah', 'RM 50.00', '2025-12-18'],
                ['DON-001232', 'Anonymous', 'RM 25.00', '2025-12-18']
            ];
            
            doc.autoTable({
                startY: 60,
                head: [transactions[0]],
                body: transactions.slice(1),
                theme: 'striped'
            });
        }
        
        // Add summary for summary report
        if (type === 'summary') {
            doc.text('Key Metrics:', 20, 50);
            const metrics = [
                'Total Donations: RM 10,230',
                'Active Campaigns: 8',
                'Total Donors: 156',
                'Success Rate: 94.5%'
            ];
            
            metrics.forEach((metric, index) => {
                doc.text(metric, 20, 60 + (index * 10));
            });
        }
        
        // Save the PDF
        doc.save(`${type}-report-${new Date().toISOString().split('T')[0]}.pdf`);
        
        this.showNotification('PDF report generated successfully', 'success');
    }
    
    exportToExcel(type) {
        this.showNotification('Exporting to Excel...', 'info');
        
        // Create Excel-like CSV
        const csvContent = this.getCSVData(type);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        this.showNotification('Excel report exported successfully', 'success');
    }
    
    exportToCSV(type) {
        this.showNotification('Exporting to CSV...', 'info');
        
        const csvContent = this.getCSVData(type);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        this.showNotification('CSV report exported successfully', 'success');
    }
    
    getCSVData(type) {
        const data = {
            summary: `Metric,Value\nTotal Donations,RM 10,230\nActive Campaigns,8\nTotal Donors,156\nSuccess Rate,94.5%\nGenerated On,${new Date().toLocaleDateString()}`,
            transactions: `ID,Donor,Campaign,Amount,Date,Status,Method\nDON-001234,Ahmad Rahim,Flood Relief Fund,150.00,2025-12-18,Completed,QR Payment\nDON-001233,Siti Aminah,Student Scholarship,50.00,2025-12-18,Completed,Online Banking\nDON-001232,Anonymous,Health Center,25.00,2025-12-18,Completed,QR Payment`,
            donors: `Name,Email,Total Donations,Last Donation,Status\nAhmad Rahim,ahmad@example.com,RM 1,250.00,2025-12-18,Active\nSiti Aminah,siti@example.com,RM 850.00,2025-12-18,Active\nJohn Lee,john@example.com,RM 620.00,2025-12-17,Active`
        };
        
        return data[type] || data.summary;
    }
    
    generateCustomReport() {
        this.showNotification('Generating custom report...', 'info');
        
        // Get form values
        const reportType = document.querySelector('#customReportForm select').value;
        const includeCharts = document.getElementById('includeCharts').checked;
        
        // Simulate processing
        setTimeout(() => {
            this.generatePDF(reportType);
            this.showNotification('Custom report generated successfully', 'success');
        }, 1500);
    }
    
    downloadReport(reportName) {
        this.showNotification(`Downloading ${reportName}...`, 'info');
        setTimeout(() => {
            this.showNotification('Report downloaded successfully', 'success');
        }, 1000);
    }
    
    viewReport(reportName) {
        this.showNotification(`Opening ${reportName}...`, 'info');
        // In a real app, you would open the report in a new tab or modal
    }
    
    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            summary: {
                totalDonations: 10230,
                activeCampaigns: 8,
                totalDonors: 156,
                successRate: 94.5
            },
            recentTransactions: this.getRecentTransactionsData()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Data exported successfully', 'success');
    }
    
    redrawCharts() {
        setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.resize) chart.resize();
            });
        }, 300);
    }
    
    showNotification(message, type = 'info') {
            if (typeof utils !== 'undefined' && utils.showNotification) {
                utils.showNotification(message, type);
            } else {
                // Original notification code
                const existing = document.querySelector('.admin-notification');
                if (existing) existing.remove();
                
                const notification = document.createElement('div');
                notification.className = `admin-notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
                notification.innerHTML = `
                    <i class="fas ${this.getNotificationIcon(type)} me-2"></i>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                
                notification.style.cssText = `
                    position: fixed;
                    top: 90px;
                    right: 20px;
                    z-index: 9999;
                    min-width: 300px;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) notification.remove();
                }, 5000);
            }
        }
    
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }
    
    formatDateTime(dateTime) {
        const date = new Date(dateTime);
        return date.toLocaleDateString('en-MY') + ' ' + 
               date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
    }
    
    getRecentTransactionsData() {
        return [
            { id: 'DON-001234', amount: 150.00, date: '2025-12-18', status: 'completed' },
            { id: 'DON-001233', amount: 50.00, date: '2025-12-18', status: 'completed' },
            { id: 'DON-001232', amount: 25.00, date: '2025-12-18', status: 'completed' }
        ];
    }

    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartName => {
            if (this.charts[chartName]) {
                try {
                    this.charts[chartName].destroy();
                } catch (e) {
                    console.log('Error destroying chart:', chartName, e);
                }
                this.charts[chartName] = null;
            }
        });
        this.charts = {};
    }
}

// Other page HTML templates (simplified versions)
AdminDashboard.prototype.getCampaignsHTML = function() {
    return `
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 class="h3 mb-0 text-gray-800">Campaign Management</h1>
                    <button class="btn btn-primary" onclick="adminDashboard.loadPendingCampaigns()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
        </div>

        <!-- Pending Campaigns -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card shadow">
                    <div class="card-header py-3">
                        <h6 class="m-0 font-weight-bold text-primary">
                            Pending Campaigns for Review
                            <span class="badge bg-warning ms-2" id="pendingCount">0</span>
                        </h6>
                    </div>
                    <div class="card-body">
                        <div id="pendingCampaignsContainer">
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2">Loading pending campaigns...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Active Campaigns -->
        <div class="row">
            <div class="col-12">
                <div class="card shadow">
                    <div class="card-header py-3 d-flex justify-content-between align-items-center">
                        <h6 class="m-0 font-weight-bold text-primary">All Active Campaigns</h6>
                        <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.exportCampaigns()">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-bordered table-hover" id="campaignsTable">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title</th>
                                        <th>Category</th>
                                        <th>Target</th>
                                        <th>Raised</th>
                                        <th>Progress</th>
                                        <th>Donors</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Campaigns loaded via JavaScript -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// Add to the loadPage method for campaigns
AdminDashboard.prototype.loadCampaignsData = async function() {
    await this.loadPendingCampaigns();
    // Load all campaigns table
    this.loadAllCampaignsTable();
};

AdminDashboard.prototype.getDonorsHTML = function() {
    return `
        <div class="row">
            <div class="col-12">
                <h1 class="h3 mb-4 text-gray-800">Donor Management</h1>
                <!-- Donor management content -->
            </div>
        </div>
    `;
};

AdminDashboard.prototype.getSettingsHTML = function() {
    return `
        <div class="row">
            <div class="col-12">
                <h1 class="h3 mb-4 text-gray-800">Settings</h1>
                <!-- Settings content -->
            </div>
        </div>
    `;
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.adminDashboard) {
        window.adminDashboard.redrawCharts();
    }
});