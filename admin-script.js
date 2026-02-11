// Admin Dashboard JavaScript with full functionality
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
        // Add this at the beginning of your AdminDashboard init()
        console.log('=== ADMIN DASHBOARD DEBUG ===');
        console.log('LocalStorage user:', localStorage.getItem('user'));
        console.log('LocalStorage token:', localStorage.getItem('token'));
        console.log('Session user role:', JSON.parse(localStorage.getItem('user') || '{}').role);
        console.log('Current URL:', window.location.href);
        console.log('=============================');
        this.checkAuth();
        this.loadUserData();
        this.setupSidebarToggle();
        this.setupSidebarNavigation();
        this.setupEventListeners();
        this.loadPage('overview');
    }
    
    checkAuth() {
        console.log('=== ENHANCED AUTH CHECK ===');
        
        // Check ALL localStorage items first
        console.log('All localStorage keys:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log(`  ${i}: "${key}"`);
        }
        
        // User is in "micro_donation_user" key (we found it)
        let userString = localStorage.getItem('micro_donation_user') || 
                        localStorage.getItem('user');
        
        // Token is in "micro_donation_token" key (visible in logs)
        let token = localStorage.getItem('micro_donation_token') ||
                    localStorage.getItem('token');
        
        console.log('User key "micro_donation_user":', userString ? 'FOUND' : 'NOT FOUND');
        console.log('Token key "micro_donation_token":', token ? 'FOUND' : 'NOT FOUND');
        
        // If still not found, check all items (your existing code works for user)
        if (!userString) {
            console.log('Searching for user data...');
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                
                try {
                    const parsed = JSON.parse(value);
                    if (parsed && parsed.id && parsed.email && parsed.role) {
                        console.log(`Found user data in key: "${key}"`);
                        userString = value;
                        break;
                    }
                } catch (e) {
                    // Not JSON, continue
                }
            }
        }
        
        // Parse the user
        let user = {};
        try {
            user = JSON.parse(userString);
            console.log('Parsed user:', user);
        } catch (e) {
            console.error('Error parsing user:', e);
            this.showNotification('Authentication error. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return false;
        }
        
        // Check if we have required data
        if (!token || !user.id) {
            console.error('Missing auth data:', {
                token: token ? 'YES' : 'NO',
                tokenValue: token,
                userId: user.id ? 'YES' : 'NO'
            });
            
            // TEMPORARY FIX: Create token if missing but user exists
            if (user.id && !token) {
                console.log('Creating temporary token for admin user...');
                token = 'admin-token-' + Date.now();
                localStorage.setItem('micro_donation_token', token);
                localStorage.setItem('token', token);
                console.log('Created token:', token);
            } else {
                this.showNotification('Please login to access admin dashboard', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return false;
            }
        }
        
        // Check admin role
        if (user.role !== 'admin') {
            console.error('User is not admin. Role:', user.role);
            this.showNotification('Access denied. Admin privileges required.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return false;
        }
        
        console.log('✅ Auth check passed! Admin access granted.');
        
        // Save to standard keys for future compatibility
        if (!localStorage.getItem('user')) {
            localStorage.setItem('user', userString);
        }
        if (!localStorage.getItem('token')) {
            localStorage.setItem('token', token);
        }
        
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
    }

    // ============================================
    // OVERVIEW PAGE
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
    
    async loadOverviewData() {
        try {
            // Load quick stats
            await this.loadQuickStats();
            
            // Update stats
            document.getElementById('totalDonations').textContent = 'RM 10,230';
            document.getElementById('activeCampaigns').textContent = '8';
            document.getElementById('totalDonors').textContent = '156';
            document.getElementById('successRate').textContent = '94.5%';
            
            // Initialize charts
            this.initRevenueChart();
            this.initCampaignStatusChart();
            this.loadRecentTransactions();
            this.setupOverviewEventListeners();
        } catch (error) {
            console.error('Error loading overview data:', error);
            this.showNotification('Error loading dashboard data', 'error');
        }
    }

    async loadQuickStats() {
        try {
            // Load active campaigns count ONLY (no more pending)
            const campaignsResponse = await fetch('backend/api/campaigns/get-all.php', {
                headers: { 'Accept': 'application/json' }
            });
            
            if (campaignsResponse.ok) {
                const campaignsData = await campaignsResponse.json();
                if (campaignsData.success && Array.isArray(campaignsData.campaigns)) {
                    const activeCampaigns = campaignsData.campaigns.filter(c => c.status === 'active');
                    const completedCampaigns = campaignsData.campaigns.filter(c => c.status === 'completed');
                    
                    // Update DOM elements
                    document.getElementById('activeCampaignsCount').textContent = activeCampaigns.length;
                    
                    // Remove or update the pending campaigns element if it exists
                    const pendingElement = document.getElementById('pendingCampaignsCount');
                    if (pendingElement) {
                        // Option 1: Hide or remove the element
                        pendingElement.closest('.quick-stat-card').style.display = 'none';
                        // Option 2: Set to 0 with a note
                        // pendingElement.textContent = '0 (Admin-only system)';
                    }
                }
            }
            
        } catch (error) {
            console.error('Error loading quick stats:', error);
        }
    }
    
    initRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) {
            console.warn('Revenue chart canvas not found');
            return;
        }
        
        const canvas = ctx;
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        setTimeout(() => {
            try {
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
            } catch (chartError) {
                console.error('Error creating chart:', chartError);
            }
        }, 100);
    }
    
    initCampaignStatusChart() {
        const ctx = document.getElementById('campaignStatusChart');
        if (!ctx) return;
        
        this.charts.campaignStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                // REMOVE 'Pending' from labels
                labels: ['Active', 'Completed', 'Cancelled'],
                datasets: [{
                    // Update data - no pending campaigns
                    data: [8, 12, 2], // Active, Completed, Cancelled
                    backgroundColor: ['#1cc88a', '#6c757d', '#f6c23e'] // Success, Secondary, Warning
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
    
    async loadRecentTransactions() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('backend/api/user/donations.php?limit=10', {
                headers: { 'Accept': 'application/json' }
            });
            
            let transactions = [];
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.donations)) {
                    transactions = data.donations;
                }
            }
            
            // If no transactions from API, use sample data
            if (transactions.length === 0) {
                transactions = [
                    { id: 'DON-001234', donor_name: 'Ahmad Rahim', campaign_title: 'Flood Relief Fund', amount: 150.00, created_at: '2025-12-18 14:30', status: 'completed', payment_method: 'QR Payment' },
                    { id: 'DON-001233', donor_name: 'Siti Aminah', campaign_title: 'Student Scholarship', amount: 50.00, created_at: '2025-12-18 11:15', status: 'completed', payment_method: 'Online Banking' },
                    { id: 'DON-001232', donor_name: 'Anonymous', campaign_title: 'Health Center', amount: 25.00, created_at: '2025-12-18 09:45', status: 'completed', payment_method: 'QR Payment' }
                ];
            }
            
            this.renderTransactions(transactions);
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            // Use sample data on error
            const sampleTransactions = [
                { id: 'DON-001234', donor_name: 'Ahmad Rahim', campaign_title: 'Flood Relief Fund', amount: 150.00, created_at: '2025-12-18 14:30', status: 'completed', payment_method: 'QR Payment' },
                { id: 'DON-001233', donor_name: 'Siti Aminah', campaign_title: 'Student Scholarship', amount: 50.00, created_at: '2025-12-18 11:15', status: 'completed', payment_method: 'Online Banking' }
            ];
            this.renderTransactions(sampleTransactions);
        }
    }
    
    renderTransactions(transactions) {
        const tbody = document.getElementById('transactionsBody');
        if (!tbody) return;
        
        tbody.innerHTML = transactions.map(transaction => `
            <tr>
                <td><strong>${transaction.id || 'DON-' + Math.floor(Math.random() * 10000)}</strong></td>
                <td>${transaction.donor_name || 'Anonymous'}</td>
                <td>${transaction.campaign_title || 'Unknown Campaign'}</td>
                <td class="fw-bold text-success">RM ${parseFloat(transaction.amount || 0).toFixed(2)}</td>
                <td>${this.formatDateTime(transaction.created_at)}</td>
                <td>
                    <span class="badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}">
                        ${(transaction.status || 'pending').charAt(0).toUpperCase() + (transaction.status || 'pending').slice(1)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-info">${transaction.payment_method || 'QR Payment'}</span>
                </td>
            </tr>
        `).join('');
        
        this.initializeDataTable();
    }

    // ============================================
    // CREATE CAMPAIGN PAGE (NEW)
    // ============================================
    
    // Update the getCreateCampaignHTML method
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
                        <div class="card-body">
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                <strong>Admin Only:</strong> Only administrators can create campaigns. Regular users can only donate to existing campaigns.
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
                                            <li>Monitor campaign progress regularly</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Quick Create Form Preview -->
                            <div class="row mt-2">
                                <div class="col-md-6">
                                    <div class="card border-primary">
                                        <div class="card-header bg-primary text-white">
                                            <h6 class="mb-0"><i class="fas fa-rocket me-2"></i>Quick Create Form</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Campaign Title</label>
                                                <input type="text" class="form-control bg-light" placeholder="e.g., Flood Relief Fund" readonly>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Category</label>
                                                <select class="form-select bg-light" disabled>
                                                    <option>Education</option>
                                                </select>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Goal Amount</label>
                                                <input type="text" class="form-control bg-light" placeholder="RM 10,000" readonly>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card border-success">
                                        <div class="card-header bg-success text-white">
                                            <h6 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Enhanced Fields</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Organizer</label>
                                                <input type="text" class="form-control bg-light" placeholder="Organization name" readonly>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Featured Campaign</label>
                                                <div class="form-check">
                                                    <input type="checkbox" class="form-check-input" disabled>
                                                    <label class="form-check-label">Mark as featured (appears on homepage)</label>
                                                </div>
                                            </div>
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Campaign Image</label>
                                                <input type="file" class="form-control bg-light" disabled>
                                            </div>
                                        </div>
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
            
            <!-- Recently Created Campaigns -->
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
            const token = localStorage.getItem('token');
            const response = await fetch('backend/api/campaigns/get-all.php?limit=5', {
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.campaigns)) {
                    this.renderRecentCampaigns(data.campaigns.slice(0, 5));
                } else {
                    this.showNoRecentCampaigns();
                }
            } else {
                this.showNoRecentCampaigns();
            }
        } catch (error) {
            console.error('Error loading recent campaigns:', error);
            this.showNoRecentCampaigns();
        }
    }
    
    // Update renderRecentCampaigns method
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
                                                `<img src="${campaign.image_url}" alt="${campaign.title}" 
                                                    style="width: 40px; height: 40px; object-fit: cover;" class="rounded me-2">` : 
                                                `<div class="bg-light rounded d-flex align-items-center justify-content-center me-2" 
                                                    style="width: 40px; height: 40px;">
                                                    <i class="fas fa-hand-holding-heart text-muted"></i>
                                                </div>`
                                            }
                                            <div>
                                                <strong>${campaign.title || 'Untitled'}</strong>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="badge bg-info">${campaign.category || 'Uncategorized'}</span></td>
                                    <td>${campaign.organizer || 'Not specified'}</td>
                                    <td class="fw-bold">RM ${parseFloat(campaign.target_amount || 0).toLocaleString()}</td>
                                    <td class="fw-bold text-success">RM ${parseFloat(campaign.current_amount || 0).toLocaleString()}</td>
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
                                    <td><small>${new Date(campaign.created_at).toLocaleDateString()}</small></td>
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
        
        // Setup form submission
        const submitBtn = document.getElementById('submitCampaignForm');
        if (submitBtn) {
            submitBtn.onclick = () => this.submitCampaignForm();
        }
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        const deadlineInput = document.querySelector('#campaignCreationForm input[name="deadline"]');
        if (deadlineInput) {
            deadlineInput.min = today;
        }
    }
    
    // Update the submitCampaignForm method
    async submitCampaignForm() {
        const form = document.getElementById('campaignCreationForm');
        const formData = new FormData(form);
        const messageDiv = document.getElementById('campaignFormMessage');
        const submitBtn = document.getElementById('submitCampaignForm');
        const modal = bootstrap.Modal.getInstance(document.getElementById('campaignCreationModal'));
        
        // Get user data from localStorage
        const userString = localStorage.getItem('micro_donation_user') || 
                        localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        const token = localStorage.getItem('micro_donation_token') || 
                    localStorage.getItem('token');
        
        console.log('Submitting campaign form...', {
            user: user,
            hasToken: !!token
        });
        
        // Validate user and token
        if (!token) {
            this.showNotification('Please login again. No authentication token found.', 'error');
            return;
        }
        
        if (!user || !user.id) {
            this.showNotification('User session expired. Please login again.', 'error');
            return;
        }
        
        if (user.role !== 'admin') {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }

        // Add to formData - change deadline to end_date
        const end_date = formData.get('deadline');  // Get from deadline input
        formData.delete('deadline');                // Remove old name
        formData.append('end_date', end_date);      // Add as end_date
        
        // Add additional fields to formData
        formData.append('created_by', user.id);
        formData.append('created_by_name', user.name || 'Admin');

        // Add updated_by (same as created_by for new campaigns)
        formData.append('updated_by', user.id);
        
        // Add organizer field (default to user name if not specified)
        if (!formData.get('organizer')) {
            formData.append('organizer', user.name || 'CommunityGive Admin');
        }
        
        // Add status (default to 'active' for new campaigns)
        formData.append('status', 'active');
        
        // Add featured flag (checkbox value is handled automatically)
        
        // Disable submit button
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
        
        try {
            // Show loading message
            messageDiv.style.display = 'block';
            messageDiv.className = 'alert alert-info';
            messageDiv.innerHTML = `
                <i class="fas fa-spinner fa-spin me-2"></i>
                Creating campaign. Please wait...
            `;
            
            // Log form data for debugging
            console.log('Form data entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }
            
            const response = await fetch('backend/api/campaigns/create.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'X-User-ID': user.id,
                    'X-User-Role': user.role
                }
            });
            
            console.log('Response status:', response.status, response.statusText);
            
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                throw new Error(`Server returned invalid response. Status: ${response.status}`);
            }
            
            if (!response.ok) {
                const errorMsg = result.message || `Server error: ${response.status} ${response.statusText}`;
                throw new Error(errorMsg);
            }
            
            if (result.success) {
                // Success
                messageDiv.className = 'alert alert-success';
                messageDiv.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Success!</strong> ${result.message}
                    <br><small>Campaign ID: ${result.campaign_id}</small>
                `;
                
                // Reset form
                form.reset();
                
                // Remove image preview
                const previewContainer = document.getElementById('imagePreviewContainer');
                const preview = document.getElementById('imagePreview');
                if (previewContainer) previewContainer.style.display = 'none';
                if (preview) preview.src = '';
                
                // Show success notification
                this.showNotification('Campaign created successfully!', 'success');
                
                // Add the new campaign to local arrays
                if (result.campaign) {
                    // If API returns full campaign data
                    this.allCampaigns.unshift(result.campaign);
                    this.currentCampaigns.unshift(result.campaign);
                } else {
                    // Create a minimal campaign object and fetch full list
                    this.loadAllCampaignsTable();
                }
                
                // Close modal after delay
                setTimeout(() => {
                    if (modal) modal.hide();
                    this.loadRecentCampaigns();
                    if (this.currentPage === 'campaigns') {
                        this.renderCampaignsTable();
                    }
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
    // STATISTICS PAGE (NEW)
    // ============================================
    
    getStatisticsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Campaign Statistics</h1>
                        <div class="btn-group">
                            <button class="btn btn-outline-primary" onclick="adminDashboard.exportStatistics()">
                                <i class="fas fa-download me-2"></i> Export
                            </button>
                            <button class="btn btn-outline-success" onclick="adminDashboard.refreshStatistics()">
                                <i class="fas fa-sync-alt me-2"></i> Refresh
                            </button>
                        </div>
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
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span>All campaigns</span>
                                    </div>
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
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span>Transaction count</span>
                                    </div>
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
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span>Campaigns that reached goal</span>
                                    </div>
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
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span>Per transaction</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-chart-line fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Charts -->
            <div class="row mb-4">
                <div class="col-xl-8 col-lg-7">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">Donations Over Time</h6>
                            <select class="form-select form-select-sm" style="width: auto;" id="timeRangeSelect">
                                <option value="week">Last 7 Days</option>
                                <option value="month" selected>Last 30 Days</option>
                                <option value="quarter">Last 90 Days</option>
                                <option value="year">Last Year</option>
                            </select>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="donationsOverTimeChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-4 col-lg-5">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Top Campaigns</h6>
                        </div>
                        <div class="card-body">
                            <div id="topCampaignsList">
                                <!-- Will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Detailed Statistics -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">Detailed Donation History</h6>
                            <button class="btn btn-sm btn-outline-primary" onclick="adminDashboard.exportDonationHistory()">
                                <i class="fas fa-download me-1"></i> Export
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="donationHistoryTable">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Donor</th>
                                            <th>Campaign</th>
                                            <th>Amount (RM)</th>
                                            <th>Payment Method</th>
                                            <th>Status</th>
                                            <th>Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody id="donationHistoryBody">
                                        <!-- Will be populated by JavaScript -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadStatisticsData() {
        await this.loadStatistics();
        this.initStatisticsCharts();
        this.loadDonationHistory();
    }
    
    async loadStatistics() {
        try {
            const token = localStorage.getItem('token');
            
            // Load campaign statistics
            const campaignsResponse = await fetch('backend/api/campaigns/get-all.php', {
                headers: { 'Accept': 'application/json' }
            });
            
            let totalRaised = 0;
            let totalDonations = 0;
            let successfulCampaigns = 0;
            let totalCampaigns = 0;
            let topCampaigns = [];
            
            if (campaignsResponse.ok) {
                const campaignsData = await campaignsResponse.json();
                if (campaignsData.success && Array.isArray(campaignsData.campaigns)) {
                    const campaigns = campaignsData.campaigns;
                    totalCampaigns = campaigns.length;
                    
                    // Calculate statistics
                    displayCampaigns.forEach(campaign => {
                        totalRaised += parseFloat(campaign.current_amount || 0);
                        totalDonations += parseInt(campaign.donors_count || 0);
                        
                        if (parseFloat(campaign.current_amount || 0) >= parseFloat(campaign.target_amount || 1)) {
                            successfulCampaigns++;
                        }
                    });
                    
                    // Get top campaigns
                    topCampaigns = campaigns
                        .sort((a, b) => parseFloat(b.current_amount || 0) - parseFloat(a.current_amount || 0))
                        .slice(0, 5);
                }
            }
            
            // Load donation statistics
            const donationsResponse = await fetch('backend/api/user/donations.php?limit=100', {
                headers: { 'Accept': 'application/json' }
            });
            
            let avgDonation = 0;
            if (donationsResponse.ok) {
                const donationsData = await donationsResponse.json();
                if (donationsData.success && Array.isArray(donationsData.donations)) {
                    const donations = donationsData.donations;
                    const totalAmount = donations.reduce((sum, donation) => sum + parseFloat(donation.amount || 0), 0);
                    avgDonation = donations.length > 0 ? totalAmount / donations.length : 0;
                }
            }
            
            // Update DOM
            document.getElementById('statsTotalRaised').textContent = 'RM ' + totalRaised.toFixed(2);
            document.getElementById('statsTotalDonations').textContent = totalDonations.toLocaleString();
            document.getElementById('statsSuccessRate').textContent = totalCampaigns > 0 
                ? ((successfulCampaigns / totalCampaigns) * 100).toFixed(1) + '%' 
                : '0%';
            document.getElementById('statsAvgDonation').textContent = 'RM ' + avgDonation.toFixed(2);
            
            // Render top campaigns
            this.renderTopCampaigns(topCampaigns);
            
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showNotification('Error loading statistics', 'error');
        }
    }
    
    renderTopCampaigns(campaigns) {
        const container = document.getElementById('topCampaignsList');
        if (!container) return;
        
        if (displayCampaigns.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-chart-bar fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No campaign data available</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = campaigns.map(campaign => {
            const progress = parseFloat(campaign.target_amount || 1) > 0 
                ? (parseFloat(campaign.current_amount || 0) / parseFloat(campaign.target_amount || 1) * 100) 
                : 0;
            
            return `
                <div class="campaign-item mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-truncate" style="max-width: 70%;">${campaign.title}</strong>
                        <span class="badge bg-success">RM ${parseFloat(campaign.current_amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <small class="text-muted">
                        ${progress.toFixed(1)}% of RM ${parseFloat(campaign.target_amount || 0).toFixed(2)} goal
                    </small>
                </div>
            `;
        }).join('');
    }
    
    initStatisticsCharts() {
        const ctx = document.getElementById('donationsOverTimeChart');
        if (!ctx) return;
        
        this.charts.donationsOverTime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Donations (RM)',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78, 115, 223, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
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
    
    async loadDonationHistory() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('backend/api/user/donations.php?limit=50', {
                headers: { 'Accept': 'application/json' }
            });
            
            let donations = [];
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.donations)) {
                    donations = data.donations;
                }
            }
            
            // If no donations from API, use sample data
            if (donations.length === 0) {
                donations = [
                    { id: 1, donor_name: 'Ahmad Rahim', campaign_title: 'Flood Relief Fund', amount: 150.00, created_at: '2025-12-18 14:30:00', status: 'completed', payment_method: 'QR Payment' },
                    { id: 2, donor_name: 'Siti Aminah', campaign_title: 'Student Scholarship', amount: 50.00, created_at: '2025-12-18 11:15:00', status: 'completed', payment_method: 'Online Banking' }
                ];
            }
            
            this.renderDonationHistory(donations);
            
        } catch (error) {
            console.error('Error loading donation history:', error);
            this.showNotification('Error loading donation history', 'error');
        }
    }
    
    renderDonationHistory(donations) {
        const tbody = document.getElementById('donationHistoryBody');
        if (!tbody) return;
        
        tbody.innerHTML = donations.map(donation => `
            <tr>
                <td>${new Date(donation.created_at).toLocaleDateString()}</td>
                <td>${donation.donor_name || 'Anonymous'}</td>
                <td>${donation.campaign_title || 'Unknown Campaign'}</td>
                <td class="fw-bold text-success">RM ${parseFloat(donation.amount || 0).toFixed(2)}</td>
                <td>${donation.payment_method || 'QR Payment'}</td>
                <td><span class="badge bg-success">${donation.status || 'completed'}</span></td>
                <td>
                    ${donation.id ? `
                        <a href="backend/api/payment/download-receipt.php?donation_id=${donation.id}" 
                        class="btn btn-sm btn-outline-primary" target="_blank">
                            <i class="fas fa-download"></i>
                        </a>
                    ` : 'N/A'}
                </td>
            </tr>
        `).join('');
    }
    
    refreshStatistics() {
        this.showNotification('Refreshing statistics...', 'info');
        this.loadStatisticsData();
    }
    
    exportStatistics() {
        this.showNotification('Exporting statistics...', 'info');
        // Implementation for exporting statistics
    }
    
    exportDonationHistory() {
        this.showNotification('Exporting donation history...', 'info');
        // Implementation for exporting donation history
    }

    // ============================================
    // CAMPAIGNS PAGE (EXISTING)
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
                                        <div class="metric-value" id="activeCampaignsCount">0</div>
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
        // Only load all campaigns table
        await this.loadAllCampaignsTable();
        // Load campaign statistics
        this.loadCampaignStatistics();
    }

    async loadCampaignStatistics() {
    try {
        const response = await fetch('backend/api/campaigns/get-all.php', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && Array.isArray(result.campaigns)) {
                const campaigns = result.campaigns;
                
                // Calculate statistics
                const totalCampaigns = campaigns.length;
                const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
                const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
                const successfulCampaigns = campaigns.filter(c => 
                    parseFloat(c.current_amount || 0) >= parseFloat(c.target_amount || 1)
                ).length;
                
                const successRate = totalCampaigns > 0 ? 
                    Math.round((successfulCampaigns / totalCampaigns) * 100) : 0;
                
                // Update DOM
                document.getElementById('totalCampaignsCount').textContent = totalCampaigns;
                document.getElementById('activeCampaignsCount').textContent = activeCampaigns;
                document.getElementById('completedCampaignsCount').textContent = completedCampaigns;
                document.getElementById('campaignSuccessRate').textContent = successRate + '%';
            }
        }
    } catch (error) {
        console.error('Error loading campaign statistics:', error);
    }
}

    

    async loadAllCampaignsTable() {
        try {
            console.log('Loading all campaigns...');
            
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
            
            // Fetch all campaigns
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
                // Store ALL campaigns
                this.allCampaigns = result.campaigns;
                // Set current campaigns to all campaigns initially
                this.currentCampaigns = [...result.campaigns];
                this.currentFilter = 'all';
                
                console.log('Campaigns loaded. Total:', this.allCampaigns.length);
                console.log('Current campaigns:', this.currentCampaigns.length);
                
                // Render WITHOUT parameter - it will use this.currentCampaigns
                this.renderCampaignsTable();
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
                    <div class="text-center mt-3">
                        <button class="btn btn-primary" onclick="adminDashboard.loadAllCampaignsTable()">
                            <i class="fas fa-redo me-2"></i> Try Again
                        </button>
                    </div>
                `;
            }
        }
    }

    renderCampaignsTable() { // REMOVE THE PARAMETER!
        const container = document.getElementById('campaignsTableContainer');
        if (!container) return;

        console.log('renderCampaignsTable called');
        console.log('this.allCampaigns:', this.allCampaigns);
        console.log('this.currentCampaigns:', this.currentCampaigns);
        
        // Initialize arrays if needed
        if (!this.allCampaigns) {
            this.allCampaigns = [];
        }
        if (!this.currentCampaigns) {
            this.currentCampaigns = [];
        }

        // ALWAYS use this.currentCampaigns - NO parameter logic!
        const displayCampaigns = this.currentCampaigns;
        
        console.log('displayCampaigns to render:', displayCampaigns);

        // Ensure displayCampaigns is an array
        if (!Array.isArray(displayCampaigns)) {
            console.error('currentCampaigns is not an array:', displayCampaigns);
            this.currentCampaigns = [];
            return;
        }
        
        // Handle empty state
        if (!displayCampaigns || displayCampaigns.length === 0) {
            // Check if we have data but it's filtered out
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
        
        // Now it's safe to calculate counts
        const allCount = this.allCampaigns ? this.allCampaigns.length : 0;
        const activeCount = this.allCampaigns ? this.allCampaigns.filter(c => c.status === 'active').length : 0;
        const completedCount = this.allCampaigns ? this.allCampaigns.filter(c => c.status === 'completed').length : 0;
        const cancelledCount = this.allCampaigns ? this.allCampaigns.filter(c => 
            c.status.toLowerCase() === 'cancelled' || 
            c.status.toLowerCase() === 'canceled'
        ).length : 0;
        
        // Debug: Check what data we're receiving
        console.log('Campaigns data received for table:', displayCampaigns);
        
        // Currency formatter with fallback
        const formatCurrency = (amount) => {
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
        };
        
        // Date formatter with error handling
        const formatDate = (dateString) => {
            if (!dateString || dateString === '0000-00-00' || dateString === '0000-00-00 00:00:00') {
                return 'Not set';
            }
            
            try {
                const date = new Date(dateString);
                
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date string:', dateString);
                    return 'Invalid Date';
                }
                
                return date.toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (error) {
                console.error('Error formatting date:', error, 'Date string:', dateString);
                return 'Date Error';
            }
        };
        
        // Create table HTML with search and filter controls
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
                        <li><a class="dropdown-item" href="#" onclick="adminDashboard.sortCampaigns('progress_percentage', 'desc')">
                            <i class="fas fa-percentage me-2"></i> Highest Progress
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
                            <th>CAMPAIGN</th>  <!-- Changed from TITLE to CAMPAIGN to match data-label -->
                            <th>CATEGORY</th>
                            <th>
                                <a href="#" class="text-white text-decoration-none" onclick="adminDashboard.sortCampaigns('target_amount', 'desc')">
                                    TARGET <i class="fas fa-sort ms-1"></i>
                                </a>
                            </th>
                            <th>
                                <a href="#" class="text-white text-decoration-none" onclick="adminDashboard.sortCampaigns('current_amount', 'desc')">
                                    RAISED <i class="fas fa-sort ms-1"></i>
                                </a>
                            </th>
                            <th>PROGRESS</th>
                            <th>
                                <a href="#" class="text-white text-decoration-none" onclick="adminDashboard.sortCampaigns('donors_count', 'desc')">
                                    DONORS <i class="fas fa-sort ms-1"></i>
                                </a>
                            </th>
                            <th>DAYS LEFT</th>
                            <th>STATUS</th>
                            <th>
                                <a href="#" class="text-white text-decoration-none" onclick="adminDashboard.sortCampaigns('created_at', 'desc')">
                                    CREATED <i class="fas fa-sort ms-1"></i>
                                </a>
                            </th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
    
        
        displayCampaigns.forEach(campaign => {
            // Get values with defaults
            const targetAmount = campaign.target_amount || 0;
            const currentAmount = campaign.current_amount || 0;
            const donorsCount = campaign.donors_count || 0;
            const daysLeft = campaign.end_date ? 
                Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
            const status = campaign.status || 'active';
            const createdDate = campaign.created_at;
            
            // Calculate progress percentage
            let progressPercentage = campaign.progress_percentage || 0;
            
            // If progress is 0 but we have amounts, calculate it
            if (progressPercentage === 0 && targetAmount > 0) {
                progressPercentage = (currentAmount / targetAmount) * 100;
            }
            
            // Ensure progress is between 0 and 100
            const safeProgress = Math.min(Math.max(progressPercentage, 0), 100);
            
            // Determine status color
            let statusColor = 'secondary';
            let statusText = status;
            
            switch(status.toLowerCase()) {
                case 'active':
                    statusColor = 'success';
                    statusText = 'Active';
                    break;
                case 'completed':
                    statusColor = 'info';
                    statusText = 'Completed';
                    break;
                case 'cancelled':
                    statusColor = 'danger';
                    statusText = 'Cancelled';
                    break;
                default:
                    statusColor = 'secondary';
                    statusText = status;
            }
            
            // Format dates
            const formattedCreatedDate = formatDate(createdDate);
            
            // In the forEach loop, replace the HTML generation with this:
            html += `
                <tr>
                    <td data-label="ID"><strong>#${campaign.id}</strong></td>
                    <td data-label="Campaign">
                        <div class="d-flex align-items-center">
                            ${campaign.image_url && campaign.image_url !== 'assets/images/default-campaign.jpg' ? `
                                <img src="${campaign.image_url}" 
                                    alt="${campaign.title}" 
                                    class="rounded me-2" 
                                    style="width: 40px; height: 40px; object-fit: cover;">
                            ` : `
                                <div class="rounded me-2 d-flex align-items-center justify-content-center bg-light" 
                                    style="width: 40px; height: 40px;">
                                    <i class="fas fa-hand-holding-heart text-muted"></i>
                                </div>
                            `}
                            <div>
                                <strong class="d-block">${campaign.title || 'Untitled Campaign'}</strong>
                                <small class="text-muted">${campaign.organizer || 'No organizer specified'}</small>
                            </div>
                        </div>
                    </td>
                    <td data-label="Category">
                        <span class="badge bg-info">${campaign.category || 'Uncategorized'}</span>
                    </td>
                    <td data-label="Target" class="fw-bold text-primary">${formatCurrency(targetAmount)}</td>
                    <td data-label="Raised" class="fw-bold ${currentAmount > 0 ? 'text-success' : 'text-muted'}">
                        ${formatCurrency(currentAmount)}
                    </td>
                    <td data-label="Progress">
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height: 8px;">
                                <div class="progress-bar ${safeProgress >= 100 ? 'bg-success' : safeProgress >= 50 ? 'bg-warning' : 'bg-info'}" 
                                    style="width: ${safeProgress}%"
                                    role="progressbar"
                                    aria-valuenow="${safeProgress}"
                                    aria-valuemin="0"
                                    aria-valuemax="100">
                                </div>
                            </div>
                            <span class="fw-bold ${safeProgress >= 100 ? 'text-success' : 'text-dark'}">
                                ${safeProgress.toFixed(1)}%
                            </span>
                        </div>
                        <small class="text-muted d-block">
                            ${formatCurrency(currentAmount)} of ${formatCurrency(targetAmount)}
                        </small>
                    </td>
                    <td data-label="Donors">
                        <span class="badge ${donorsCount > 0 ? 'bg-success' : 'bg-secondary'}">
                            ${donorsCount}
                        </span>
                    </td>
                    <td data-label="Days Left">
                        ${daysLeft > 0 ? 
                            `<span class="badge ${daysLeft < 7 ? 'bg-danger' : daysLeft < 30 ? 'bg-warning' : 'bg-info'}">
                                ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}
                            </span>` : 
                            `<span class="badge bg-secondary">Ended</span>`
                        }
                    </td>
                    <td data-label="Status">
                        <span class="badge bg-${statusColor}">${statusText}</span>
                    </td>
                    <td data-label="Created">
                        <small>${formattedCreatedDate}</small>
                    </td>
                    <td data-label="Actions">
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary" 
                                    onclick="adminDashboard.viewCampaign(${campaign.id})" 
                                    title="View Details"
                                    data-bs-toggle="tooltip">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-info" 
                                    onclick="adminDashboard.editCampaign(${campaign.id})" 
                                    title="Edit Campaign"
                                    data-bs-toggle="tooltip">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-success" 
                                    onclick="window.open('campaigns.html?campaign=${campaign.id}', '_blank')" 
                                    title="View Public Page"
                                    data-bs-toggle="tooltip">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                            <button class="btn btn-outline-danger" 
                                    onclick="adminDashboard.deleteCampaign(${campaign.id})" 
                                    title="Delete Campaign"
                                    data-bs-toggle="tooltip">
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
                        <span class="text-muted ms-3">
                            <i class="fas fa-circle text-success me-1"></i> Active: 
                            ${displayCampaigns.filter(c => c.status === 'active').length}
                        </span>
                        <span class="text-muted ms-3">
                            <i class="fas fa-circle text-info me-1"></i> Completed: 
                            ${displayCampaigns.filter(c => c.status === 'completed').length}
                        </span>
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
                
                <!-- Statistics summary -->
                <div class="row mt-4">
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h5 class="text-muted">Total Target</h5>
                                <h3 class="text-primary">
                                    ${formatCurrency(displayCampaigns.reduce((sum, c) => sum + (parseFloat(c.target_amount) || 0), 0))}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h5 class="text-muted">Total Raised</h5>
                                <h3 class="text-success">
                                    ${formatCurrency(displayCampaigns.reduce((sum, c) => sum + (parseFloat(c.current_amount) || 0), 0))}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h5 class="text-muted">Total Donors</h5>
                                <h3 class="text-info">
                                    ${displayCampaigns.reduce((sum, c) => sum + (parseInt(c.donors_count) || 0), 0)}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h5 class="text-muted">Avg. Progress</h5>
                                <h3 class="text-warning">
                                    ${(displayCampaigns.reduce((sum, c) => {
                                        const progress = c.progress_percentage || 
                                                        (parseFloat(c.current_amount || 0) / parseFloat(c.target_amount || 1) * 100);
                                        return sum + progress;
                                    }, 0) / displayCampaigns.length).toFixed(1)}%
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>
        `;
        
        container.innerHTML = html;
        
        // Initialize tooltips if Bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            const tooltipTriggerList = container.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    }

    // Add these methods to your AdminDashboard class:

    // Search functionality
    searchCampaigns(searchTerm) {
        if (!this.allCampaigns) return;
        
        const term = searchTerm.toLowerCase().trim();
        this.currentSearchTerm = term;
        
        if (!term) {
            // If no search term, apply current filter
            this.filterCampaigns(this.currentFilter);
            return;
        }
        
        // Start from ALL campaigns
        let baseCampaigns = this.allCampaigns;
        
        // Apply current filter first (if not 'all')
        if (this.currentFilter !== 'all') {
            baseCampaigns = this.filterCampaignsByStatus(this.allCampaigns, this.currentFilter);
        }
        
        // Then apply search
        const searchedCampaigns = baseCampaigns.filter(campaign => {
            return (
                (campaign.title && campaign.title.toLowerCase().includes(term)) ||
                (campaign.description && campaign.description.toLowerCase().includes(term)) ||
                (campaign.category && campaign.category.toLowerCase().includes(term)) ||
                (campaign.organizer && campaign.organizer.toLowerCase().includes(term))
            );
        });
        
        // Update current campaigns
        this.currentCampaigns = searchedCampaigns;
        
        // Re-render
        this.renderCampaignsTable(); // NO parameter!
        
        // Show notification
        if (term) {
            this.showNotification(`Found ${searchedCampaigns.length} campaigns matching "${term}"`, 'info');
        }
    }

    // Helper method for filtering by status
    filterCampaignsByStatus(campaigns, status) {
        switch(status) {
            case 'active':
                return campaigns.filter(c => c.status === 'active');
            case 'completed':
                return campaigns.filter(c => c.status === 'completed');
            case 'cancelled':
                return campaigns.filter(c => 
                c.status.toLowerCase() === 'cancelled' || 
                c.status.toLowerCase() === 'canceled'
            );
            default:
                return campaigns;
        }
    }

    clearSearch() {
        this.currentSearchTerm = '';
        
        // Re-apply current filter
        this.filterCampaigns(this.currentFilter);
    }

    // SINGLE filterCampaigns method (remove the duplicate!)
    filterCampaigns(status) {
        console.log('filterCampaigns called with:', status);
        
        // Initialize if not already
        if (!this.allCampaigns) {
            this.allCampaigns = [];
        }
        
        // If no campaigns loaded yet, load them first
        if (this.allCampaigns.length === 0) {
            console.log('No campaigns loaded yet, loading...');
            this.showNotification('Loading campaigns first...', 'info');
            this.loadAllCampaignsTable().then(() => {
                // After loading, apply the filter
                this.filterCampaigns(status);
            });
            return;
        }
        
        // Update current filter
        this.currentFilter = status;
        
        let filteredCampaigns;
        
        switch(status) {
            case 'active':
                filteredCampaigns = this.allCampaigns.filter(c => c.status === 'active');
                break;
            case 'completed':
                filteredCampaigns = this.allCampaigns.filter(c => c.status === 'completed');
                break;
            case 'cancelled':
                filteredCampaigns = this.allCampaigns.filter(c => 
                c.status.toLowerCase() === 'cancelled' || 
                c.status.toLowerCase() === 'canceled'
            );
                break;
            default:
                filteredCampaigns = this.allCampaigns;
                break;
        }
        
        console.log('Filtered to:', filteredCampaigns.length, 'campaigns');
        
        // Update current campaigns
        this.currentCampaigns = filteredCampaigns;
        
        // Clear any active search
        this.currentSearchTerm = '';
        const searchInput = document.getElementById('campaignSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Update active filter button
        this.updateActiveFilter(status);
        
        // Re-render the table WITHOUT parameter
        this.renderCampaignsTable();
        
        // Show notification
        if (status !== 'all') {
            this.showNotification(`Showing ${filteredCampaigns.length} ${status} campaigns`, 'info');
        }
    }

    // REMOVE this duplicate method completely:
    // renderFilteredCampaigns(campaigns, filterType) {
    //     // ... delete this entire method ...
    // }

    // Update active filter button
    updateActiveFilter(activeFilter) {
        // Remove active class from all filter buttons
        const filterButtons = document.querySelectorAll('.btn-group .btn');
        filterButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to the clicked filter
        const activeButton = document.getElementById(`filter${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // Sort functionality
    sortCampaigns(field, direction = 'asc') {
        if (!this.allCampaigns || this.allCampaigns.length === 0) return;
        
        console.log('Sorting by', field, direction);
        
        // Create a copy to avoid modifying the original array
        const sortedCampaigns = [...this.allCampaigns];
        
        sortedCampaigns.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            // Handle different data types
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
            
            // Handle string sorting
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            // Sort based on direction
            if (direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
        
        // Update allCampaigns with sorted array
        this.allCampaigns = sortedCampaigns;
        
        // Also update currentCampaigns to maintain same filtered set
        if (this.currentFilter !== 'all') {
            this.currentCampaigns = this.filterCampaignsByStatus(sortedCampaigns, this.currentFilter);
        } else {
            this.currentCampaigns = sortedCampaigns;
        }
        
        // Re-render the table WITHOUT parameter
        this.renderCampaignsTable();
        
        // Show sorting notification
        const fieldNames = {
            'created_at': 'Date Created',
            'title': 'Title',
            'target_amount': 'Target Amount',
            'current_amount': 'Amount Raised',
            'progress_percentage': 'Progress',
            'donors_count': 'Donor Count'
        };
        
        const dirText = direction === 'asc' ? 'Ascending' : 'Descending';
        this.showNotification(`Sorted by ${fieldNames[field] || field} (${dirText})`, 'info');
    }

    // Export functionality
    exportCampaigns() {
        if (!this.allCampaigns || this.allCampaigns.length === 0) {
            this.showNotification('No campaigns to export', 'warning');
            return;
        }
        
        // Create CSV content
        const headers = ['ID', 'Title', 'Category', 'Target Amount', 'Raised Amount', 'Progress %', 'Donors', 'Days Left', 'Status', 'Organizer', 'Created Date'];
        
        const csvRows = [
            headers.join(','),
            ...this.allCampaigns.map(campaign => [
                campaign.id,
                `"${(campaign.title || '').replace(/"/g, '""')}"`,
                campaign.category || '',
                campaign.target_amount || 0,
                campaign.current_amount || 0,
                campaign.progress_percentage || 0,
                campaign.donors_count || 0,
                campaign.days_left || 0,
                campaign.status || '',
                `"${(campaign.organizer || '').replace(/"/g, '""')}"`,
                campaign.created_at || ''
            ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `campaigns_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(`Exported ${this.allCampaigns.length} campaigns to CSV`, 'success');
    }

    // Add this method to your AdminDashboard class
    async deleteCampaign(campaignId) {
        try {
            console.log('Deleting campaign ID:', campaignId);
            
            // Show confirmation dialog
            const confirmed = await this.showDeleteConfirmation(campaignId);
            if (!confirmed) return;
            
            // Get authentication token
            const token = localStorage.getItem('micro_donation_token') || 
                        localStorage.getItem('token');
            
            if (!token) {
                this.showNotification('Authentication required. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }
            
            // Show loading state on the button
            const deleteBtn = document.querySelector(`button[onclick="adminDashboard.deleteCampaign(${campaignId})"]`);
            const originalHtml = deleteBtn?.innerHTML || '';
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
            }
            
            // Get user data for verification
            const userString = localStorage.getItem('micro_donation_user') || 
                            localStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            
            // Prepare request payload
            const payload = {
                campaign_id: campaignId
            };
            
            console.log('Sending delete request with payload:', payload);
            console.log('Using token:', token ? 'Present' : 'Missing');
            
            // Make API call
            const response = await fetch('backend/api/campaigns/delete.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token,
                    'X-User-ID': user?.id || '',
                    'X-User-Role': user?.role || ''
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Delete response status:', response.status);
            
            // Get response text first for debugging
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                throw new Error('Server returned invalid response format');
            }
            
            // Restore button
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalHtml;
            }
            
            if (result.success) {
                // Show success notification
                this.showNotification(result.message || 'Campaign deleted successfully', 'success');
                
                // Remove campaign from local arrays
                this.allCampaigns = this.allCampaigns.filter(c => c.id !== campaignId);
                this.currentCampaigns = this.currentCampaigns.filter(c => c.id !== campaignId);
                
                // Re-render the table
                this.renderCampaignsTable();
                
                // Update campaign statistics
                this.loadCampaignStatistics();
                
                // Log success
                console.log(`Campaign ID ${campaignId} deleted successfully`);
            } else {
                throw new Error(result.message || 'Failed to delete campaign');
            }
            
        } catch (error) {
            console.error('Error deleting campaign:', error);
            
            // Restore button if it exists
            const deleteBtn = document.querySelector(`button[onclick="adminDashboard.deleteCampaign(${campaignId})"]`);
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            }
            
            // Show error message
            this.showNotification('Failed to delete campaign: ' + error.message, 'error');
        }
    }

    // Add confirmation dialog method
    showDeleteConfirmation(campaignId) {
        return new Promise((resolve) => {
            // Find campaign title
            const campaign = this.allCampaigns.find(c => c.id === campaignId);
            const campaignTitle = campaign ? campaign.title : `Campaign #${campaignId}`;
            
            // Create modal dynamically
            const modalId = 'deleteConfirmModal';
            let modal = document.getElementById(modalId);
            
            // Remove existing modal if any
            if (modal) {
                modal.remove();
            }
            
            // Create modal element
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
                                    <strong>"${campaignTitle}"</strong>
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
                                <i class="fas fa-times me-2"></i>
                                Cancel
                            </button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                                <i class="fas fa-trash me-2"></i>
                                Yes, Delete Campaign
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Initialize modal
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            
            // Handle confirm
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            confirmBtn.onclick = () => {
                bootstrapModal.hide();
                // Clean up modal after hidden
                modal.addEventListener('hidden.bs.modal', () => {
                    modal.remove();
                });
                resolve(true);
            };
            
            // Handle cancel and close
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve(false);
            });
        });
    }

        async viewCampaign(campaignId) {
        try {
            console.log('Viewing campaign ID:', campaignId);
            
            // Show loading notification
            this.showNotification('Loading campaign details...', 'info');
            
            // Get authentication token
            const token = localStorage.getItem('micro_donation_token') || 
                        localStorage.getItem('token');
            
            // Fetch campaign details
            const response = await fetch(`backend/api/campaigns/get-single.php?id=${campaignId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': token ? 'Bearer ' + token : ''
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success || !result.campaign) {
                throw new Error(result.message || 'Campaign not found');
            }
            
            const campaign = result.campaign;
            
            // Create and show modal with campaign details
            this.showCampaignDetailsModal(campaign);
            
        } catch (error) {
            console.error('Error viewing campaign:', error);
            this.showNotification('Failed to load campaign details: ' + error.message, 'error');
        }
    }

    showCampaignDetailsModal(campaign) {
        // Format currency
        const formatCurrency = (amount) => {
            return 'RM ' + parseFloat(amount || 0).toLocaleString('en-MY', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };
        
        // Format date
        const formatDate = (dateString) => {
            if (!dateString) return 'Not set';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        // Calculate progress
        const targetAmount = parseFloat(campaign.target_amount || 0);
        const currentAmount = parseFloat(campaign.current_amount || 0);
        const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount * 100) : 0;
        
        // Determine status color
        const statusColor = {
            'active': 'success',
            'completed': 'info',
            'cancelled': 'danger',
            'pending': 'warning'
        }[campaign.status?.toLowerCase()] || 'secondary';
        
        // Create modal
        const modalId = 'viewCampaignModal';
        let modal = document.getElementById(modalId);
        
        if (modal) {
            modal.remove();
        }
        
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-hidden', 'true');
        
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
                        <!-- Campaign Header Image -->
                        <div class="text-center mb-4">
                            ${campaign.image_url && campaign.image_url !== 'assets/images/default-campaign.jpg' ? 
                                `<img src="${campaign.image_url}" alt="${campaign.title}" 
                                    class="img-fluid rounded" style="max-height: 250px; object-fit: cover;">` : 
                                `<div class="bg-light rounded d-flex align-items-center justify-content-center p-5">
                                    <i class="fas fa-hand-holding-heart fa-5x text-primary opacity-50"></i>
                                </div>`
                            }
                        </div>
                        
                        <!-- Title and Status -->
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h3 class="mb-1">${campaign.title || 'Untitled Campaign'}</h3>
                                <span class="badge bg-${statusColor} fs-6">${campaign.status || 'Unknown'}</span>
                                ${campaign.featured ? '<span class="badge bg-warning ms-2 fs-6"><i class="fas fa-star me-1"></i>Featured</span>' : ''}
                            </div>
                            <div class="text-end">
                                <small class="text-muted d-block">Campaign ID</small>
                                <strong>#${campaign.id}</strong>
                            </div>
                        </div>
                        
                        <!-- Progress Section -->
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
                                            <span class="text-success fw-bold">${formatCurrency(currentAmount)}</span>
                                            <span class="text-muted">of ${formatCurrency(targetAmount)}</span>
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
                        
                        <!-- Campaign Details Grid -->
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
                                                <td><span class="badge bg-info">${campaign.category || 'Uncategorized'}</span></td>
                                            </tr>
                                            <tr>
                                                <th>Organizer:</th>
                                                <td>${campaign.organizer || 'Not specified'}</td>
                                            </tr>
                                            <tr>
                                                <th>Created By:</th>
                                                <td>${campaign.created_by_name || 'System'}</td>
                                            </tr>
                                            <tr>
                                                <th>Created Date:</th>
                                                <td>${formatDate(campaign.created_at)}</td>
                                            </tr>
                                            <tr>
                                                <th>Last Updated:</th>
                                                <td>${formatDate(campaign.updated_at)}</td>
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
                                                <td class="fw-bold text-primary">${formatCurrency(targetAmount)}</td>
                                            </tr>
                                            <tr>
                                                <th>Current Raised:</th>
                                                <td class="fw-bold text-success">${formatCurrency(currentAmount)}</td>
                                            </tr>
                                            <tr>
                                                <th>End Date:</th>
                                                <td>
                                                    ${campaign.end_date ? formatDate(campaign.end_date) : 'No end date'}
                                                    ${campaign.days_left ? `<span class="badge ${campaign.days_left < 7 ? 'bg-danger' : 'bg-secondary'} ms-2">
                                                        ${campaign.days_left} days left
                                                    </span>` : ''}
                                                </td>
                                            </tr>
                                            <tr>
                                                <th>Days Active:</th>
                                                <td>${campaign.days_active || 'N/A'}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Description -->
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <h6 class="mb-0"><i class="fas fa-align-left me-2"></i>Description</h6>
                            </div>
                            <div class="card-body">
                                <p class="mb-0" style="white-space: pre-line;">${campaign.description || 'No description provided.'}</p>
                            </div>
                        </div>
                        
                        <!-- Additional Stats -->
                        <div class="row">
                            <div class="col-md-4">
                                <div class="card bg-light">
                                    <div class="card-body text-center">
                                        <i class="fas fa-receipt fa-2x text-info mb-2"></i>
                                        <h6 class="mb-1">Total Transactions</h6>
                                        <h4>${campaign.donations_count || campaign.donors_count || 0}</h4>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-light">
                                    <div class="card-body text-center">
                                        <i class="fas fa-chart-line fa-2x text-warning mb-2"></i>
                                        <h6 class="mb-1">Average Donation</h6>
                                        <h4>${campaign.avg_donation ? formatCurrency(campaign.avg_donation) : formatCurrency(0)}</h4>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-light">
                                    <div class="card-body text-center">
                                        <i class="fas fa-calendar-alt fa-2x text-success mb-2"></i>
                                        <h6 class="mb-1">Last Donation</h6>
                                        <h6 class="mt-2">${campaign.last_donation_date ? formatDate(campaign.last_donation_date) : 'No donations yet'}</h6>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-primary" onclick="window.adminDashboard.editCampaign(${campaign.id})">
                            <i class="fas fa-edit me-2"></i>Edit Campaign
                        </button>
                        <button type="button" class="btn btn-outline-success" onclick="window.open('campaigns.html?campaign=${campaign.id}', '_blank')">
                            <i class="fas fa-external-link-alt me-2"></i>View Public Page
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize and show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Clean up on hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

        async editCampaign(campaignId) {
        try {
            console.log('Editing campaign ID:', campaignId);
            
            // Show loading notification
            this.showNotification('Loading campaign for editing...', 'info');
            
            // Get authentication token
            const token = localStorage.getItem('micro_donation_token') || 
                        localStorage.getItem('token');
            
            // Check admin authorization
            const userString = localStorage.getItem('micro_donation_user') || 
                            localStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            
            if (!user || user.role !== 'admin') {
                this.showNotification('Access denied. Admin privileges required.', 'error');
                return;
            }
            
            // Fetch campaign details
            const response = await fetch(`backend/api/campaigns/get-single.php?id=${campaignId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': token ? 'Bearer ' + token : ''
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success || !result.campaign) {
                throw new Error(result.message || 'Campaign not found');
            }
            
            const campaign = result.campaign;
            
            // Show edit campaign modal
            this.showEditCampaignModal(campaign);
            
        } catch (error) {
            console.error('Error loading campaign for edit:', error);
            this.showNotification('Failed to load campaign for editing: ' + error.message, 'error');
        }
    }

    showEditCampaignModal(campaign) {
        // Create or get modal
        const modalId = 'editCampaignModal';
        let modal = document.getElementById(modalId);
        
        if (modal) {
            modal.remove();
        }
        
        // Format date for input fields
        const formatDateForInput = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        };
        
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>
                            Edit Campaign
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editCampaignForm" enctype="multipart/form-data">
                            <input type="hidden" name="campaign_id" value="${campaign.id}">
                            
                            <!-- Campaign Title -->
                            <div class="mb-3">
                                <label class="form-label fw-bold">Campaign Title <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" name="title" 
                                    value="${this.escapeHtml(campaign.title || '')}" 
                                    required maxlength="100">
                            </div>
                            
                            <div class="row">
                                <!-- Category -->
                                <div class="col-md-6 mb-3">
                                    <label class="form-label fw-bold">Category <span class="text-danger">*</span></label>
                                    <select class="form-select" name="category" required>
                                        <option value="">Select Category</option>
                                        ${this.getCategoryOptions(campaign.category)}
                                    </select>
                                </div>
                                
                                <!-- Status -->
                                <div class="col-md-6 mb-3">
                                    <label class="form-label fw-bold">Status</label>
                                    <select class="form-select" name="status">
                                        <option value="active" ${campaign.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="completed" ${campaign.status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="cancelled" ${campaign.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                        <option value="pending" ${campaign.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    </select>
                                    <small class="text-muted">Change campaign status</small>
                                </div>
                            </div>
                            
                            <div class="row">
                                <!-- Goal Amount -->
                                <div class="col-md-6 mb-3">
                                    <label class="form-label fw-bold">Goal Amount (RM) <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control" name="goal_amount" 
                                        value="${campaign.target_amount || ''}" 
                                        min="100" step="100" required>
                                </div>
                                
                                <!-- End Date -->
                                <div class="col-md-6 mb-3">
                                    <label class="form-label fw-bold">End Date</label>
                                    <input type="date" class="form-control" name="end-date" 
                                        value="${formatDateForInput(campaign.end_date)}"
                                        min="${new Date().toISOString().split('T')[0]}">
                                </div>
                            </div>
                            
                            <div class="row">
                                <!-- Organizer -->
                                <div class="col-md-6 mb-3">
                                    <label class="form-label fw-bold">Organizer</label>
                                    <input type="text" class="form-control" name="organizer" 
                                        value="${this.escapeHtml(campaign.organizer || '')}" 
                                        maxlength="100">
                                </div>
                                
                                <!-- Featured Checkbox -->
                                <div class="col-md-6 mb-3">
                                    <label class="form-label fw-bold">Promotion</label>
                                    <div class="form-check mt-2">
                                        <input class="form-check-input" type="checkbox" name="featured" id="editFeaturedCampaign" 
                                            ${campaign.featured ? 'checked' : ''}>
                                        <label class="form-check-label" for="editFeaturedCampaign">
                                            <i class="fas fa-star text-warning me-1"></i>
                                            Mark as featured campaign
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <div class="mb-3">
                                <label class="form-label fw-bold">Description <span class="text-danger">*</span></label>
                                <textarea class="form-control" name="description" rows="5" required maxlength="1000">${this.escapeHtml(campaign.description || '')}</textarea>
                            </div>
                            
                            <!-- Current Campaign Image -->
                            <div class="mb-3">
                                <label class="form-label fw-bold">Current Campaign Image</label>
                                <div class="d-flex align-items-center mb-3">
                                    ${campaign.image_url && campaign.image_url !== 'assets/images/default-campaign.jpg' ? 
                                        `<div class="position-relative">
                                            <img src="${campaign.image_url}" alt="Current campaign image" 
                                                style="max-width: 200px; max-height: 150px;" class="img-thumbnail">
                                            <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" 
                                                onclick="adminDashboard.removeCampaignImage(${campaign.id}, this)">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>` : 
                                        `<span class="text-muted">No image uploaded</span>`
                                    }
                                </div>
                            </div>
                            
                            <!-- Upload New Image -->
                            <div class="mb-3">
                                <label class="form-label fw-bold">Update Campaign Image</label>
                                <input type="file" class="form-control" name="campaign_image" accept="image/*">
                                <small class="text-muted">Leave empty to keep current image. Max 5MB, recommended: 1200x600px</small>
                                
                                <!-- Image preview for new upload -->
                                <div class="mt-2" id="editImagePreviewContainer" style="display: none;">
                                    <img id="editImagePreview" class="img-thumbnail" style="max-height: 150px;">
                                    <button type="button" class="btn btn-sm btn-danger mt-2" onclick="adminDashboard.clearEditImagePreview()">
                                        <i class="fas fa-times me-1"></i> Remove New Image
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Form Message -->
                            <div id="editCampaignFormMessage" class="alert" style="display: none;"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Cancel
                        </button>
                        <button type="button" class="btn btn-warning" id="submitEditCampaignBtn">
                            <i class="fas fa-save me-2"></i>Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Setup image preview
        const fileInput = modal.querySelector('input[name="campaign_image"]');
        fileInput.addEventListener('change', (event) => {
            this.previewEditImage(event);
        });
        
        // Setup form submission
        const submitBtn = modal.querySelector('#submitEditCampaignBtn');
        submitBtn.addEventListener('click', () => {
            this.submitEditCampaignForm(campaign.id);
        });
        
        // Clean up on hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    // Helper method to escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper method to get category options with selected value
    getCategoryOptions(selectedCategory) {
        const categories = [
            'education', 'community', 'environment', 'health', 
            'sports', 'technology', 'arts', 'emergency'
        ];
        
        let options = '';
        categories.forEach(category => {
            const selected = category === selectedCategory ? 'selected' : '';
            options += `<option value="${category}" ${selected}>${category.charAt(0).toUpperCase() + category.slice(1)}</option>`;
        });
        
        return options;
    }

    // Preview image for edit modal
    previewEditImage(event) {
        const input = event.target;
        const previewContainer = document.getElementById('editImagePreviewContainer');
        const preview = document.getElementById('editImagePreview');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                preview.src = e.target.result;
                previewContainer.style.display = 'block';
            }
            
            reader.readAsDataURL(input.files[0]);
        }
    }

    // Clear edit image preview
    clearEditImagePreview() {
        const fileInput = document.querySelector('#editCampaignModal input[name="campaign_image"]');
        const previewContainer = document.getElementById('editImagePreviewContainer');
        const preview = document.getElementById('editImagePreview');
        
        if (fileInput) fileInput.value = '';
        if (preview) preview.src = '';
        if (previewContainer) previewContainer.style.display = 'none';
    }

    // Remove campaign image
    async removeCampaignImage(campaignId, buttonElement) {
        try {
            if (!confirm('Are you sure you want to remove the campaign image?')) {
                return;
            }
            
            const token = localStorage.getItem('micro_donation_token') || 
                        localStorage.getItem('token');
            const userString = localStorage.getItem('micro_donation_user') || 
                            localStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            
            // Show loading state
            const originalHtml = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            
            const response = await fetch('backend/api/campaigns/remove-image.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': token ? 'Bearer ' + token : ''
                },
                body: JSON.stringify({
                    campaign_id: campaignId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Remove the image container
                const imageContainer = buttonElement.closest('.position-relative');
                if (imageContainer) {
                    imageContainer.remove();
                }
                
                // Add placeholder text
                const imageSection = buttonElement.closest('.mb-3').querySelector('.d-flex');
                if (imageSection) {
                    imageSection.innerHTML = '<span class="text-muted">No image uploaded</span>';
                }
                
                this.showNotification('Campaign image removed successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to remove image');
            }
        } catch (error) {
            console.error('Error removing campaign image:', error);
            this.showNotification('Failed to remove image: ' + error.message, 'error');
            
            // Restore button
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = '<i class="fas fa-times"></i>';
            }
        }
    }

    // Submit edit campaign form
    async submitEditCampaignForm(campaignId) {
        const form = document.getElementById('editCampaignForm');
        const formData = new FormData(form);
        const messageDiv = document.getElementById('editCampaignFormMessage');
        const submitBtn = document.getElementById('submitEditCampaignBtn');
        const modal = bootstrap.Modal.getInstance(document.getElementById('editCampaignModal'));
        
        // Get authentication
        const token = localStorage.getItem('micro_donation_token') || 
                    localStorage.getItem('token');
        const userString = localStorage.getItem('micro_donation_user') || 
                        localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        
        // Disable submit button
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        try {
            // Show loading message
            messageDiv.style.display = 'block';
            messageDiv.className = 'alert alert-info';
            messageDiv.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Updating campaign...';
            
            console.log('Submitting edit for campaign ID:', campaignId);
            
            const response = await fetch('backend/api/campaigns/update.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'X-User-ID': user?.id || '',
                    'X-User-Role': user?.role || ''
                }
            });
            
            const responseText = await response.text();
            console.log('Edit response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                throw new Error('Invalid server response');
            }
            
            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }
            
            if (result.success) {
                // Success message
                messageDiv.className = 'alert alert-success';
                messageDiv.innerHTML = '<i class="fas fa-check-circle me-2"></i>Campaign updated successfully!';
                
                this.showNotification('Campaign updated successfully', 'success');
                
                // Update campaign in local arrays
                this.updateCampaignInArrays(campaignId, result.campaign);
                
                // Re-render table
                this.renderCampaignsTable();
                
                // Close modal after delay
                setTimeout(() => {
                    if (modal) modal.hide();
                }, 1500);
            } else {
                throw new Error(result.message || 'Failed to update campaign');
            }
            
        } catch (error) {
            console.error('Error updating campaign:', error);
            
            messageDiv.className = 'alert alert-danger';
            messageDiv.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>' + error.message;
            
            this.showNotification('Failed to update campaign: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // Update campaign in local arrays after edit
    updateCampaignInArrays(campaignId, updatedCampaign) {
        // Update allCampaigns
        const index = this.allCampaigns.findIndex(c => c.id === campaignId);
        if (index !== -1) {
            this.allCampaigns[index] = {...this.allCampaigns[index], ...updatedCampaign};
        }
        
        // Update currentCampaigns
        const currentIndex = this.currentCampaigns.findIndex(c => c.id === campaignId);
        if (currentIndex !== -1) {
            this.currentCampaigns[currentIndex] = {...this.currentCampaigns[currentIndex], ...updatedCampaign};
        }
    }

    // ============================================
    // DONORS PAGE (EXISTING)
    // ============================================
    
    getDonorsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3 mb-0 text-gray-800">Donor Management</h1>
                        <div>
                            <button class="btn btn-primary me-2" onclick="adminDashboard.openAddDonorModal()">
                                <i class="fas fa-user-plus me-2"></i> Add Donor
                            </button>
                            <button class="btn btn-outline-primary" onclick="adminDashboard.refreshDonors()">
                                <i class="fas fa-sync-alt"></i>
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
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="donorsTotal">156</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 12%</span>
                                        <span>Since last month</span>
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
                    <div class="card border-left-success shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Active Donors</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="activeDonors">124</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 8</span>
                                        <span>This month</span>
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
                    <div class="card border-left-info shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                        New Donors</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="newDonors">24</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-user-plus"></i></span>
                                        <span>Last 30 days</span>
                                    </div>
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
                                    <div class="h5 mb-0 font-weight-bold text-gray-800" id="avgDonation">RM 65.40</div>
                                    <div class="mt-2 mb-0 text-muted text-xs">
                                        <span class="text-success mr-2"><i class="fas fa-arrow-up"></i> 3.2%</span>
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
            </div>

            <!-- Search and Filter -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                                        <input type="text" class="form-control" id="searchDonors" placeholder="Search donors by name, email, or ID...">
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="new">New</option>
                                        <option value="recurring">Recurring</option>
                                    </select>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <select class="form-select" id="filterDate">
                                        <option value="">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                        <option value="quarter">This Quarter</option>
                                    </select>
                                </div>
                                <div class="col-md-2 mb-3">
                                    <button class="btn btn-outline-primary w-100" onclick="adminDashboard.clearFilters()">
                                        <i class="fas fa-times"></i> Clear
                                    </button>
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
                        <div class="card-header py-3 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">All Donors</h6>
                            <div>
                                <button class="btn btn-sm btn-outline-primary me-2" onclick="adminDashboard.exportDonors()">
                                    <i class="fas fa-download"></i> Export
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="adminDashboard.sendBulkEmail()">
                                    <i class="fas fa-envelope"></i> Email
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover" id="donorsTable" width="100%" cellspacing="0">
                                    <thead class="thead-light">
                                        <tr>
                                            <th>
                                                <input type="checkbox" id="selectAllDonors" class="form-check-input">
                                            </th>
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
                                        <!-- Donors loaded by JavaScript -->
                                    </tbody>
                                </table>
                            </div>
                            <div class="mt-3 d-flex justify-content-between align-items-center">
                                <div class="text-muted small">
                                    Showing <span id="donorsShowing">0</span> of <span id="donorsTotalCount">0</span> donors
                                </div>
                                <nav aria-label="Page navigation">
                                    <ul class="pagination pagination-sm" id="donorsPagination">
                                        <!-- Pagination loaded by JavaScript -->
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bulk Actions -->
            <div class="row mt-4" id="bulkActionsSection" style="display: none;">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="fas fa-users me-2"></i>
                                    <span id="selectedCount">0</span> donor(s) selected
                                </div>
                                <div class="btn-group">
                                    <button class="btn btn-outline-primary btn-sm" onclick="adminDashboard.sendEmailToSelected()">
                                        <i class="fas fa-envelope me-1"></i> Email
                                    </button>
                                    <button class="btn btn-outline-success btn-sm" onclick="adminDashboard.exportSelectedDonors()">
                                        <i class="fas fa-download me-1"></i> Export
                                    </button>
                                    <button class="btn btn-outline-warning btn-sm" onclick="adminDashboard.updateStatusSelected()">
                                        <i class="fas fa-tag me-1"></i> Update Status
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="adminDashboard.clearSelection()">
                                        <i class="fas fa-times me-1"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Donor Charts -->
            <div class="row mt-4">
                <div class="col-xl-6 col-lg-6 mb-4">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Donor Growth</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="donorGrowthChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-6 col-lg-6 mb-4">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Donation Distribution</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="donationDistributionChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Donor Segmentation -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Donor Segmentation</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <div class="segmentation-card">
                                        <div class="segmentation-icon bg-primary">
                                            <i class="fas fa-star"></i>
                                        </div>
                                        <div class="segmentation-content">
                                            <h6>Top Donors</h6>
                                            <div class="metric-value">12</div>
                                            <div class="metric-label">RM 1,000+ lifetime</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="segmentation-card">
                                        <div class="segmentation-icon bg-success">
                                            <i class="fas fa-redo"></i>
                                        </div>
                                        <div class="segmentation-content">
                                            <h6>Recurring Donors</h6>
                                            <div class="metric-value">42</div>
                                            <div class="metric-label">Regular contributors</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="segmentation-card">
                                        <div class="segmentation-icon bg-info">
                                            <i class="fas fa-calendar-plus"></i>
                                        </div>
                                        <div class="segmentation-content">
                                            <h6>New Donors</h6>
                                            <div class="metric-value">24</div>
                                            <div class="metric-label">Last 30 days</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="segmentation-card">
                                        <div class="segmentation-icon bg-warning">
                                            <i class="fas fa-clock"></i>
                                        </div>
                                        <div class="segmentation-content">
                                            <h6>Lapsed Donors</h6>
                                            <div class="metric-value">18</div>
                                            <div class="metric-label">90+ days inactive</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadDonorsData() {
        await this.loadDonors();
        this.initDonorCharts();
        this.setupDonorEventListeners();
    }
    
    async loadDonors() {
        try {
            // Show loading state
            const donorsBody = document.getElementById('donorsBody');
            if (donorsBody) {
                donorsBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2">Loading donors...</p>
                        </td>
                    </tr>
                `;
            }
            
            // Fetch donors from API
            const response = await fetch('backend/api/donors/get-all.php', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && Array.isArray(result.donors)) {
                this.renderDonors(result.donors);
                this.updateDonorStats(result.donors);
            } else {
                // Fallback to sample data if API fails
                const sampleDonors = this.getSampleDonorData();
                this.renderDonors(sampleDonors);
                this.updateDonorStats(sampleDonors);
                this.showNotification('Using sample donor data', 'info');
            }
            
        } catch (error) {
            console.error('Error loading donors:', error);
            // Use sample data
            const sampleDonors = this.getSampleDonorData();
            this.renderDonors(sampleDonors);
            this.updateDonorStats(sampleDonors);
            this.showNotification('Failed to load donors, using sample data', 'warning');
        }
    }
    
    getSampleDonorData() {
        return [
            { id: 1, name: 'Ahmad Rahim', email: 'ahmad@example.com', phone: '+6012-345-6789', totalDonations: 1250.00, lastDonation: '2025-12-18', status: 'active', donationsCount: 8 },
            { id: 2, name: 'Siti Aminah', email: 'siti@example.com', phone: '+6013-456-7890', totalDonations: 850.00, lastDonation: '2025-12-18', status: 'active', donationsCount: 5 },
            { id: 3, name: 'John Lee', email: 'john@example.com', phone: '+6014-567-8901', totalDonations: 620.00, lastDonation: '2025-12-17', status: 'active', donationsCount: 3 },
            { id: 4, name: 'Maria Tan', email: 'maria@example.com', phone: '+6015-678-9012', totalDonations: 350.00, lastDonation: '2025-12-15', status: 'recurring', donationsCount: 12 },
            { id: 5, name: 'Raj Kumar', email: 'raj@example.com', phone: '+6016-789-0123', totalDonations: 280.00, lastDonation: '2025-12-10', status: 'active', donationsCount: 2 },
            { id: 6, name: 'Chen Wei', email: 'chen@example.com', phone: '+6017-890-1234', totalDonations: 950.00, lastDonation: '2025-12-08', status: 'recurring', donationsCount: 7 },
            { id: 7, name: 'Ali Hassan', email: 'ali@example.com', phone: '+6018-901-2345', totalDonations: 420.00, lastDonation: '2025-12-05', status: 'inactive', donationsCount: 1 },
            { id: 8, name: 'Fatimah Zain', email: 'fatimah@example.com', phone: '+6019-012-3456', totalDonations: 150.00, lastDonation: '2025-12-01', status: 'new', donationsCount: 1 },
            { id: 9, name: 'David Wong', email: 'david@example.com', phone: '+6011-123-4567', totalDonations: 780.00, lastDonation: '2025-11-28', status: 'active', donationsCount: 4 },
            { id: 10, name: 'Lisa Lim', email: 'lisa@example.com', phone: '+6012-234-5678', totalDonations: 320.00, lastDonation: '2025-11-25', status: 'active', donationsCount: 2 }
        ];
    }
    
    renderDonors(donors) {
        const donorsBody = document.getElementById('donorsBody');
        if (!donorsBody) return;
        
        // Format currency using utils if available
        const formatCurrency = (amount) => {
            if (typeof utils !== 'undefined' && utils.formatCurrency) {
                return utils.formatCurrency(amount);
            }
            return `RM ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };
        
        // Format date
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-MY');
        };
        
        // Get status badge class
        const getStatusClass = (status) => {
            const classes = {
                'active': 'bg-success',
                'inactive': 'bg-secondary',
                'new': 'bg-info',
                'recurring': 'bg-warning'
            };
            return classes[status] || 'bg-secondary';
        };
        
        donorsBody.innerHTML = donors.map(donor => `
            <tr data-donor-id="${donor.id}">
                <td>
                    <input type="checkbox" class="donor-checkbox form-check-input" data-id="${donor.id}">
                </td>
                <td><strong>#DON${donor.id.toString().padStart(4, '0')}</strong></td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-circle bg-primary text-white me-3">
                            ${donor.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${donor.name}</strong>
                            <div class="small text-muted">${donor.donationsCount || 1} donation(s)</div>
                        </div>
                    </div>
                </td>
                <td>${donor.email}</td>
                <td>${donor.phone || 'Not provided'}</td>
                <td class="fw-bold text-success">${formatCurrency(donor.totalDonations)}</td>
                <td>${formatDate(donor.lastDonation)}</td>
                <td>
                    <span class="badge ${getStatusClass(donor.status)}">${donor.status}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="adminDashboard.viewDonor(${donor.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="adminDashboard.editDonor(${donor.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="adminDashboard.sendEmailToDonor(${donor.id})" title="Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Update counts
        document.getElementById('donorsShowing').textContent = donors.length;
        document.getElementById('donorsTotalCount').textContent = donors.length;
        
        // Setup selection handlers
        this.setupDonorSelection();
    }
    
    updateDonorStats(donors) {
        const total = donors.length;
        const active = donors.filter(d => d.status === 'active' || d.status === 'recurring').length;
        const newDonors = donors.filter(d => d.status === 'new').length;
        const avgDonation = donors.reduce((sum, donor) => sum + donor.totalDonations, 0) / donors.length;
        
        document.getElementById('donorsTotal').textContent = total;
        document.getElementById('activeDonors').textContent = active;
        document.getElementById('newDonors').textContent = newDonors;
        document.getElementById('avgDonation').textContent = `RM ${avgDonation.toFixed(2)}`;
    }
    
    initDonorCharts() {
        // Donor Growth Chart
        const growthCtx = document.getElementById('donorGrowthChart');
        if (growthCtx) {
            this.charts.donorGrowth = new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'New Donors',
                        data: [5, 8, 12, 10, 15, 18, 22, 20, 25, 28, 30, 24],
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Total Donors',
                        data: [120, 128, 140, 150, 165, 183, 205, 225, 250, 278, 308, 332],
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.1)',
                        borderWidth: 2,
                        fill: false
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
                                callback: (value) => value.toLocaleString()
                            }
                        }
                    }
                }
            });
        }
        
        // Donation Distribution Chart
        const distributionCtx = document.getElementById('donationDistributionChart');
        if (distributionCtx) {
            this.charts.donationDistribution = new Chart(distributionCtx, {
                type: 'pie',
                data: {
                    labels: ['RM 1-50', 'RM 51-100', 'RM 101-200', 'RM 201-500', 'RM 500+'],
                    datasets: [{
                        data: [25, 30, 20, 15, 10],
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
    }
    
    setupDonorEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchDonors');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterDonors();
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('filterStatus');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterDonors();
            });
        }
        
        // Date filter
        const dateFilter = document.getElementById('filterDate');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filterDonors();
            });
        }
        
        // Select all checkbox
        const selectAll = document.getElementById('selectAllDonors');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.donor-checkbox');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
                this.updateBulkActions();
            });
        }
    }
    
    setupDonorSelection() {
        const checkboxes = document.querySelectorAll('.donor-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                this.updateBulkActions();
            });
        });
    }
    
    updateBulkActions() {
        const selectedCount = document.querySelectorAll('.donor-checkbox:checked').length;
        const bulkActionsSection = document.getElementById('bulkActionsSection');
        const selectedCountSpan = document.getElementById('selectedCount');
        
        if (selectedCount > 0) {
            bulkActionsSection.style.display = 'block';
            selectedCountSpan.textContent = selectedCount;
        } else {
            bulkActionsSection.style.display = 'none';
        }
    }
    
    filterDonors() {
        const searchTerm = document.getElementById('searchDonors').value.toLowerCase();
        const statusFilter = document.getElementById('filterStatus').value;
        const rows = document.querySelectorAll('#donorsBody tr');
        
        let visibleCount = 0;
        
        rows.forEach(row => {
            const name = row.cells[2].textContent.toLowerCase();
            const email = row.cells[3].textContent.toLowerCase();
            const status = row.cells[7].textContent.toLowerCase();
            
            const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
            const matchesStatus = !statusFilter || status.includes(statusFilter);
            
            if (matchesSearch && matchesStatus) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        document.getElementById('donorsShowing').textContent = visibleCount;
    }
    
    clearFilters() {
        document.getElementById('searchDonors').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterDate').value = '';
        this.filterDonors();
    }
    
    clearSelection() {
        document.querySelectorAll('.donor-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('selectAllDonors').checked = false;
        this.updateBulkActions();
    }
    
    refreshDonors() {
        this.showNotification('Refreshing donor data...', 'info');
        this.loadDonors();
    }
    
    openAddDonorModal() {
        this.showNotification('Add donor feature coming soon', 'info');
        // Implementation for adding donors would go here
    }
    
    viewDonor(donorId) {
        this.showNotification(`Viewing donor #${donorId}`, 'info');
        // Implementation for viewing donor details would go here
    }
    
    editDonor(donorId) {
        this.showNotification(`Editing donor #${donorId}`, 'info');
        // Implementation for editing donor would go here
    }
    
    sendEmailToDonor(donorId) {
        this.showNotification(`Preparing email for donor #${donorId}`, 'info');
        // Implementation for sending email would go here
    }
    
    sendEmailToSelected() {
        const selected = document.querySelectorAll('.donor-checkbox:checked');
        const count = selected.length;
        this.showNotification(`Preparing email for ${count} selected donors`, 'info');
    }
    
    exportSelectedDonors() {
        const selected = document.querySelectorAll('.donor-checkbox:checked');
        const count = selected.length;
        this.showNotification(`Exporting ${count} selected donors`, 'info');
    }
    
    updateStatusSelected() {
        const selected = document.querySelectorAll('.donor-checkbox:checked');
        const count = selected.length;
        this.showNotification(`Updating status for ${count} selected donors`, 'info');
    }
    
    exportDonors() {
        this.showNotification('Exporting donor list...', 'info');
        // Implementation for exporting donors would go here
    }
    
    sendBulkEmail() {
        this.showNotification('Preparing bulk email to all donors', 'info');
        // Implementation for bulk email would go here
    }

    // ============================================
    // ANALYTICS PAGE (EXISTING)
    // ============================================
    
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
    
    async loadAnalyticsData() {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.initCampaignTrendsChart();
        this.initDemographicsChart();
        this.initProcessingTimeChart();
        this.setupAnalyticsEventListeners();
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
    
    setupAnalyticsEventListeners() {
        // Open analytics modal
        const openModalBtn = document.getElementById('openAnalyticsModal');
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                this.openAnalyticsModal();
            });
        }
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

    // ============================================
    // REPORTS PAGE (EXISTING)
    // ============================================
    
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
    
    async loadReportsData() {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.loadReportHistory();
        this.setupReportsEventListeners();
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

    // ============================================
    // SETTINGS PAGE (EXISTING)
    // ============================================
    
    getSettingsHTML() {
        return `
            <div class="row">
                <div class="col-12">
                    <h1 class="h3 mb-4 text-gray-800">Settings</h1>
                    <!-- Settings content -->
                </div>
            </div>
        `;
    }

    // ============================================
    // UTILITY METHODS
    // ============================================
    
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
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
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
    
    updateChartPeriod(period) {
        this.showNotification(`Chart updated to show ${period} data`, 'success');
    }
    
    refreshOverview() {
        this.showNotification('Refreshing dashboard data...', 'info');
        setTimeout(() => {
            this.loadOverviewData();
            this.showNotification('Dashboard refreshed successfully', 'success');
        }, 1000);
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
    
    getRecentTransactionsData() {
        return [
            { id: 'DON-001234', amount: 150.00, date: '2025-12-18', status: 'completed' },
            { id: 'DON-001233', amount: 50.00, date: '2025-12-18', status: 'completed' },
            { id: 'DON-001232', amount: 25.00, date: '2025-12-18', status: 'completed' }
        ];
    }
    
    showNotification(message, type = 'info') {
        // Use utils.showNotification if available
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification(message, type);
        } else {
            // Fallback notification
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
        if (!dateTime) return 'N/A';
        const date = new Date(dateTime);
        return date.toLocaleDateString('en-MY') + ' ' + 
               date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
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