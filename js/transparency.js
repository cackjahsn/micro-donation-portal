// js/transparency.js

document.addEventListener('DOMContentLoaded', function() {
    loadTransparencyData();
});

async function loadTransparencyData() {
    try {
        setLoadingState(true);
        
        // Fetch all stats from the dedicated endpoint
        const response = await utils.fetchAPI('transparency/stats.php');
        
        if (response.success) {
            updateStatsUI(response);
            updateRecentTransactions(response.recent_donations);
        } else {
            throw new Error(response.message || 'Failed to load data');
        }
        
    } catch (error) {
        console.error('Error loading transparency data:', error);
        utils.showNotification('Failed to load transparency data', 'error');
        showFallbackData();
    } finally {
        setLoadingState(false);
    }
}

function updateStatsUI(data) {
    // Total donations
    document.getElementById('totalDonations').textContent = 
        `RM ${data.total_donations.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Direct to cause = 100% - platform fee
    const directToCause = (100 - data.platform_fee).toFixed(1);
    document.getElementById('directToCause').textContent = `${directToCause}%`;
    
    // Total donors
    document.getElementById('totalDonors').textContent = data.total_donors;
    
    // Campaigns funded
    document.getElementById('campaignsFunded').textContent = data.campaigns_funded;
}

function updateRecentTransactions(donations) {
    const tbody = document.getElementById('recentTransactionsBody');
    if (!tbody) return;
    
    // Get token from localStorage (supports both key names used by your auth system)
    let token = localStorage.getItem('micro_donation_token') || localStorage.getItem('token');
    if (token) {
        token = encodeURIComponent(token); // safe for URL
    }
    
    if (!donations || donations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No recent donations found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    donations.forEach(d => {
        const date = new Date(d.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
        const amount = d.amount || 0;
        const statusBadge = d.status === 'completed' ? 'bg-success' : 'bg-warning';
        
        // Build receipt link with token if available
        let receiptLink = '<span class="text-muted">N/A</span>';
        if (d.receipt_id) {
            if (token) {
                receiptLink = `<a href="backend/api/payment/download-receipt.php?donation_id=${d.receipt_id}&token=${token}" class="text-primary" target="_blank">View</a>`;
            } else {
                // Fallback without token (may still work if session exists)
                receiptLink = `<a href="backend/api/payment/download-receipt.php?donation_id=${d.receipt_id}" class="text-primary" target="_blank">View</a>`;
            }
        }
        
        html += `
            <tr>
                <td>${date}</td>
                <td>${d.donor_name}</td>
                <td>${d.campaign_title}</td>
                <td>RM ${amount.toFixed(2)}</td>
                <td><span class="badge ${statusBadge}">${d.status}</span></td>
                <td>${receiptLink}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function setLoadingState(loading) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = loading ? 'block' : 'none';
}

function showFallbackData() {
    // Static fallback data in case API fails
    document.getElementById('totalDonations').textContent = 'RM 124,580';
    document.getElementById('directToCause').textContent = '94.7%';
    document.getElementById('totalDonors').textContent = '2,347';
    document.getElementById('campaignsFunded').textContent = '56';
    
    const tbody = document.getElementById('recentTransactionsBody');
    tbody.innerHTML = `
        <tr>
            <td>2025-12-18</td>
            <td>Anonymous</td>
            <td>Flood Relief Fund</td>
            <td>RM 10.00</td>
            <td><span class="badge bg-success">Completed</span></td>
            <td><a href="#" class="text-primary">View</a></td>
        </tr>
        <tr>
            <td>2025-12-17</td>
            <td>Ahmad R.</td>
            <td>Student Scholarship</td>
            <td>RM 5.00</td>
            <td><span class="badge bg-success">Completed</span></td>
            <td><a href="#" class="text-primary">View</a></td>
        </tr>
        <tr>
            <td>2025-12-16</td>
            <td>Siti M.</td>
            <td>Health Center</td>
            <td>RM 20.00</td>
            <td><span class="badge bg-success">Completed</span></td>
            <td><a href="#" class="text-primary">View</a></td>
        </tr>
        <tr>
            <td>2025-12-15</td>
            <td>Anonymous</td>
            <td>Animal Shelter</td>
            <td>RM 2.00</td>
            <td><span class="badge bg-success">Completed</span></td>
            <td><a href="#" class="text-primary">View</a></td>
        </tr>
        <tr>
            <td>2025-12-14</td>
            <td>John L.</td>
            <td>Community Garden</td>
            <td>RM 50.00</td>
            <td><span class="badge bg-success">Completed</span></td>
            <td><a href="#" class="text-primary">View</a></td>
        </tr>
    `;
}