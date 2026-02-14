// Admin Dashboard JavaScript with full functionality and real database data
class AdminDashboard {
    constructor() {
        this.allCampaigns = [];      // Store ALL campaigns (never changes)
        this.currentCampaigns = [];  // Currently displayed campaigns (changes with filters)
        this.currentFilter = 'all';  // Track current filter
        this.currentSearchTerm = '';  // Track current search term
        this.currentUser = null;
        this.sidebarCollapsed = false;
        this.dataTable = null;
        this.currentPage = 'overview';
        this.charts = {};
        this.init();
    }
    
    init() {
        console.log('=== ADMIN DASHBOARD DEBUG ===');
        console.log('LocalStorage user:', localStorage.getItem('user'));
        console.log('LocalStorage token:', localStorage.getItem('token'));
        console.log('=============================');
        
        if (!this.checkAuth()) {
            return;
        }
        this.loadUserData();
        this.setupSidebarToggle();
        this.setupSidebarNavigation();
        this.setupEventListeners();
        this.loadPage('overview');
    }
    
    checkAuth() {
        let userString = localStorage.getItem('micro_donation_user') || 
                        localStorage.getItem('user');
        let token = localStorage.getItem('micro_donation_token') ||
                    localStorage.getItem('token');
        
        if (!userString) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                try {
                    const parsed = JSON.parse(value);
                    if (parsed && parsed.id && parsed.email && parsed.role) {
                        userString = value;
                        break;
                    }
                } catch (e) {}
            }
        }
        
        let user = {};
        try {
            user = JSON.parse(userString);
        } catch (e) {
            console.error('Error parsing user:', e);
            this.showNotification('Authentication error. Please login again.', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return false;
        }
        
        if (!token || !user.id) {
            if (user.id && !token) {
                token = 'admin-token-' + Date.now();
                localStorage.setItem('micro_donation_token', token);
                localStorage.setItem('token', token);
            } else {
                this.showNotification('Please login to access admin dashboard', 'error');
                setTimeout(() => window.location.href = 'index.html', 2000);
                return false;
            }
        }
        
        if (user.role !== 'admin') {
            console.error('User is not admin. Role:', user.role);
            this.showNotification('Access denied. Admin privileges required.', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return false;
        }
        
        console.log('✅ Auth check passed! Admin access granted.');
        this.currentUser = user;
        return true;
    }
    
    loadUserData() {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
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
                
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                this.loadPage(page);
            });
        });
    }
    
    async loadPage(page) {
        this.destroyAllCharts();
        this.currentPage = page;
        const content = document.getElementById('main-content');
        
        if (!content) return;
        
        content.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading page...</p></div>';
        
        try {
            switch(page) {
                case 'overview':
                    content.innerHTML = this.getOverviewHTML();
                    await this.loadOverviewData();
                    break;
                case 'campaigns':
                    content.innerHTML = this.getCampaignsHTML();
                    await this.loadCampaignsData();
                    break;
                case 'create-campaign':
                    content.innerHTML = this.getCreateCampaignHTML();
                    await this.loadCreateCampaignData();
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
                case 'statistics':
                    content.innerHTML = this.getStatisticsHTML();
                    await this.loadStatisticsData();
                    break;
                case 'settings':
                    content.innerHTML = this.getSettingsHTML();
                    break;
            }
        } catch (error) {
            console.error('Error loading page:', error);
            content.innerHTML = `
                <div class="alert alert-danger m-4">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading page: ${error.message}
                    <button class="btn btn-sm btn-outline-danger ms-3" onclick="location.reload()">
                        <i class="fas fa-redo me-1"></i> Refresh
                    </button>
                </div>
            `;
        }
    }

    // ============================================
    // API HELPER METHODS - Only using existing endpoints
    // ============================================
    
    async apiRequest(endpoint) {
        const token = localStorage.getItem('micro_donation_token') || localStorage.getItem('token');
        const userString = localStorage.getItem('micro_donation_user') || localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        
        const headers = {
            'Accept': 'application/json',
            'Authorization': token ? 'Bearer ' + token : '',
            'X-User-ID': user?.id || '',
            'X-User-Role': user?.role || ''
        };
        
        try {
            console.log(`Fetching: ${endpoint}`);
            const response = await fetch(endpoint, { headers });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Invalid JSON response:', text.substring(0, 200));
                throw new Error('Invalid server response format');
            }
        } catch (error) {
            console.error(`API request failed (${endpoint}):`, error);
            throw error;
        }
    }

    // ============================================
    // OVERVIEW PAGE - Full original structure with real data
    // ============================================
    
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
            
            <!-- Admin Actions -->
            <div class="admin-actions">
                <h3>Quick Actions</h3>
                <div class="action-grid">
                    <button type="button" class="action-card" onclick="adminDashboard.loadPage('create-campaign')">
                        <div class="action-icon">➕</div>
                        <h4>Create Campaign</h4>
                        <p>Start a new fundraising campaign</p>
                    </button>
                    <button type="button" class="action-card" onclick="adminDashboard.loadPage('campaigns')">
                        <div class="action-icon">📋</div>
                        <h4>Manage Campaigns</h4>
                        <p>View and manage all campaigns</p>
                    </button>
                    <button type="button" class="action-card" onclick="adminDashboard.loadPage('donors')">
                        <div class="action-icon">👥</div>
                        <h4>View Donors</h4>
                        <p>See all donor information</p>
                    </button>
                    <button type="button" class="action-card" onclick="adminDashboard.loadPage('statistics')">
                        <div class="action-icon">📊</div>
                        <h4>Statistics</h4>
                        <p>View detailed campaign statistics</p>
                    </button>
                </div>
            </div>
            
            <!-- Quick Stats -->
            <div class="quick-stats">
                <div class="quick-stat-card">
                    <h6>Active Campaigns</h6>
                    <div class="quick-stat-value" id="activeCampaignsCount">0</div>
                </div>
                <div class="quick-stat-card">
                    <h6>Total Raised Today</h6>
                    <div class="quick-stat-value" id="todayRaised">RM 0</div>
                </div>
                <div class="quick-stat-card">
                    <h6>New Donors Today</h6>
                    <div class="quick-stat-value" id="todayDonors">0</div>
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
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> From all time</span>
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
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> Currently running</span>
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
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> Unique donors</span>
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
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> Campaigns reaching goal</span>
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
                            <h6 class="m-0 font-weight-bold text-primary">Top Campaigns by Amount Raised</h6>
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
                            <h6 class="m-0 font-weight-bold text-primary">Campaign Status</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="campaignStatusChart"></canvas>
                            </div>
                            <div class="mt-4 text-center small">
                                <span class="mr-2">
                                    <i class="fas fa-circle text-success"></i> Active
                                </span>
                                <span class="mr-2">
                                    <i class="fas fa-circle text-secondary"></i> Completed
                                </span>
                                <span class="mr-2">
                                    <i class="fas fa-circle text-warning"></i> Cancelled
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
                            <h6 class="m-0 font-weight-bold text-primary">Recent Donations</h6>
                            <div>
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
    
    async loadOverviewData() {
        try {
            await Promise.all([
                this.loadCampaignStats(),
                this.loadDonationStats(),
                this.loadRecentTransactions()
            ]);
            
            this.initRevenueChart();
            this.initCampaignStatusChart();
            this.setupOverviewEventListeners();
        } catch (error) {
            console.error('Error loading overview data:', error);
            this.showNotification('Error loading dashboard data', 'error');
        }
    }

    async loadCampaignStats() {
        try {
            const data = await this.apiRequest('backend/api/campaigns/get-all.php');
            
            if (data.success && Array.isArray(data.campaigns)) {
                const campaigns = data.campaigns;
                
                const totalCampaigns = campaigns.length;
                const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
                const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
                const cancelledCampaigns = campaigns.filter(c => c.status === 'cancelled').length;
                
                // Calculate total raised
                const totalRaised = campaigns.reduce((sum, c) => sum + (parseFloat(c.current_amount) || 0), 0);
                
                // Calculate success rate (campaigns that reached or exceeded goal)
                const successfulCampaigns = campaigns.filter(c => 
                    parseFloat(c.current_amount || 0) >= parseFloat(c.target_amount || 0)
                ).length;
                const successRate = totalCampaigns > 0 ? ((successfulCampaigns / totalCampaigns) * 100).toFixed(1) : 0;
                
                // Update DOM elements
                const elements = {
                    activeCampaignsCount: activeCampaigns,
                    activeCampaigns: activeCampaigns,
                    totalDonations: this.formatCurrency(totalRaised),
                    successRate: successRate + '%',
                    completedCampaigns: completedCampaigns
                };
                
                Object.keys(elements).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = elements[id];
                });
                
                // Store for charts
                window.campaignStatusData = {
                    active: activeCampaigns,
                    completed: completedCampaigns,
                    cancelled: cancelledCampaigns
                };
                
                // Store top campaigns for chart
                window.topCampaigns = campaigns
                    .sort((a, b) => parseFloat(b.current_amount || 0) - parseFloat(a.current_amount || 0))
                    .slice(0, 5);
            }
        } catch (error) {
            console.error('Error loading campaign stats:', error);
        }
    }

    async loadDonationStats() {
        try {
            const data = await this.apiRequest('backend/api/user/donations.php?limit=1000');
            
            if (data.success && Array.isArray(data.donations)) {
                const donors = new Set();
                const today = new Date().toISOString().split('T')[0];
                let todayRaised = 0;
                let todayDonors = new Set();
                
                data.donations.forEach(d => {
                    donors.add(d.user_id);
                    
                    if (d.created_at && d.created_at.split('T')[0] === today) {
                        todayRaised += parseFloat(d.amount || 0);
                        if (d.user_id) todayDonors.add(d.user_id);
                    }
                });
                
                document.getElementById('totalDonors').textContent = donors.size;
                document.getElementById('todayRaised').textContent = this.formatCurrency(todayRaised);
                document.getElementById('todayDonors').textContent = todayDonors.size;
            }
        } catch (error) {
            console.error('Error loading donation stats:', error);
        }
    }
    
    async loadRecentTransactions() {
        try {
            const data = await this.apiRequest('backend/api/user/donations.php?limit=10');
            
            if (data.success && Array.isArray(data.donations)) {
                this.renderTransactions(data.donations);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            const tbody = document.getElementById('transactionsBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load transactions</td></tr>`;
            }
        }
    }
    
    renderTransactions(transactions) {
        const tbody = document.getElementById('transactionsBody');
        if (!tbody) return;
        
        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No transactions found</td></tr>`;
            return;
        }
        
        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td><strong>${t.id || 'DON-' + Math.floor(Math.random() * 1000000)}</strong></td>
                <td>${this.escapeHtml(t.donor_name || 'Anonymous')}</td>
                <td>${this.escapeHtml(t.campaign_title || 'Unknown Campaign')}</td>
                <td class="fw-bold text-success">${this.formatCurrency(t.amount)}</td>
                <td>${this.formatDateTime(t.created_at)}</td>
                <td>
                    <span class="badge bg-${t.status === 'completed' ? 'success' : 'warning'}">
                        ${t.status || 'pending'}
                    </span>
                </td>
                <td>
                    <span class="badge bg-info">${t.payment_method || 'QR Payment'}</span>
                </td>
            </tr>
        `).join('');
    }
    
    initRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();
        
        const campaigns = window.topCampaigns || [];
        
        if (campaigns.length === 0) {
            this.charts.revenue = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'Amount Raised (RM)',
                        data: [0],
                        backgroundColor: '#4e73df'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
            return;
        }
        
        const labels = campaigns.map(c => {
            let title = c.title || 'Campaign';
            return title.length > 20 ? title.substring(0, 17) + '...' : title;
        });
        const data = campaigns.map(c => parseFloat(c.current_amount || 0));
        
        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Amount Raised (RM)',
                    data: data,
                    backgroundColor: '#4e73df',
                    borderColor: '#4e73df',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => 'RM ' + context.raw.toLocaleString()
                        }
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
    }
    
    initCampaignStatusChart() {
        const ctx = document.getElementById('campaignStatusChart');
        if (!ctx) return;
        
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();
        
        const data = window.campaignStatusData || { active: 0, completed: 0, cancelled: 0 };
        
        this.charts.campaignStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Completed', 'Cancelled'],
                datasets: [{
                    data: [data.active, data.completed, data.cancelled],
                    backgroundColor: ['#1cc88a', '#6c757d', '#f6c23e']
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

    // ============================================
    // CREATE CAMPAIGN PAGE - Full original structure
    // ============================================
    
    getCreateCampaignHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Create New Campaign</h1>
                        <button class="btn btn-outline-primary" onclick="adminDashboard.openCampaignCreationModal()">
                            <i class="fas fa-plus me-2"></i> Create Campaign
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Campaign Creation (Admin Only)</h6>
                        </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="info-box bg-light p-4 rounded mb-4">
                                        <h5><i class="fas fa-info-circle text-primary me-2"></i>Instructions</h5>
                                        <ul class="mt-3">
                                            <li>Fill in all required fields (marked with *)</li>
                                            <li>Set realistic goal amounts and deadlines</li>
                                            <li>Upload high-quality images for better engagement</li>
                                            <li>Campaigns will be active immediately upon creation</li>
                                            <li>You can manage campaigns from the Campaigns page</li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="info-box bg-light p-4 rounded mb-4">
                                        <h5><i class="fas fa-lightbulb text-success me-2"></i>Tips for Success</h5>
                                        <ul class="mt-3">
                                            <li>Write compelling descriptions</li>
                                            <li>Use clear, specific categories</li>
                                            <li>Set achievable goals</li>
                                            <li>Include organization information for credibility</li>
                                            <li>Mark as featured for better visibility</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="text-center py-5 mt-4">
                                <i class="fas fa-hand-holding-heart fa-4x text-primary mb-4"></i>
                                <h4>Ready to Create a Campaign?</h4>
                                <p class="text-muted mb-4">Click the "Create Campaign" button to start a new fundraising campaign with all enhanced fields</p>
                                <button class="btn btn-primary btn-lg" onclick="adminDashboard.openCampaignCreationModal()">
                                    <i class="fas fa-plus me-2"></i> Create Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">Recently Created Campaigns</h6>
                            <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.loadRecentCampaigns()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="recentCampaignsContainer">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Loading recent campaigns...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadCreateCampaignData() {
        await this.loadRecentCampaigns();
    }
    
    async loadRecentCampaigns() {
        try {
            const data = await this.apiRequest('backend/api/campaigns/get-all.php?limit=5');
            
            if (data.success && Array.isArray(data.campaigns)) {
                this.renderRecentCampaigns(data.campaigns.slice(0, 5));
            } else {
                this.showNoRecentCampaigns();
            }
        } catch (error) {
            console.error('Error loading recent campaigns:', error);
            this.showNoRecentCampaigns();
        }
    }
    
    renderRecentCampaigns(campaigns) {
        const container = document.getElementById('recentCampaignsContainer');
        if (!container) return;
        
        if (!campaigns || campaigns.length === 0) {
            this.showNoRecentCampaigns();
            return;
        }
        
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Campaign</th>
                            <th>Category</th>
                            <th>Organizer</th>
                            <th>Goal</th>
                            <th>Raised</th>
                            <th>Progress</th>
                            <th>Status</th>
                            <th>Featured</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${campaigns.map(campaign => {
                            const progress = campaign.target_amount > 0 
                                ? ((campaign.current_amount || 0) / campaign.target_amount * 100) 
                                : 0;
                            
                            return `
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            ${campaign.image_url && campaign.image_url !== 'assets/images/default-campaign.jpg' ? 
                                                `<img src="${campaign.image_url}" alt="${this.escapeHtml(campaign.title)}" 
                                                    style="width: 40px; height: 40px; object-fit: cover;" class="rounded me-2">` : 
                                                `<div class="bg-light rounded d-flex align-items-center justify-content-center me-2" 
                                                    style="width: 40px; height: 40px;">
                                                    <i class="fas fa-hand-holding-heart text-muted"></i>
                                                </div>`
                                            }
                                            <div>
                                                <strong>${this.escapeHtml(campaign.title || 'Untitled')}</strong>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="badge bg-info">${this.escapeHtml(campaign.category || 'Uncategorized')}</span></td>
                                    <td>${this.escapeHtml(campaign.organizer || 'Not specified')}</td>
                                    <td class="fw-bold">${this.formatCurrency(campaign.target_amount || 0)}</td>
                                    <td class="fw-bold text-success">${this.formatCurrency(campaign.current_amount || 0)}</td>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <div class="progress flex-grow-1 me-2" style="height: 6px; width: 80px;">
                                                <div class="progress-bar ${progress >= 100 ? 'bg-success' : 'bg-primary'}" 
                                                    style="width: ${Math.min(progress, 100)}%"></div>
                                            </div>
                                            <small>${progress.toFixed(1)}%</small>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge bg-${campaign.status === 'active' ? 'success' : 'secondary'}">
                                            ${campaign.status || 'active'}
                                        </span>
                                    </td>
                                    <td>
                                        ${campaign.featured ? 
                                            '<span class="badge bg-warning"><i class="fas fa-star me-1"></i>Featured</span>' : 
                                            '<span class="badge bg-light text-muted">No</span>'
                                        }
                                    </td>
                                    <td><small>${this.formatDate(campaign.created_at)}</small></td>
                                    <td>
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-outline-primary" onclick="adminDashboard.viewCampaign(${campaign.id})" title="View Details">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn btn-outline-warning" onclick="adminDashboard.editCampaign(${campaign.id})" title="Edit">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    showNoRecentCampaigns() {
        const container = document.getElementById('recentCampaignsContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5>No campaigns created yet</h5>
                    <p class="text-muted">Create your first campaign to get started</p>
                </div>
            `;
        }
    }
    
    openCampaignCreationModal() {
        const modal = new bootstrap.Modal(document.getElementById('campaignCreationModal'));
        modal.show();
        
        const submitBtn = document.getElementById('submitCampaignForm');
        if (submitBtn) {
            submitBtn.onclick = () => this.submitCampaignForm();
        }
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endDateInput = document.querySelector('#campaignCreationForm input[name="end_date"]');
        if (endDateInput) {
            endDateInput.min = tomorrow.toISOString().split('T')[0];
        }
    }
    
    async submitCampaignForm() {
        const form = document.getElementById('campaignCreationForm');
        const formData = new FormData(form);
        const messageDiv = document.getElementById('campaignFormMessage');
        const submitBtn = document.getElementById('submitCampaignForm');
        const modal = bootstrap.Modal.getInstance(document.getElementById('campaignCreationModal'));
        
        const token = localStorage.getItem('micro_donation_token') || localStorage.getItem('token');
        const userString = localStorage.getItem('micro_donation_user') || localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        
        if (!user || !user.id || user.role !== 'admin') {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }

        // Debug: Log all form data
        console.log('Form data being submitted:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        // Validate required fields
        const title = formData.get('title');
        const description = formData.get('description');
        const category = formData.get('category');
        const goal_amount = formData.get('goal_amount');
        const end_date = formData.get('end_date');
        
        if (!title) {
            this.showNotification('Campaign title is required', 'error');
            return;
        }
        if (!description) {
            this.showNotification('Campaign description is required', 'error');
            return;
        }
        if (!category) {
            this.showNotification('Campaign category is required', 'error');
            return;
        }
        if (!goal_amount || goal_amount <= 0) {
            this.showNotification('Valid goal amount is required', 'error');
            return;
        }
        if (!end_date) {
            this.showNotification('End date is required', 'error');
            return;
        }

        // Add organizer if not set
        if (!formData.get('organizer')) {
            formData.append('organizer', user.name || 'CommunityGive');
        }
        
        // Ensure featured is properly set (checkbox returns 'on' when checked)
        if (formData.get('featured') === 'on') {
            formData.set('featured', '1');
        } else {
            formData.append('featured', '0');
        }
        
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
        
        try {
            messageDiv.style.display = 'block';
            messageDiv.className = 'alert alert-info';
            messageDiv.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating campaign...';
            
            const response = await fetch('backend/api/campaigns/create.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'X-User-ID': user.id,
                    'X-User-Role': user.role
                }
            });
            
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                throw new Error('Server returned invalid response');
            }
            
            if (result.success) {
                messageDiv.className = 'alert alert-success';
                messageDiv.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Success!</strong> ${result.message}
                    <br><small>Campaign ID: ${result.campaign_id}</small>
                `;
                
                form.reset();
                
                const previewContainer = document.getElementById('imagePreviewContainer');
                const preview = document.getElementById('imagePreview');
                if (previewContainer) previewContainer.style.display = 'none';
                if (preview) preview.src = '';
                
                this.showNotification('Campaign created successfully!', 'success');
                
                // Refresh campaign lists
                await this.loadAllCampaignsTable();
                await this.loadRecentCampaigns();
                
                setTimeout(() => {
                    if (modal) modal.hide();
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to create campaign');
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            messageDiv.className = 'alert alert-danger';
            messageDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Error!</strong> ${error.message}
            `;
            this.showNotification('Failed to create campaign: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // ============================================
    // CAMPAIGNS PAGE - Full original structure with filters, search, sort
    // ============================================
    
    getCampaignsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Campaign Management</h1>
                        <div class="d-flex">
                            <button class="btn btn-primary me-2" onclick="adminDashboard.loadPage('create-campaign')">
                                <i class="fas fa-plus me-2"></i> Create New Campaign
                            </button>
                            <button class="btn btn-outline-primary" onclick="adminDashboard.loadAllCampaignsTable()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active Campaigns -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">All Campaigns</h6>
                            <div>
                                <button class="btn btn-sm btn-outline-primary me-2" onclick="adminDashboard.exportCampaigns()">
                                    <i class="fas fa-download"></i> Export
                                </button>
                                <button class="btn btn-sm btn-success" onclick="adminDashboard.loadPage('create-campaign')">
                                    <i class="fas fa-plus"></i> New Campaign
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="campaignsTableContainer">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Loading campaigns...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Campaign Statistics -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Campaign Statistics</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <div class="stat-card">
                                        <h6>Total Campaigns</h6>
                                        <div class="metric-value" id="totalCampaignsCount">0</div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stat-card">
                                        <h6>Active Campaigns</h6>
                                        <div class="metric-value" id="activeCampaignsCount2">0</div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stat-card">
                                        <h6>Completed Campaigns</h6>
                                        <div class="metric-value" id="completedCampaignsCount">0</div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="stat-card">
                                        <h6>Success Rate</h6>
                                        <div class="metric-value" id="campaignSuccessRate">0%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadCampaignsData() {
        await this.loadAllCampaignsTable();
        await this.loadCampaignStatistics();
    }

    async loadCampaignStatistics() {
        try {
            const data = await this.apiRequest('backend/api/campaigns/get-all.php');
            
            if (data.success && Array.isArray(data.campaigns)) {
                const campaigns = data.campaigns;
                
                const totalCampaigns = campaigns.length;
                const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
                const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
                const successfulCampaigns = campaigns.filter(c => 
                    parseFloat(c.current_amount || 0) >= parseFloat(c.target_amount || 1)
                ).length;
                
                const successRate = totalCampaigns > 0 ? Math.round((successfulCampaigns / totalCampaigns) * 100) : 0;
                
                document.getElementById('totalCampaignsCount').textContent = totalCampaigns;
                document.getElementById('activeCampaignsCount2').textContent = activeCampaigns;
                document.getElementById('completedCampaignsCount').textContent = completedCampaigns;
                document.getElementById('campaignSuccessRate').textContent = successRate + '%';
            }
        } catch (error) {
            console.error('Error loading campaign statistics:', error);
        }
    }

    async loadAllCampaignsTable() {
        try {
            const container = document.getElementById('campaignsTableContainer');
            if (!container) return;
            
            container.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading campaigns...</p>
                </div>
            `;
            
            const result = await this.apiRequest('backend/api/campaigns/get-all.php');
            
            if (result.success && Array.isArray(result.campaigns)) {
                this.allCampaigns = result.campaigns;
                this.currentCampaigns = [...result.campaigns];
                this.currentFilter = 'all';
                
                console.log('Campaigns loaded. Total:', this.allCampaigns.length);
                this.renderCampaignsTable();
            } else {
                this.showNotification('No campaigns found', 'warning');
            }
        } catch (error) {
            console.error('Error loading campaigns table:', error);
            this.showNotification('Failed to load campaigns: ' + error.message, 'error');
            
            const container = document.getElementById('campaignsTableContainer');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load campaigns: ${error.message}
                    </div>
                    <div class="text-center mt-3">
                        <button class="btn btn-primary" onclick="adminDashboard.loadAllCampaignsTable()">
                            <i class="fas fa-redo me-2"></i> Try Again
                        </button>
                    </div>
                `;
            }
        }
    }

    renderCampaignsTable() {
        const container = document.getElementById('campaignsTableContainer');
        if (!container) return;

        if (!this.allCampaigns) this.allCampaigns = [];
        if (!this.currentCampaigns) this.currentCampaigns = [];

        const displayCampaigns = this.currentCampaigns;
        
        if (!Array.isArray(displayCampaigns) || displayCampaigns.length === 0) {
            if (this.allCampaigns && this.allCampaigns.length > 0 && this.currentFilter !== 'all') {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-filter fa-3x text-muted mb-3"></i>
                        <h5>No ${this.currentFilter} campaigns found</h5>
                        <p class="text-muted">No campaigns match the current filter</p>
                        <button class="btn btn-primary mt-3" onclick="adminDashboard.filterCampaigns('all')">
                            <i class="fas fa-list me-2"></i> Show All Campaigns
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h5>No campaigns created yet</h5>
                        <p class="text-muted">Create your first campaign to get started</p>
                        <button class="btn btn-primary mt-3" onclick="adminDashboard.loadPage('create-campaign')">
                            <i class="fas fa-plus me-2"></i> Create Campaign
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        const allCount = this.allCampaigns.length;
        const activeCount = this.allCampaigns.filter(c => c.status === 'active').length;
        const completedCount = this.allCampaigns.filter(c => c.status === 'completed').length;
        const cancelledCount = this.allCampaigns.filter(c => 
            c.status?.toLowerCase() === 'cancelled' || c.status?.toLowerCase() === 'canceled'
        ).length;
        
        let html = `
            <!-- Search and Filter Controls -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="input-group">
                        <span class="input-group-text bg-white border-end-0">
                            <i class="fas fa-search text-muted"></i>
                        </span>
                        <input type="text" 
                            class="form-control border-start-0" 
                            id="campaignSearchInput" 
                            placeholder="Search campaigns by title, organizer, or category..."
                            onkeyup="adminDashboard.searchCampaigns(this.value)"
                            value="${this.currentSearchTerm || ''}">
                        <button class="btn btn-outline-secondary" 
                                type="button" 
                                onclick="adminDashboard.clearSearch()"
                                title="Clear search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="btn-group w-100" role="group">
                        <button type="button" 
                                class="btn btn-outline-primary ${this.currentFilter === 'all' ? 'active' : ''}" 
                                onclick="adminDashboard.filterCampaigns('all')"
                                id="filterAll">
                            All <span class="badge bg-primary ms-1">${allCount}</span>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-success ${this.currentFilter === 'active' ? 'active' : ''}" 
                                onclick="adminDashboard.filterCampaigns('active')"
                                id="filterActive">
                            Active <span class="badge bg-success ms-1">${activeCount}</span>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-info ${this.currentFilter === 'completed' ? 'active' : ''}" 
                                onclick="adminDashboard.filterCampaigns('completed')"
                                id="filterCompleted">
                            Completed <span class="badge bg-info ms-1">${completedCount}</span>
                        </button>
                        <button type="button" 
                                class="btn btn-outline-danger ${this.currentFilter === 'cancelled' ? 'active' : ''}" 
                                onclick="adminDashboard.filterCampaigns('cancelled')"
                                id="filterCancelled">
                            Cancelled <span class="badge bg-danger ms-1">${cancelledCount}</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Sort Controls -->
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <small class="text-muted">
                        Showing ${displayCampaigns.length} of ${allCount} campaign${allCount !== 1 ? 's' : ''}
                        ${this.currentFilter !== 'all' ? ` (Filtered by ${this.currentFilter})` : ''}
                    </small>
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                            type="button" 
                            id="sortDropdown"
                            data-bs-toggle="dropdown"
                            aria-expanded="false">
                        <i class="fas fa-sort me-1"></i> Sort by
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="sortDropdown">
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('created_at', 'desc')">
                            <i class="fas fa-calendar me-2"></i> Newest First
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('created_at', 'asc')">
                            <i class="fas fa-calendar me-2"></i> Oldest First
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('title', 'asc')">
                            <i class="fas fa-font me-2"></i> Title A-Z
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('title', 'desc')">
                            <i class="fas fa-font me-2"></i> Title Z-A
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('target_amount', 'desc')">
                            <i class="fas fa-money-bill-wave me-2"></i> Highest Target
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('target_amount', 'asc')">
                            <i class="fas fa-money-bill-wave me-2"></i> Lowest Target
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('current_amount', 'desc')">
                            <i class="fas fa-chart-line me-2"></i> Most Raised
                        </a></li>
                    </ul>
                </div>
            </div>
            
            <!-- Campaigns Table -->
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>CAMPAIGN</th>
                            <th>CATEGORY</th>
                            <th>TARGET</th>
                            <th>RAISED</th>
                            <th>PROGRESS</th>
                            <th>DONORS</th>
                            <th>DAYS LEFT</th>
                            <th>STATUS</th>
                            <th>CREATED</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        displayCampaigns.forEach(campaign => {
            const targetAmount = parseFloat(campaign.target_amount || 0);
            const currentAmount = parseFloat(campaign.current_amount || 0);
            const donorsCount = parseInt(campaign.donors_count || 0);
            
            let daysLeft = 0;
            if (campaign.end_date) {
                const endDate = new Date(campaign.end_date);
                const today = new Date();
                daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            }
            
            const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount * 100) : 0;
            const safeProgress = Math.min(Math.max(progressPercentage, 0), 100);
            
            let statusColor = 'secondary';
            let statusText = campaign.status || 'active';
            switch(statusText.toLowerCase()) {
                case 'active': statusColor = 'success'; statusText = 'Active'; break;
                case 'completed': statusColor = 'info'; statusText = 'Completed'; break;
                case 'cancelled': statusColor = 'danger'; statusText = 'Cancelled'; break;
                default: statusColor = 'secondary'; statusText = statusText;
            }
            
            html += `
                <tr>
                    <td><strong>#${campaign.id}</strong></td>
                    <td>
                        <div class="d-flex align-items-center">
                            ${campaign.image_url ? 
                                (campaign.image_url.includes('uploads/') ? 
                                    `<img src="/micro-donation-portal/${campaign.image_url}" 
                                        alt="${this.escapeHtml(campaign.title)}" 
                                        class="rounded me-2" 
                                        style="width: 40px; height: 40px; object-fit: cover;"
                                        onerror="this.onerror=null; this.src='assets/images/default-campaign.jpg';">` :
                                    (campaign.image_url !== 'assets/images/default-campaign.jpg' ?
                                        `<img src="${campaign.image_url}" 
                                            alt="${this.escapeHtml(campaign.title)}" 
                                            class="rounded me-2" 
                                            style="width: 40px; height: 40px; object-fit: cover;"
                                            onerror="this.onerror=null; this.src='assets/images/default-campaign.jpg';">` :
                                        `<div class="rounded me-2 d-flex align-items-center justify-content-center bg-light" 
                                            style="width: 40px; height: 40px;">
                                            <i class="fas fa-hand-holding-heart text-muted"></i>
                                        </div>`
                                    )
                                ) : 
                                `<div class="rounded me-2 d-flex align-items-center justify-content-center bg-light" 
                                    style="width: 40px; height: 40px;">
                                    <i class="fas fa-hand-holding-heart text-muted"></i>
                                </div>`
                            }
                            <div>
                                <strong class="d-block">${this.escapeHtml(campaign.title || 'Untitled Campaign')}</strong>
                                <small class="text-muted">${this.escapeHtml(campaign.organizer || 'No organizer')}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-info">${this.escapeHtml(campaign.category || 'Uncategorized')}</span></td>
                    <td class="fw-bold text-primary">${this.formatCurrency(targetAmount)}</td>
                    <td class="fw-bold ${currentAmount > 0 ? 'text-success' : 'text-muted'}">
                        ${this.formatCurrency(currentAmount)}
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height: 8px;">
                                <div class="progress-bar ${safeProgress >= 100 ? 'bg-success' : safeProgress >= 50 ? 'bg-warning' : 'bg-info'}" 
                                    style="width: ${safeProgress}%"></div>
                            </div>
                            <span class="fw-bold ${safeProgress >= 100 ? 'text-success' : 'text-dark'}">
                                ${safeProgress.toFixed(1)}%
                            </span>
                        </div>
                    </td>
                    <td><span class="badge ${donorsCount > 0 ? 'bg-success' : 'bg-secondary'}">${donorsCount}</span></td>
                    <td>
                        ${daysLeft > 0 ? 
                            `<span class="badge ${daysLeft < 7 ? 'bg-danger' : daysLeft < 30 ? 'bg-warning' : 'bg-info'}">
                                ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}
                            </span>` : 
                            `<span class="badge bg-secondary">Ended</span>`
                        }
                    </td>
                    <td><span class="badge bg-${statusColor}">${statusText}</span></td>
                    <td><small>${this.formatDate(campaign.created_at)}</small></td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary" 
                                    onclick="adminDashboard.viewCampaign(${campaign.id})" 
                                    title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-info" 
                                    onclick="adminDashboard.editCampaign(${campaign.id})" 
                                    title="Edit Campaign">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" 
                                    onclick="adminDashboard.deleteCampaign(${campaign.id})" 
                                    title="Delete Campaign">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3 d-flex justify-content-between align-items-center">
                <div>
                    <strong>Total:</strong> ${displayCampaigns.length} campaign${displayCampaigns.length !== 1 ? 's' : ''}
                </div>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.loadAllCampaignsTable()">
                        <i class="fas fa-redo me-1"></i> Refresh
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="adminDashboard.exportCampaigns()">
                        <i class="fas fa-download me-1"></i> Export
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // Search functionality
    searchCampaigns(searchTerm) {
        if (!this.allCampaigns) return;
        
        const term = searchTerm.toLowerCase().trim();
        this.currentSearchTerm = term;
        
        if (!term) {
            this.filterCampaigns(this.currentFilter);
            return;
        }
        
        let baseCampaigns = this.allCampaigns;
        if (this.currentFilter !== 'all') {
            baseCampaigns = this.filterCampaignsByStatus(this.allCampaigns, this.currentFilter);
        }
        
        const searchedCampaigns = baseCampaigns.filter(campaign => {
            return (
                (campaign.title && campaign.title.toLowerCase().includes(term)) ||
                (campaign.description && campaign.description.toLowerCase().includes(term)) ||
                (campaign.category && campaign.category.toLowerCase().includes(term)) ||
                (campaign.organizer && campaign.organizer.toLowerCase().includes(term))
            );
        });
        
        this.currentCampaigns = searchedCampaigns;
        this.renderCampaignsTable();
        
        if (term) {
            this.showNotification(`Found ${searchedCampaigns.length} campaigns matching "${term}"`, 'info');
        }
    }

    filterCampaignsByStatus(campaigns, status) {
        switch(status) {
            case 'active': return campaigns.filter(c => c.status === 'active');
            case 'completed': return campaigns.filter(c => c.status === 'completed');
            case 'cancelled': return campaigns.filter(c => 
                c.status?.toLowerCase() === 'cancelled' || c.status?.toLowerCase() === 'canceled'
            );
            default: return campaigns;
        }
    }

    clearSearch() {
        this.currentSearchTerm = '';
        const searchInput = document.getElementById('campaignSearchInput');
        if (searchInput) searchInput.value = '';
        this.filterCampaigns(this.currentFilter);
    }

    filterCampaigns(status) {
        if (!this.allCampaigns || this.allCampaigns.length === 0) {
            this.loadAllCampaignsTable().then(() => this.filterCampaigns(status));
            return;
        }
        
        this.currentFilter = status;
        
        let filteredCampaigns;
        switch(status) {
            case 'active': filteredCampaigns = this.allCampaigns.filter(c => c.status === 'active'); break;
            case 'completed': filteredCampaigns = this.allCampaigns.filter(c => c.status === 'completed'); break;
            case 'cancelled': filteredCampaigns = this.allCampaigns.filter(c => 
                c.status?.toLowerCase() === 'cancelled' || c.status?.toLowerCase() === 'canceled'
            ); break;
            default: filteredCampaigns = this.allCampaigns; break;
        }
        
        this.currentCampaigns = filteredCampaigns;
        this.currentSearchTerm = '';
        
        const searchInput = document.getElementById('campaignSearchInput');
        if (searchInput) searchInput.value = '';
        
        this.renderCampaignsTable();
        
        if (status !== 'all') {
            this.showNotification(`Showing ${filteredCampaigns.length} ${status} campaigns`, 'info');
        }
    }

    sortCampaigns(field, direction = 'asc') {
        if (!this.allCampaigns || this.allCampaigns.length === 0) return;
        
        const sortedCampaigns = [...this.allCampaigns];
        
        sortedCampaigns.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            if (field.includes('amount') || field.includes('progress') || field.includes('percentage')) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (field.includes('date') || field.includes('created') || field.includes('updated')) {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else if (field.includes('count') || field.includes('donors') || field.includes('days')) {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
        
        this.allCampaigns = sortedCampaigns;
        
        if (this.currentFilter !== 'all') {
            this.currentCampaigns = this.filterCampaignsByStatus(sortedCampaigns, this.currentFilter);
        } else {
            this.currentCampaigns = sortedCampaigns;
        }
        
        this.renderCampaignsTable();
        
        const fieldNames = {
            'created_at': 'Date Created',
            'title': 'Title',
            'target_amount': 'Target Amount',
            'current_amount': 'Amount Raised',
            'donors_count': 'Donor Count'
        };
        
        const dirText = direction === 'asc' ? 'Ascending' : 'Descending';
        this.showNotification(`Sorted by ${fieldNames[field] || field} (${dirText})`, 'info');
    }

    async viewCampaign(campaignId) {
        try {
            this.showNotification('Loading campaign details...', 'info');
            
            const result = await this.apiRequest(`backend/api/campaigns/get-single.php?id=${campaignId}`);
            
            if (!result.success || !result.campaign) {
                throw new Error(result.message || 'Campaign not found');
            }
            
            this.showCampaignDetailsModal(result.campaign);
        } catch (error) {
            console.error('Error viewing campaign:', error);
            this.showNotification('Failed to load campaign details: ' + error.message, 'error');
        }
    }

    showCampaignDetailsModal(campaign) {
        const modalId = 'viewCampaignModal';
        let modal = document.getElementById(modalId);
        
        if (modal) modal.remove();
        
        const targetAmount = parseFloat(campaign.target_amount || 0);
        const currentAmount = parseFloat(campaign.current_amount || 0);
        const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount * 100) : 0;
        
        const statusColor = {
            'active': 'success',
            'completed': 'info',
            'cancelled': 'danger',
            'pending': 'warning'
        }[campaign.status?.toLowerCase()] || 'secondary';
        
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-hand-holding-heart me-2"></i>
                            Campaign Details
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-4">
                            ${campaign.image_url && campaign.image_url !== 'assets/images/default-campaign.jpg' ? 
                                `<img src="${campaign.image_url}" alt="${this.escapeHtml(campaign.title)}" 
                                    class="img-fluid rounded" style="max-height: 250px; object-fit: cover;">` : 
                                `<div class="bg-light rounded d-flex align-items-center justify-content-center p-5">
                                    <i class="fas fa-hand-holding-heart fa-5x text-primary opacity-50"></i>
                                </div>`
                            }
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h3 class="mb-1">${this.escapeHtml(campaign.title || 'Untitled Campaign')}</h3>
                                <span class="badge bg-${statusColor} fs-6">${campaign.status || 'Unknown'}</span>
                                ${campaign.featured ? '<span class="badge bg-warning ms-2 fs-6"><i class="fas fa-star me-1"></i>Featured</span>' : ''}
                            </div>
                            <div class="text-end">
                                <small class="text-muted d-block">Campaign ID</small>
                                <strong>#${campaign.id}</strong>
                            </div>
                        </div>
                        
                        <div class="card bg-light mb-4">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col-md-8">
                                        <div class="d-flex justify-content-between mb-1">
                                            <span class="fw-bold">Progress</span>
                                            <span class="fw-bold text-${progressPercentage >= 100 ? 'success' : 'primary'}">
                                                ${progressPercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div class="progress" style="height: 10px;">
                                            <div class="progress-bar ${progressPercentage >= 100 ? 'bg-success' : 'bg-primary'}" 
                                                style="width: ${Math.min(progressPercentage, 100)}%"></div>
                                        </div>
                                        <div class="d-flex justify-content-between mt-2">
                                            <span class="text-success fw-bold">${this.formatCurrency(currentAmount)}</span>
                                            <span class="text-muted">of ${this.formatCurrency(targetAmount)}</span>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="text-center border-start ps-3">
                                            <div class="mb-2">
                                                <i class="fas fa-users fa-2x text-primary"></i>
                                                <div class="h4 mb-0">${campaign.donors_count || 0}</div>
                                                <small class="text-muted">Total Donors</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <div class="card h-100">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Basic Information</h6>
                                    </div>
                                    <div class="card-body">
                                        <table class="table table-sm">
                                            <tr>
                                                <th style="width: 40%;">Category:</th>
                                                <td><span class="badge bg-info">${this.escapeHtml(campaign.category || 'Uncategorized')}</span></td>
                                            </tr>
                                            <tr>
                                                <th>Organizer:</th>
                                                <td>${this.escapeHtml(campaign.organizer || 'Not specified')}</td>
                                            </tr>
                                            <tr>
                                                <th>Created By:</th>
                                                <td>${this.escapeHtml(campaign.created_by_name || 'System')}</td>
                                            </tr>
                                            <tr>
                                                <th>Created Date:</th>
                                                <td>${this.formatDate(campaign.created_at)}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-6 mb-3">
                                <div class="card h-100">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0"><i class="fas fa-clock me-2"></i>Timeline & Goals</h6>
                                    </div>
                                    <div class="card-body">
                                        <table class="table table-sm">
                                            <tr>
                                                <th style="width: 40%;">Target Amount:</th>
                                                <td class="fw-bold text-primary">${this.formatCurrency(targetAmount)}</td>
                                            </tr>
                                            <tr>
                                                <th>Current Raised:</th>
                                                <td class="fw-bold text-success">${this.formatCurrency(currentAmount)}</td>
                                            </tr>
                                            <tr>
                                                <th>End Date:</th>
                                                <td>${campaign.end_date ? this.formatDate(campaign.end_date) : 'No end date'}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <h6 class="mb-0"><i class="fas fa-align-left me-2"></i>Description</h6>
                            </div>
                            <div class="card-body">
                                <p class="mb-0" style="white-space: pre-line;">${this.escapeHtml(campaign.description || 'No description provided.')}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-primary" onclick="adminDashboard.editCampaign(${campaign.id})">
                            <i class="fas fa-edit me-2"></i>Edit Campaign
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    }

    async editCampaign(campaignId) {
        try {
            this.showNotification('Loading campaign data for editing...', 'info');
            
            // Fetch current campaign data
            const result = await this.apiRequest(`backend/api/campaigns/get-single.php?id=${campaignId}`);
            
            if (!result.success || !result.campaign) {
                throw new Error(result.message || 'Campaign not found');
            }
            
            const campaign = result.campaign;
            
            // Create and show edit modal
            this.showEditCampaignModal(campaign);
            
        } catch (error) {
            console.error('Error loading campaign for edit:', error);
            this.showNotification('Failed to load campaign: ' + error.message, 'error');
        }
    }

    /**
     * Show Edit Campaign Modal with all editable fields (No Video URL, No Location, Simplified Organization)
     */
    showEditCampaignModal(campaign) {
        const modalId = 'editCampaignModal';
        let modal = document.getElementById(modalId);
        
        if (modal) modal.remove();
        
        // Format date for input (YYYY-MM-DD)
        let endDate = '';
        if (campaign.end_date) {
            const date = new Date(campaign.end_date);
            endDate = date.toISOString().split('T')[0];
        }
        
        // Get tomorrow's date for min date validation
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('data-bs-backdrop', 'static');
        modal.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>
                            Edit Campaign #${campaign.id}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editCampaignForm" enctype="multipart/form-data">
                            <input type="hidden" name="campaign_id" value="${campaign.id}">
                            
                            <!-- Campaign ID Display (read-only) -->
                            <div class="row mb-3">
                                <div class="col-md-12">
                                    <div class="alert alert-info py-2 mb-0">
                                        <i class="fas fa-info-circle me-2"></i>
                                        Editing Campaign ID: <strong>#${campaign.id}</strong> | 
                                        Created: <strong>${this.formatDate(campaign.created_at)}</strong> | 
                                        Status: <strong class="text-${campaign.status === 'active' ? 'success' : 'secondary'}">${campaign.status || 'active'}</strong>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <!-- Left Column - Basic Info -->
                                <div class="col-md-8">
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Basic Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <!-- Title -->
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Campaign Title <span class="text-danger">*</span></label>
                                                <input type="text" 
                                                    class="form-control" 
                                                    name="title" 
                                                    value="${this.escapeHtml(campaign.title || '')}" 
                                                    required 
                                                    maxlength="255"
                                                    placeholder="Enter campaign title">
                                                <div class="form-text">Maximum 255 characters</div>
                                            </div>
                                            
                                            <!-- Description -->
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Description <span class="text-danger">*</span></label>
                                                <textarea class="form-control" 
                                                        name="description" 
                                                        rows="5" 
                                                        required
                                                        placeholder="Describe your campaign, its purpose, and how donations will be used">${this.escapeHtml(campaign.description || '')}</textarea>
                                                <div class="form-text">Detailed description helps donors understand your campaign</div>
                                            </div>
                                            
                                            <!-- Short Description -->
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Short Description / Tagline</label>
                                                <input type="text" 
                                                    class="form-control" 
                                                    name="short_description" 
                                                    value="${this.escapeHtml(campaign.short_description || '')}" 
                                                    maxlength="100"
                                                    placeholder="Brief tagline for your campaign">
                                                <div class="form-text">A short, catchy description (max 100 characters)</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Media Section -->
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="fas fa-image me-2"></i>Campaign Image</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-12">
                                                    <label class="form-label fw-bold">Campaign Image</label>
                                                    <div class="current-image mb-2">
                                                        <small class="text-muted d-block mb-1">Current Image:</small>
                                                        ${campaign.image_url && campaign.image_url !== 'assets/images/default-campaign.jpg' ? 
                                                            `<img src="${campaign.image_url}" 
                                                                alt="Current campaign image" 
                                                                style="max-width: 200px; max-height: 150px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; padding: 3px;">` : 
                                                            `<div class="text-muted">No image uploaded</div>`
                                                        }
                                                    </div>
                                                    <input type="file" 
                                                        class="form-control" 
                                                        name="image" 
                                                        accept="image/jpeg,image/png,image/gif,image/webp">
                                                    <div class="form-text">Leave empty to keep current image. Max 5MB. JPG, PNG, GIF, WebP</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Right Column - Settings & Goals -->
                                <div class="col-md-4">
                                    <!-- Campaign Status -->
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="fas fa-toggle-on me-2"></i>Campaign Status</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Status</label>
                                                <select class="form-select" name="status">
                                                    <option value="active" ${campaign.status === 'active' ? 'selected' : ''}>🟢 Active</option>
                                                    <option value="completed" ${campaign.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                                                    <option value="cancelled" ${campaign.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                                                    <option value="draft" ${campaign.status === 'draft' ? 'selected' : ''}>📝 Draft</option>
                                                </select>
                                                <div class="form-text">Active campaigns are visible to donors</div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" 
                                                        type="checkbox" 
                                                        name="featured" 
                                                        id="featuredCheckbox"
                                                        ${campaign.featured ? 'checked' : ''}
                                                        value="1">
                                                    <label class="form-check-label fw-bold" for="featuredCheckbox">
                                                        <i class="fas fa-star text-warning me-1"></i> Featured Campaign
                                                    </label>
                                                    <div class="form-text">Featured campaigns appear prominently on the homepage</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Campaign Goals -->
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="fas fa-bullseye me-2"></i>Goals & Dates</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Category <span class="text-danger">*</span></label>
                                                <select class="form-select" name="category" required>
                                                    <option value="">Select a category</option>
                                                    <option value="Education" ${campaign.category === 'Education' ? 'selected' : ''}>📚 Education</option>
                                                    <option value="Healthcare" ${campaign.category === 'Healthcare' ? 'selected' : ''}>🏥 Healthcare</option>
                                                    <option value="Disaster Relief" ${campaign.category === 'Disaster Relief' ? 'selected' : ''}>🌊 Disaster Relief</option>
                                                    <option value="Environment" ${campaign.category === 'Environment' ? 'selected' : ''}>🌱 Environment</option>
                                                    <option value="Animals" ${campaign.category === 'Animals' ? 'selected' : ''}>🐾 Animals</option>
                                                    <option value="Community" ${campaign.category === 'Community' ? 'selected' : ''}>🏘️ Community</option>
                                                    <option value="Arts & Culture" ${campaign.category === 'Arts & Culture' ? 'selected' : ''}>🎨 Arts & Culture</option>
                                                    <option value="Sports" ${campaign.category === 'Sports' ? 'selected' : ''}>⚽ Sports</option>
                                                    <option value="Technology" ${campaign.category === 'Technology' ? 'selected' : ''}>💻 Technology</option>
                                                    <option value="Other" ${campaign.category === 'Other' ? 'selected' : ''}>🔄 Other</option>
                                                </select>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Target Amount (RM) <span class="text-danger">*</span></label>
                                                <div class="input-group">
                                                    <span class="input-group-text">RM</span>
                                                    <input type="number" 
                                                        class="form-control" 
                                                        name="target_amount" 
                                                        value="${parseFloat(campaign.target_amount || 0)}" 
                                                        min="1" 
                                                        step="0.01"
                                                        required>
                                                </div>
                                                <div class="form-text">Minimum: RM 1.00</div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Current Amount (RM)</label>
                                                <div class="input-group">
                                                    <span class="input-group-text">RM</span>
                                                    <input type="number" 
                                                        class="form-control" 
                                                        name="current_amount" 
                                                        value="${parseFloat(campaign.current_amount || 0)}" 
                                                        min="0" 
                                                        step="0.01"
                                                        readonly
                                                        style="background-color: #f8f9fa;">
                                                </div>
                                                <div class="form-text text-muted">
                                                    <i class="fas fa-info-circle"></i> Current amount cannot be edited directly. Update via donations.
                                                </div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">End Date</label>
                                                <input type="date" 
                                                    class="form-control" 
                                                    name="end_date" 
                                                    value="${endDate}"
                                                    min="${minDate}">
                                                <div class="form-text">Leave empty for no end date</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Organization Info - Simplified to just Organizer Name -->
                                    <div class="card mb-3">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0"><i class="fas fa-building me-2"></i>Organization</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Organizer Name</label>
                                                <input type="text" 
                                                    class="form-control" 
                                                    name="organizer" 
                                                    value="${this.escapeHtml(campaign.organizer || '')}" 
                                                    placeholder="Organization or individual name">
                                                <div class="form-text">Name of the organization or person running this campaign</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <div class="d-flex justify-content-between align-items-center w-100">
                            <div>
                                <span class="text-muted me-3">
                                    <i class="fas fa-calendar me-1"></i> Created: ${this.formatDate(campaign.created_at)}
                                </span>
                                <span class="text-muted">
                                    <i class="fas fa-hand-holding-heart me-1"></i> Raised: ${this.formatCurrency(campaign.current_amount || 0)}
                                </span>
                            </div>
                            <div>
                                <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">
                                    <i class="fas fa-times me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-danger me-2" onclick="adminDashboard.deleteCampaign(${campaign.id})" data-bs-dismiss="modal">
                                    <i class="fas fa-trash me-2"></i>Delete
                                </button>
                                <button type="button" class="btn btn-primary" onclick="adminDashboard.submitEditCampaign()">
                                    <i class="fas fa-save me-2"></i>Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    }

    /**
     * Submit edited campaign data - FIXED to match backend field names
     */
    async submitEditCampaign() {
        const form = document.getElementById('editCampaignForm');
        const formData = new FormData(form);
        const modal = document.getElementById('editCampaignModal');
        const submitBtn = document.querySelector('#editCampaignModal .btn-primary');
        
        // Get admin token and user info
        const token = localStorage.getItem('micro_donation_token') || localStorage.getItem('token');
        const userString = localStorage.getItem('micro_donation_user') || localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        
        if (!user || user.role !== 'admin') {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }
        
        // Debug: Log all form data
        console.log('Form data being submitted:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        // IMPORTANT: Map frontend field names to backend expected field names
        const backendFormData = new FormData();
        
        // Campaign ID
        backendFormData.append('campaign_id', formData.get('campaign_id'));
        
        // Basic Info - Map to backend field names
        backendFormData.append('title', formData.get('title') || '');
        backendFormData.append('description', formData.get('description') || '');
        backendFormData.append('category', formData.get('category') || '');
        
        // Goals & Dates - Map to backend field names
        backendFormData.append('goal_amount', formData.get('target_amount') || '0'); // target_amount -> goal_amount
        backendFormData.append('end_date', formData.get('end_date') || ''); // end_date stays as end_date
        
        // Status & Featured
        backendFormData.append('status', formData.get('status') || 'active');
        backendFormData.append('featured', formData.get('featured') === '1' || formData.get('featured') === 'on' ? '1' : '0');
        
        // Organization - Just organizer name
        backendFormData.append('organizer', formData.get('organizer') || '');
        
        // Handle image upload if present
        const imageFile = formData.get('image');
        if (imageFile && imageFile.size > 0) {
            backendFormData.append('campaign_image', imageFile); // image -> campaign_image
        }
        
        // Debug: Log mapped form data
        console.log('Mapped backend form data:');
        for (let [key, value] of backendFormData.entries()) {
            if (key !== 'campaign_image') {
                console.log(`${key}: ${value}`);
            } else {
                console.log(`${key}: [File: ${value.name}, Size: ${value.size}]`);
            }
        }
        
        // Validate required fields
        const title = backendFormData.get('title');
        const description = backendFormData.get('description');
        const category = backendFormData.get('category');
        const goal_amount = backendFormData.get('goal_amount');
        
        if (!title || title.trim() === '') {
            this.showNotification('Campaign title is required', 'error');
            return;
        }
        
        if (!description || description.trim() === '') {
            this.showNotification('Campaign description is required', 'error');
            return;
        }
        
        if (!category) {
            this.showNotification('Please select a category', 'error');
            return;
        }
        
        if (!goal_amount || parseFloat(goal_amount) <= 0) {
            this.showNotification('Valid target amount is required', 'error');
            return;
        }
        
        // Disable submit button and show loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        try {
            const response = await fetch('backend/api/campaigns/update.php', {
                method: 'POST',
                body: backendFormData, // Use mapped form data
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'X-User-ID': user.id,
                    'X-User-Role': user.role
                }
                // Don't set Content-Type header - let browser set it with boundary for FormData
            });
            
            const responseText = await response.text();
            console.log('Edit campaign response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                throw new Error('Server returned invalid response');
            }
            
            if (result.success) {
                this.showNotification('Campaign updated successfully!', 'success');
                
                // Close modal
                if (modal) {
                    const bootstrapModal = bootstrap.Modal.getInstance(modal);
                    if (bootstrapModal) bootstrapModal.hide();
                }
                
                // Refresh all campaign data
                await this.loadAllCampaignsTable();
                await this.loadCampaignStats();
                await this.loadCampaignStatistics();
                
                // Also refresh any open analytics/statistics pages
                if (this.currentPage === 'campaigns') {
                    await this.loadCampaignsData();
                } else if (this.currentPage === 'analytics') {
                    await this.loadAnalyticsData();
                } else if (this.currentPage === 'statistics') {
                    await this.loadStatisticsData();
                }
                
            } else {
                throw new Error(result.message || 'Failed to update campaign');
            }
            
        } catch (error) {
            console.error('Error updating campaign:', error);
            this.showNotification('Failed to update campaign: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    stripHtml(html) {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }

    async deleteCampaign(campaignId) {
        try {
            const campaign = this.allCampaigns.find(c => c.id === campaignId);
            const confirmed = await this.showDeleteConfirmation(campaignId, campaign?.title);
            if (!confirmed) return;
            
            const deleteBtn = document.querySelector(`button[onclick="adminDashboard.deleteCampaign(${campaignId})"]`);
            const originalHtml = deleteBtn?.innerHTML || '';
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            }
            
            // Get token and user info
            const token = localStorage.getItem('micro_donation_token') || localStorage.getItem('token');
            const userString = localStorage.getItem('micro_donation_user') || localStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            
            if (!user || user.role !== 'admin') {
                this.showNotification('Access denied. Admin privileges required.', 'error');
                return;
            }
            
            const response = await fetch('backend/api/campaigns/delete.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token,
                    'X-User-ID': user.id,        // ADD THIS
                    'X-User-Role': user.role      // ADD THIS
                },
                body: JSON.stringify({ campaign_id: campaignId })
            });
            
            const result = await response.json();
            
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalHtml;
            }
            
            if (result.success) {
                this.showNotification(result.message || 'Campaign deleted successfully', 'success');
                
                this.allCampaigns = this.allCampaigns.filter(c => c.id !== campaignId);
                this.currentCampaigns = this.currentCampaigns.filter(c => c.id !== campaignId);
                
                this.renderCampaignsTable();
                this.loadCampaignStatistics();
            } else {
                throw new Error(result.message || 'Failed to delete campaign');
            }
        } catch (error) {
            console.error('Error deleting campaign:', error);
            
            const deleteBtn = document.querySelector(`button[onclick="adminDashboard.deleteCampaign(${campaignId})"]`);
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            }
            
            this.showNotification('Failed to delete campaign: ' + error.message, 'error');
        }
    }

    showDeleteConfirmation(campaignId, campaignTitle) {
        return new Promise((resolve) => {
            const modalId = 'deleteConfirmModal';
            let modal = document.getElementById(modalId);
            
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal fade';
            modal.setAttribute('tabindex', '-1');
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Confirm Delete
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center py-3">
                                <i class="fas fa-trash-alt fa-4x text-danger mb-3"></i>
                                <h5 class="mb-3">Delete Campaign?</h5>
                                <p class="mb-2">
                                    <strong>"${this.escapeHtml(campaignTitle || `Campaign #${campaignId}`)}"</strong>
                                </p>
                                <p class="text-muted">
                                    This action cannot be undone. All donation data for this campaign will also be deleted.
                                </p>
                                <div class="alert alert-warning mt-3">
                                    <i class="fas fa-info-circle me-2"></i>
                                    Campaign ID: ${campaignId}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i> Cancel
                            </button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                                <i class="fas fa-trash me-2"></i> Yes, Delete Campaign
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            confirmBtn.onclick = () => {
                bootstrapModal.hide();
                modal.addEventListener('hidden.bs.modal', () => modal.remove());
                resolve(true);
            };
            
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve(false);
            });
        });
    }

    // ============================================
    // DONORS PAGE - Real data from donations
    // ============================================
    
    // Update the getDonorsHTML to include the phone and status columns
    getDonorsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Donor Management</h1>
                        <div>
                            <button class="btn btn-outline-primary" onclick="adminDashboard.loadDonors()">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-primary shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                        Total Donors</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="donorsTotal">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-users fa-2x text-gray-300"></i>
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
                                        Active Donors</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="activeDonors">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-user-check fa-2x text-gray-300"></i>
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
                                        New Donors</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="newDonors">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-user-plus fa-2x text-gray-300"></i>
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
                                        Avg. Donation</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="avgDonation">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-coins fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Donors Table -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">All Donors</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="donorsTable" width="100%" cellspacing="0">
                                    <thead class="thead-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Total Donations</th>
                                            <th>Last Donation</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="donorsBody">
                                        <tr><td colspan="8" class="text-center">Loading donors...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    
    async loadDonorsData() {
        await this.loadDonors();
    }
    
    async loadDonors() {
        try {
            const donorsBody = document.getElementById('donorsBody');
            if (!donorsBody) return;
            
            donorsBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading donors...</p>
                    </td>
                </tr>
            `;
            
            // Use your dedicated donors endpoint with admin=true parameter
            const data = await this.apiRequest('backend/api/donors/get-all.php?admin=true');
            console.log('Donors data received:', data);
            
            if (data.success && Array.isArray(data.donors)) {
                const donors = data.donors;
                
                // Update stats cards using the stats from API if available
                if (data.stats) {
                    document.getElementById('donorsTotal').textContent = data.stats.total_donors || donors.length;
                    document.getElementById('activeDonors').textContent = data.stats.active_donors || 0;
                    document.getElementById('newDonors').textContent = data.stats.new_donors || 0;
                    document.getElementById('avgDonation').textContent = this.formatCurrency(data.stats.avg_donation || 0);
                } else {
                    // Fallback: calculate stats from donors array
                    const totalDonors = donors.length;
                    const activeDonors = donors.filter(d => d.status === 'active' || d.status === 'recurring').length;
                    const newDonors = donors.filter(d => d.status === 'new').length;
                    const totalDonations = donors.reduce((sum, d) => sum + (d.totalDonations || 0), 0);
                    const avgDonation = totalDonors > 0 ? totalDonations / totalDonors : 0;
                    
                    document.getElementById('donorsTotal').textContent = totalDonors;
                    document.getElementById('activeDonors').textContent = activeDonors;
                    document.getElementById('newDonors').textContent = newDonors;
                    document.getElementById('avgDonation').textContent = this.formatCurrency(avgDonation);
                }
                
                // Render donors table
                if (donors.length === 0) {
                    donorsBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">No donors found</td></tr>`;
                    return;
                }
                
                donorsBody.innerHTML = donors.map(d => {
                    // Determine badge color based on status
                    let statusBadge = 'bg-secondary';
                    let statusText = d.status || 'active';
                    
                    switch(statusText.toLowerCase()) {
                        case 'active':
                            statusBadge = 'bg-success';
                            statusText = 'Active';
                            break;
                        case 'recurring':
                            statusBadge = 'bg-warning';
                            statusText = 'Recurring';
                            break;
                        case 'new':
                            statusBadge = 'bg-info';
                            statusText = 'New';
                            break;
                        case 'inactive':
                            statusBadge = 'bg-secondary';
                            statusText = 'Inactive';
                            break;
                        default:
                            statusBadge = 'bg-secondary';
                            statusText = statusText;
                    }
                    
                    return `
                    <tr>
                        <td><strong>#DON${Math.abs(d.id).toString().substring(0, 6)}</strong></td>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="avatar-circle bg-primary text-white me-2" 
                                    style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: #4e73df !important;">
                                    ${(d.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                ${this.escapeHtml(d.name || 'Anonymous')}
                            </div>
                        </td>
                        <td>${this.escapeHtml(d.email || 'N/A')}</td>
                        <td>${this.escapeHtml(d.phone || 'Not provided')}</td>
                        <td class="fw-bold text-success">${this.formatCurrency(d.totalDonations || 0)}</td>
                        <td>${this.formatDate(d.lastDonation)}</td>
                        <td>
                            <span class="badge ${statusBadge}">${statusText}</span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="adminDashboard.viewDonor('${d.email}')" title="View Donor Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-warning" onclick="adminDashboard.sendEmailToDonor('${d.email}')" title="Send Email">
                                    <i class="fas fa-envelope"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `}).join('');
            } else {
                console.error('Donors data not in expected format:', data);
                donorsBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load donors: ${data.message || 'Invalid data format'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading donors:', error);
            const donorsBody = document.getElementById('donorsBody');
            if (donorsBody) {
                donorsBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load donors: ${error.message}</td></tr>`;
            }
        }
    }
    
    // Update viewDonor method to work with email
    viewDonor(email) {
        this.showNotification(`Viewing donor: ${email}`, 'info');
        // You could fetch and show detailed donor history here
    }

    // Update sendEmailToDonor method
    sendEmailToDonor(email) {
        this.showNotification(`Preparing email to: ${email}`, 'info');
        window.location.href = `mailto:${email}`;
    }

    // ============================================
    // ANALYTICS PAGE - Real data from campaigns
    // ============================================
    
    getAnalyticsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Advanced Analytics</h1>
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
                                        Total Campaigns</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="analyticsTotalCampaigns">0</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-hand-holding-heart fa-2x text-gray-300"></i>
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
                                        Total Donations</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="analyticsTotalDonations">RM 0</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-dollar-sign fa-2x text-gray-300"></i>
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
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="analyticsTotalDonors">0</div>
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
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="analyticsSuccessRate">0%</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-percentage fa-2x text-gray-300"></i>
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
                            <h6 class="m-0 font-weight-bold text-primary">Top Campaigns by Amount Raised</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="analyticsCampaignChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-6 col-lg-6 mb-4">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Campaign Status Distribution</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="analyticsStatusChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Campaign Performance Table -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Campaign Performance</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>Category</th>
                                            <th>Target</th>
                                            <th>Raised</th>
                                            <th>Progress</th>
                                            <th>Donors</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="analyticsCampaignsBody">
                                        <tr><td colspan="7" class="text-center">Loading analytics...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadAnalyticsData() {
        try {
            const campaignsData = await this.apiRequest('backend/api/campaigns/get-all.php');
            const donationsData = await this.apiRequest('backend/api/user/donations.php?limit=1000');
            
            if (campaignsData.success && Array.isArray(campaignsData.campaigns)) {
                const campaigns = campaignsData.campaigns;
                
                const totalCampaigns = campaigns.length;
                const totalDonations = campaigns.reduce((sum, c) => sum + (parseFloat(c.current_amount) || 0), 0);
                const successfulCampaigns = campaigns.filter(c => 
                    parseFloat(c.current_amount || 0) >= parseFloat(c.target_amount || 1)
                ).length;
                const successRate = totalCampaigns > 0 ? Math.round((successfulCampaigns / totalCampaigns) * 100) : 0;
                
                let totalDonors = 0;
                if (donationsData.success && Array.isArray(donationsData.donations)) {
                    const donors = new Set();
                    donationsData.donations.forEach(d => {
                        if (d.user_id) donors.add(d.user_id);
                    });
                    totalDonors = donors.size;
                }
                
                document.getElementById('analyticsTotalCampaigns').textContent = totalCampaigns;
                document.getElementById('analyticsTotalDonations').textContent = this.formatCurrency(totalDonations);
                document.getElementById('analyticsTotalDonors').textContent = totalDonors;
                document.getElementById('analyticsSuccessRate').textContent = successRate + '%';
                
                // Render campaigns table
                const tbody = document.getElementById('analyticsCampaignsBody');
                if (tbody) {
                    const sortedCampaigns = campaigns.sort((a, b) => 
                        parseFloat(b.current_amount || 0) - parseFloat(a.current_amount || 0)
                    );
                    
                    tbody.innerHTML = sortedCampaigns.map(c => {
                        const progress = c.target_amount > 0 
                            ? ((c.current_amount || 0) / c.target_amount * 100).toFixed(1) 
                            : 0;
                        return `
                            <tr>
                                <td>${this.escapeHtml(c.title || 'Untitled')}</td>
                                <td><span class="badge bg-info">${this.escapeHtml(c.category || 'Uncategorized')}</span></td>
                                <td>${this.formatCurrency(c.target_amount)}</td>
                                <td class="text-success">${this.formatCurrency(c.current_amount)}</td>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="progress me-2" style="width: 100px; height: 8px;">
                                            <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                                        </div>
                                        <span>${progress}%</span>
                                    </div>
                                </td>
                                <td>${c.donors_count || 0}</td>
                                <td>
                                    <span class="badge bg-${c.status === 'active' ? 'success' : 'secondary'}">
                                        ${c.status || 'unknown'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
                
                // Initialize charts
                this.initAnalyticsCharts(campaigns);
            }
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }
    
    initAnalyticsCharts(campaigns) {
        // Top Campaigns Chart
        const campaignCtx = document.getElementById('analyticsCampaignChart');
        if (campaignCtx) {
            const existingChart = Chart.getChart(campaignCtx);
            if (existingChart) existingChart.destroy();
            
            const topCampaigns = campaigns
                .sort((a, b) => parseFloat(b.current_amount || 0) - parseFloat(a.current_amount || 0))
                .slice(0, 5);
            
            const labels = topCampaigns.map(c => {
                let title = c.title || 'Campaign';
                return title.length > 15 ? title.substring(0, 12) + '...' : title;
            });
            const data = topCampaigns.map(c => parseFloat(c.current_amount || 0));
            
            new Chart(campaignCtx, {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['No Data'],
                    datasets: [{
                        label: 'Amount Raised (RM)',
                        data: labels.length ? data : [0],
                        backgroundColor: '#4e73df'
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
                                callback: (value) => 'RM ' + value.toLocaleString()
                            }
                        }
                    }
                }
            });
        }
        
        // Status Distribution Chart
        const statusCtx = document.getElementById('analyticsStatusChart');
        if (statusCtx) {
            const existingChart = Chart.getChart(statusCtx);
            if (existingChart) existingChart.destroy();
            
            const active = campaigns.filter(c => c.status === 'active').length;
            const completed = campaigns.filter(c => c.status === 'completed').length;
            const cancelled = campaigns.filter(c => c.status === 'cancelled').length;
            
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Completed', 'Cancelled'],
                    datasets: [{
                        data: [active, completed, cancelled],
                        backgroundColor: ['#1cc88a', '#6c757d', '#f6c23e']
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
    }

    // ============================================
    // STATISTICS PAGE - Real data
    // ============================================
    
    getStatisticsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Campaign Statistics</h1>
                        <button class="btn btn-outline-success" onclick="adminDashboard.loadStatisticsData()">
                            <i class="fas fa-sync-alt me-2"></i> Refresh
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Stats Overview -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-primary shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                        Total Raised</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="statsTotalRaised">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-money-bill-wave fa-2x text-gray-300"></i>
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
                                        Total Donations</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="statsTotalDonations">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-receipt fa-2x text-gray-300"></i>
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
                                        Success Rate</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="statsSuccessRate">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-trophy fa-2x text-gray-300"></i>
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
                                        Avg. Donation</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="statsAvgDonation">Loading...</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-chart-line fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Campaign List -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Campaign Performance Details</h6>
                        </div>
                        <div class="card-body">
                            <div id="statisticsCampaignsContainer">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2">Loading statistics...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadStatisticsData() {
        try {
            const campaignsData = await this.apiRequest('backend/api/campaigns/get-all.php');
            const donationsData = await this.apiRequest('backend/api/user/donations.php?limit=1000');
            
            if (campaignsData.success && Array.isArray(campaignsData.campaigns)) {
                const campaigns = campaignsData.campaigns;
                
                const totalRaised = campaigns.reduce((sum, c) => sum + (parseFloat(c.current_amount) || 0), 0);
                const successfulCampaigns = campaigns.filter(c => 
                    parseFloat(c.current_amount || 0) >= parseFloat(c.target_amount || 1)
                ).length;
                const successRate = campaigns.length > 0 ? ((successfulCampaigns / campaigns.length) * 100).toFixed(1) : 0;
                
                let totalDonations = 0;
                let totalDonationAmount = 0;
                
                if (donationsData.success && Array.isArray(donationsData.donations)) {
                    totalDonations = donationsData.donations.length;
                    totalDonationAmount = donationsData.donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                }
                
                const avgDonation = totalDonations > 0 ? totalDonationAmount / totalDonations : 0;
                
                document.getElementById('statsTotalRaised').textContent = this.formatCurrency(totalRaised);
                document.getElementById('statsTotalDonations').textContent = totalDonations;
                document.getElementById('statsSuccessRate').textContent = successRate + '%';
                document.getElementById('statsAvgDonation').textContent = this.formatCurrency(avgDonation);
                
                this.renderStatisticsTable(campaigns);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }
    
    renderStatisticsTable(campaigns) {
        const container = document.getElementById('statisticsCampaignsContainer');
        if (!container) return;
        
        if (!campaigns || campaigns.length === 0) {
            container.innerHTML = '<p class="text-center py-4">No campaigns found</p>';
            return;
        }
        
        const sortedCampaigns = campaigns.sort((a, b) => 
            parseFloat(b.current_amount || 0) - parseFloat(a.current_amount || 0)
        );
        
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Campaign</th>
                            <th>Category</th>
                            <th>Target</th>
                            <th>Raised</th>
                            <th>Progress</th>
                            <th>Donors</th>
                            <th>Status</th>
                            <th>Days Left</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedCampaigns.map(c => {
                            const target = parseFloat(c.target_amount || 0);
                            const current = parseFloat(c.current_amount || 0);
                            const progress = target > 0 ? ((current / target) * 100).toFixed(1) : 0;
                            
                            let daysLeft = 0;
                            if (c.end_date) {
                                const endDate = new Date(c.end_date);
                                const today = new Date();
                                daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                            }
                            
                            return `
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            ${c.image_url && c.image_url !== 'assets/images/default-campaign.jpg' ? 
                                                `<img src="${c.image_url}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; margin-right: 8px;">` : ''
                                            }
                                            ${this.escapeHtml(c.title || 'Untitled')}
                                        </div>
                                    </td>
                                    <td><span class="badge bg-info">${this.escapeHtml(c.category || 'Uncategorized')}</span></td>
                                    <td>${this.formatCurrency(target)}</td>
                                    <td class="text-success fw-bold">${this.formatCurrency(current)}</td>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <div class="progress me-2" style="width: 80px; height: 8px;">
                                                <div class="progress-bar ${progress >= 100 ? 'bg-success' : 'bg-primary'}" 
                                                    style="width: ${Math.min(progress, 100)}%"></div>
                                            </div>
                                            <span>${progress}%</span>
                                        </div>
                                    </td>
                                    <td>${c.donors_count || 0}</td>
                                    <td>
                                        <span class="badge bg-${c.status === 'active' ? 'success' : c.status === 'completed' ? 'info' : 'secondary'}">
                                            ${c.status || 'unknown'}
                                        </span>
                                    </td>
                                    <td>
                                        ${daysLeft > 0 ? 
                                            `<span class="badge ${daysLeft < 7 ? 'bg-danger' : daysLeft < 30 ? 'bg-warning' : 'bg-info'}">
                                                ${daysLeft} days
                                            </span>` : 
                                            '<span class="badge bg-secondary">Ended</span>'
                                        }
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ============================================
    // REPORTS PAGE
    // ============================================
    
    getReportsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Reports & Export</h1>
                    </div>
                </div>
            </div>
            
            <!-- Report Templates -->
            <div class="row mb-4">
                <div class="col-xl-4 col-md-6 mb-4">
                    <div class="card shadow h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-file-alt fa-3x text-primary mb-3"></i>
                            <h5 class="card-title">Campaigns Report</h5>
                            <p class="card-text text-muted">Export all campaigns data to CSV</p>
                            <button class="btn btn-outline-primary" onclick="adminDashboard.exportCampaigns()">
                                <i class="fas fa-download me-2"></i> Download CSV
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-4 col-md-6 mb-4">
                    <div class="card shadow h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-users fa-3x text-success mb-3"></i>
                            <h5 class="card-title">Donors Report</h5>
                            <p class="card-text text-muted">Export all donors data to CSV</p>
                            <button class="btn btn-outline-success" onclick="adminDashboard.exportDonors()">
                                <i class="fas fa-download me-2"></i> Download CSV
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-4 col-md-6 mb-4">
                    <div class="card shadow h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-credit-card fa-3x text-info mb-3"></i>
                            <h5 class="card-title">Donations Report</h5>
                            <p class="card-text text-muted">Export all donations data to CSV</p>
                            <button class="btn btn-outline-info" onclick="adminDashboard.exportDonations()">
                                <i class="fas fa-download me-2"></i> Download CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadReportsData() {
        // Nothing to load
    }

    // ============================================
    // SETTINGS PAGE
    // ============================================
    
    getSettingsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <h1 class="h3 mb-4 text-gray-800">Settings</h1>
                    <div class="card shadow">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-cog fa-4x text-muted mb-3"></i>
                            <h4>Settings Page Coming Soon</h4>
                            <p class="text-muted">System settings and configuration will be available here.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // UTILITY METHODS
    // ============================================
    
    formatCurrency(amount) {
        if (amount === null || amount === undefined || amount === '') {
            return 'RM 0.00';
        }
        
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        
        if (isNaN(numAmount)) {
            return 'RM 0.00';
        }
        
        return 'RM ' + numAmount.toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    formatDate(dateString) {
        if (!dateString || dateString === '0000-00-00' || dateString === '0000-00-00 00:00:00') {
            return 'Not set';
        }
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Date Error';
        }
    }
    
    formatDateTime(dateTime) {
        if (!dateTime) return 'N/A';
        try {
            const date = new Date(dateTime);
            return date.toLocaleDateString('en-MY') + ' ' + 
                   date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'N/A';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(message, type = 'info') {
        const existing = document.querySelector('.admin-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `admin-notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'} me-2"></i>
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
    
    exportCampaigns() {
        if (!this.allCampaigns || this.allCampaigns.length === 0) {
            this.showNotification('No campaigns to export', 'warning');
            return;
        }
        
        const headers = ['ID', 'Title', 'Category', 'Target', 'Raised', 'Progress %', 'Donors', 'Status', 'Created'];
        const rows = [headers.join(',')];
        
        this.allCampaigns.forEach(c => {
            const progress = c.target_amount > 0 
                ? ((c.current_amount || 0) / c.target_amount * 100).toFixed(1) 
                : 0;
            
            const row = [
                c.id,
                `"${(c.title || '').replace(/"/g, '""')}"`,
                `"${(c.category || '').replace(/"/g, '""')}"`,
                c.target_amount || 0,
                c.current_amount || 0,
                progress,
                c.donors_count || 0,
                c.status || '',
                c.created_at || ''
            ];
            
            rows.push(row.join(','));
        });
        
        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `campaigns_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        this.showNotification(`Exported ${this.allCampaigns.length} campaigns to CSV`, 'success');
    }
    
    exportDonors() {
        this.loadDonors().then(() => {
            // Donors are already loaded in the table
            const donorsTable = document.getElementById('donorsBody');
            if (!donorsTable) return;
            
            const rows = donorsTable.querySelectorAll('tr');
            if (rows.length === 0 || rows[0].cells?.[0]?.textContent === 'No donors found') {
                this.showNotification('No donors to export', 'warning');
                return;
            }
            
            const headers = ['ID', 'Name', 'Email', 'Total Donations', 'Donations Count', 'Last Donation'];
            const csvRows = [headers.join(',')];
            
            rows.forEach(row => {
                if (row.cells.length >= 6) {
                    const rowData = [
                        row.cells[0].textContent.replace('#', ''),
                        `"${row.cells[1].textContent.replace(/"/g, '""')}"`,
                        `"${row.cells[2].textContent.replace(/"/g, '""')}"`,
                        row.cells[3].textContent.replace('RM', '').replace(',', '').trim(),
                        row.cells[4].textContent,
                        row.cells[5].textContent
                    ];
                    csvRows.push(rowData.join(','));
                }
            });
            
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `donors_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            this.showNotification('Donors exported to CSV', 'success');
        });
    }
    
    exportDonations() {
        this.apiRequest('backend/api/user/donations.php?limit=10000').then(data => {
            if (data.success && Array.isArray(data.donations)) {
                const headers = ['ID', 'Donor', 'Email', 'Campaign', 'Amount', 'Date', 'Status', 'Method'];
                const rows = [headers.join(',')];
                
                data.donations.forEach(d => {
                    const row = [
                        d.id || '',
                        `"${(d.donor_name || 'Anonymous').replace(/"/g, '""')}"`,
                        `"${(d.donor_email || '').replace(/"/g, '""')}"`,
                        `"${(d.campaign_title || '').replace(/"/g, '""')}"`,
                        d.amount || 0,
                        d.created_at || '',
                        d.status || '',
                        d.payment_method || ''
                    ];
                    rows.push(row.join(','));
                });
                
                const csvContent = rows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `donations_export_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                
                this.showNotification(`Exported ${data.donations.length} donations to CSV`, 'success');
            }
        }).catch(error => {
            this.showNotification('Failed to export donations: ' + error.message, 'error');
        });
    }
    
    exportData() {
        this.exportCampaigns();
    }
    
    redrawCharts() {
        setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.resize) chart.resize();
            });
        }, 300);
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
    
    setupEventListeners() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('micro_donation_token');
                localStorage.removeItem('user');
                localStorage.removeItem('micro_donation_user');
                window.location.href = 'index.html';
            });
        }
    }
    
    setupOverviewEventListeners() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.showNotification('Refreshing dashboard...', 'info');
                this.loadOverviewData();
            });
        }
    }
}

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