// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.sidebarCollapsed = false;
        this.dataTable = null;
        this.init();
    }
    
    init() {
        this.loadUserData();
        this.setupSidebarToggle();
        this.setupCharts();
        this.loadDashboardData();
        this.setupEventListeners();
        // DataTables will be initialized after data is loaded
    }
    
    loadUserData() {
        // Load user data from localStorage or API
        const savedUser = localStorage.getItem('communitygive_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateUserInfo();
        }
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
                
                if (wrapper.classList.contains('sidebar-collapsed')) {
                    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                } else {
                    menuToggle.innerHTML = '<i class="fas fa-times"></i>';
                }
                
                // Redraw charts if they exist
                this.redrawCharts();
            });
        }
    }
    
    setupCharts() {
        // Revenue Chart
        this.setupRevenueChart();
        
        // Donation Sources Chart
        this.setupSourcesChart();
        
        // Campaign Progress Chart
        this.setupProgressChart();
    }
    
    redrawCharts() {
        // Give time for sidebar animation
        setTimeout(() => {
            if (this.revenueChart) this.revenueChart.resize();
            if (this.sourcesChart) this.sourcesChart.resize();
            if (this.progressChart) this.progressChart.resize();
        }, 300);
    }
    
    setupRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        this.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Donations (RM)',
                    data: [12000, 19000, 15000, 25000, 22000, 30000, 28000, 35000, 32000, 40000, 38000, 45000],
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
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `RM ${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'RM ' + value.toLocaleString();
                            }
                        },
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    setupSourcesChart() {
        const ctx = document.getElementById('sourcesChart');
        if (!ctx) return;
        
        this.sourcesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['QR Payment', 'Online Banking', 'Credit Card', 'Other'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        '#4e73df',
                        '#1cc88a',
                        '#36b9cc',
                        '#f6c23e'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    setupProgressChart() {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;
        
        this.progressChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Education', 'Health', 'Emergency', 'Community', 'Environment'],
                datasets: [{
                    label: 'Progress (%)',
                    data: [85, 72, 93, 68, 79],
                    backgroundColor: [
                        '#4e73df',
                        '#1cc88a',
                        '#36b9cc',
                        '#f6c23e',
                        '#e74a3b'
                    ],
                    borderWidth: 0
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
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    loadDashboardData() {
        this.loadRecentTransactions();
        this.loadCampaignStats();
        this.loadDonorStats();
    }
    
    loadRecentTransactions() {
        const transactionsBody = document.getElementById('transactionsBody');
        if (!transactionsBody) return;
        
        const transactions = [
            {
                id: 'DON-001234',
                donor: 'Ahmad Rahim',
                campaign: 'Flood Relief Fund',
                amount: 150.00,
                date: '2025-12-18 14:30',
                status: 'completed',
                method: 'QR Payment'
            },
            {
                id: 'DON-001233',
                donor: 'Siti Aminah',
                campaign: 'Student Scholarship',
                amount: 50.00,
                date: '2025-12-18 11:15',
                status: 'completed',
                method: 'Online Banking'
            },
            {
                id: 'DON-001232',
                donor: 'Anonymous',
                campaign: 'Health Center',
                amount: 25.00,
                date: '2025-12-18 09:45',
                status: 'completed',
                method: 'QR Payment'
            },
            {
                id: 'DON-001231',
                donor: 'John Lee',
                campaign: 'Community Garden',
                amount: 100.00,
                date: '2025-12-17 16:20',
                status: 'completed',
                method: 'Credit Card'
            },
            {
                id: 'DON-001230',
                donor: 'Maria Tan',
                campaign: 'Animal Shelter',
                amount: 30.00,
                date: '2025-12-17 13:10',
                status: 'pending',
                method: 'QR Payment'
            },
            {
                id: 'DON-001229',
                donor: 'David Chen',
                campaign: 'Flood Relief Fund',
                amount: 200.00,
                date: '2025-12-17 10:30',
                status: 'completed',
                method: 'Online Banking'
            },
            {
                id: 'DON-001228',
                donor: 'Lisa Wong',
                campaign: 'Student Scholarship',
                amount: 75.00,
                date: '2025-12-16 15:45',
                status: 'completed',
                method: 'Credit Card'
            },
            {
                id: 'DON-001227',
                donor: 'Anonymous',
                campaign: 'Health Center',
                amount: 20.00,
                date: '2025-12-16 12:20',
                status: 'completed',
                method: 'QR Payment'
            }
        ];
        
        // Clear existing content
        transactionsBody.innerHTML = '';
        
        // Add rows
        transactions.forEach(transaction => {
            const row = `
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
            `;
            transactionsBody.innerHTML += row;
        });
        
        // Initialize DataTable AFTER data is loaded
        this.initializeDataTable();
    }
    
    initializeDataTable() {
        // Check if DataTable is already initialized
        if ($.fn.DataTable && $('#transactionsTable').length) {
            if (this.dataTable) {
                this.dataTable.destroy();
            }
            
            this.dataTable = $('#transactionsTable').DataTable({
                pageLength: 10,
                lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
                order: [[4, 'desc']], // Sort by date descending
                responsive: true,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                     '<"row"<"col-sm-12"tr>>' +
                     '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                language: {
                    search: "_INPUT_",
                    searchPlaceholder: "Search transactions...",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ entries",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                columnDefs: [
                    { responsivePriority: 1, targets: 0 }, // ID
                    { responsivePriority: 2, targets: 1 }, // Donor
                    { responsivePriority: 3, targets: 2 }, // Campaign
                    { responsivePriority: 4, targets: 3 }, // Amount
                    { responsivePriority: 5, targets: 4 }, // Date
                    { responsivePriority: 6, targets: 5 }, // Status
                    { responsivePriority: 7, targets: 6 }  // Method
                ]
            });
            
            console.log('DataTable initialized successfully');
        } else {
            console.error('DataTable library not loaded or table not found');
        }
    }
    
    loadCampaignStats() {
        const campaigns = [
            { name: 'Flood Relief', progress: 85, raised: 42500, target: 50000 },
            { name: 'Student Scholarship', progress: 62, raised: 18600, target: 30000 },
            { name: 'Health Center', progress: 56, raised: 42000, target: 75000 },
            { name: 'Animal Shelter', progress: 63, raised: 12600, target: 20000 },
            { name: 'Community Garden', progress: 48, raised: 9600, target: 20000 }
        ];
        
        const container = document.getElementById('campaignStats');
        if (container) {
            let html = '';
            campaigns.forEach(campaign => {
                html += `
                    <div class="campaign-stat-item mb-4">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="fw-bold">${campaign.name}</span>
                            <span class="fw-bold text-primary">${campaign.progress}%</span>
                        </div>
                        <div class="progress mb-2" style="height: 10px;">
                            <div class="progress-bar bg-primary" 
                                 style="width: ${campaign.progress}%"
                                 role="progressbar"></div>
                        </div>
                        <div class="d-flex justify-content-between text-muted">
                            <small>Raised: RM ${campaign.raised.toLocaleString()}</small>
                            <small>Target: RM ${campaign.target.toLocaleString()}</small>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    }
    
    loadDonorStats() {
        const donors = [
            { name: 'Ahmad Rahim', total: 1250, donations: 8 },
            { name: 'Siti Aminah', total: 850, donations: 12 },
            { name: 'John Lee', total: 620, donations: 5 },
            { name: 'Maria Tan', total: 450, donations: 7 },
            { name: 'David Chen', total: 380, donations: 4 }
        ];
        
        const container = document.getElementById('donorStats');
        if (container) {
            let html = '';
            donors.forEach((donor, index) => {
                html += `
                    <div class="donor-stat-item d-flex align-items-center justify-content-between py-3 ${index < donors.length - 1 ? 'border-bottom' : ''}">
                        <div>
                            <h6 class="mb-0">${donor.name}</h6>
                            <small class="text-muted">${donor.donations} donations</small>
                        </div>
                        <div class="fw-bold text-success">
                            RM ${donor.total.toFixed(2)}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    }
    
    setupEventListeners() {
        // Add Campaign Button
        const addCampaignBtn = document.getElementById('addCampaignBtn');
        if (addCampaignBtn) {
            addCampaignBtn.addEventListener('click', () => {
                this.showAddCampaignModal();
            });
        }
        
        // Generate Report Button
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                this.generateReport();
            });
        }
        
        // View Analytics Button
        const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
        if (viewAnalyticsBtn) {
            viewAnalyticsBtn.addEventListener('click', () => {
                this.showNotification('Analytics page coming soon!', 'info');
            });
        }
        
        // Search Input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (this.dataTable) {
                    this.dataTable.search(e.target.value).draw();
                }
            });
        }
    }
    
    showAddCampaignModal() {
        const modal = document.getElementById('addCampaignModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // Setup form submission
            const form = document.getElementById('campaignForm');
            if (form) {
                form.addEventListener('submit', (e) => this.handleCampaignSubmit(e));
            }
        }
    }
    
    async handleCampaignSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.showNotification('Campaign created successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(form.closest('.modal'));
            if (modal) {
                modal.hide();
            }
            
            // Reset form
            form.reset();
            
        } catch (error) {
            this.showNotification('Failed to create campaign. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async generateReport() {
        try {
            this.showNotification('Generating report...', 'info');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const reportData = {
                title: 'Donation Report - December 2025',
                generated: new Date().toISOString(),
                totalDonations: 124580,
                totalDonors: 2347,
                activeCampaigns: 8,
                successRate: 94.7,
                transactions: this.getRecentTransactionsData()
            };
            
            const dataStr = JSON.stringify(reportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `donation-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showNotification('Report downloaded successfully!', 'success');
            
        } catch (error) {
            this.showNotification('Failed to generate report', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        const existing = document.querySelector('.admin-notification');
        if (existing) {
            existing.remove();
        }
        
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
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
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
        return date.toLocaleDateString('en-MY') + ' ' + date.toLocaleTimeString('en-MY', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    getRecentTransactionsData() {
        return [
            { id: 'DON-001234', amount: 150.00, date: '2025-12-18', status: 'completed' },
            { id: 'DON-001233', amount: 50.00, date: '2025-12-18', status: 'completed' },
            { id: 'DON-001232', amount: 25.00, date: '2025-12-18', status: 'completed' }
        ];
    }
    
    // Export functionality for the Export button
    exportData() {
        const data = this.exportDashboardData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        this.showNotification('Data exported successfully!', 'success');
    }
    
    exportDashboardData() {
        return {
            exportDate: new Date().toISOString(),
            summary: {
                totalDonations: 10230,
                activeCampaigns: 8,
                totalDonors: 156,
                successRate: 94.5
            },
            recentTransactions: this.getRecentTransactionsData()
        };
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated as admin
    if (typeof auth !== 'undefined') {
        if (!auth.isAuthenticated() || !auth.isAdmin()) {
            console.error('Access denied: User is not authenticated or not admin');
            return;
        }
    }
    
    // Initialize dashboard
    const adminDashboard = new AdminDashboard();
    
    // Make available globally for debugging
    window.adminDashboard = adminDashboard;
});

// Handle page resizing for charts
window.addEventListener('resize', function() {
    if (window.adminDashboard) {
        window.adminDashboard.redrawCharts();
    }
});