// js/transparency.js

document.addEventListener('DOMContentLoaded', function() {
    loadTransparencyData();
});

async function loadTransparencyData() {
    try {
        setLoadingState(true);

        // 1. Fetch platform stats (public)
        const statsResponse = await utils.fetchAPI('transparency/stats.php');
        if (statsResponse.success) {
            updateStatsUI(statsResponse);
        } else {
            throw new Error(statsResponse.message || 'Failed to load stats');
        }

        // 2. Fetch current user's donations if logged in
        const user = getCurrentUser();
        if (user && user.id) {
            await loadUserDonations(user.id);
        } else {
            // Not logged in – show empty table with login prompt
            showLoginPrompt();
        }

    } catch (error) {
        console.error('Error loading transparency data:', error);
        utils.showNotification('Failed to load data', 'error');
        showFallbackData();
    } finally {
        setLoadingState(false);
    }
}

function getCurrentUser() {
    // Try to get user from auth or utils
    if (typeof auth !== 'undefined' && auth.getCurrentUser) {
        return auth.getCurrentUser();
    }
    if (typeof utils !== 'undefined' && utils.getCurrentUser) {
        return utils.getCurrentUser();
    }
    // Fallback to localStorage
    const userData = localStorage.getItem('micro_donation_user') || localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

async function loadUserDonations(userId) {
    try {
        const donationsData = await utils.fetchAPI(`user/donations.php?user_id=${userId}`);
        if (donationsData.success && donationsData.donations) {
            updateRecentTransactions(donationsData.donations);
        } else {
            // No donations or error
            updateRecentTransactions([]);
        }
    } catch (error) {
        console.error('Error loading user donations:', error);
        updateRecentTransactions([]);
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

    // Filter to only completed donations
    const completedDonations = donations.filter(d => d.status && d.status.toLowerCase() === 'completed');

    // Get token for receipt links
    let token = localStorage.getItem('micro_donation_token') || localStorage.getItem('token');
    if (token) {
        token = encodeURIComponent(token);
    }

    if (!completedDonations || completedDonations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4" style="background-color: rgba(30, 41, 59, 0.95);">
                    <i class="fas fa-donate fa-2x mb-2" style="color: #cbd5e1;"></i>
                    <p style="color: #f1f5f9;">You haven't made any completed donations yet.</p>
                    <a href="../pages/campaigns.html" class="btn btn-primary btn-sm">Browse Campaigns</a>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    completedDonations.forEach(d => {
        const date = new Date(d.created_at || d.donation_date).toLocaleDateString('en-CA'); // YYYY-MM-DD
        const amount = d.amount || 0;
        const campaignTitle = d.campaign_title || d.campaign || 'Unknown Campaign';
        const donorName = d.is_anonymous ? 'Anonymous' : (d.donor_name || 'You');

        // Build receipt link with token - use absolute path from root
        let receiptLink = '<span style="color: #cbd5e1;">N/A</span>';
        if (d.id && token) {
            receiptLink = `<a href="../backend/api/payment/download-receipt.php?donation_id=${d.id}&token=${token}" class="text-primary" target="_blank" style="color: #6366f1;">View</a>`;
        } else if (d.id) {
            receiptLink = `<a href="../backend/api/payment/download-receipt.php?donation_id=${d.id}" class="text-primary" target="_blank" style="color: #6366f1;">View</a>`;
        }

        html += `
            <tr style="background-color: rgba(30, 41, 59, 0.95);">
                <td style="color: #f1f5f9;">${date}</td>
                <td style="color: #f1f5f9;">${donorName}</td>
                <td style="color: #f1f5f9;">${campaignTitle}</td>
                <td style="color: #34d399; font-weight: bold;">RM ${amount.toFixed(2)}</td>
                <td><span class="badge bg-success">Completed</span></td>
                <td>${receiptLink}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function showLoginPrompt() {
    const tbody = document.getElementById('recentTransactionsBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4" style="background-color: rgba(30, 41, 59, 0.95);">
                <i class="fas fa-sign-in-alt fa-2x mb-2" style="color: #cbd5e1;"></i>
                <p style="color: #f1f5f9;">Please login to see your donation history.</p>
                <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
            </td>
        </tr>
    `;
}

function setLoadingState(loading) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = loading ? 'block' : 'none';
}

function showFallbackData() {
    // Fallback dummy data if API fails
    document.getElementById('totalDonations').textContent = 'RM 124,580';
    document.getElementById('directToCause').textContent = '94.7%';
    document.getElementById('totalDonors').textContent = '2,347';
    document.getElementById('campaignsFunded').textContent = '56';

    const tbody = document.getElementById('recentTransactionsBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4" style="background-color: rgba(30, 41, 59, 0.95);">
                <i class="fas fa-exclamation-triangle" style="color: #fbbf24;"></i>
                <p style="color: #f1f5f9;">Unable to load your donations.</p>
            </td>
        </tr>
    `;
}