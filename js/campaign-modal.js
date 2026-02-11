// js/campaign-modal.js - Shared campaign details modal for all pages

const CampaignModal = {
    /**
     * Show campaign details in a modal
     * @param {number|string} campaignId - The campaign ID
     */
    async showCampaignDetails(campaignId) {
        console.log('Showing campaign details for ID:', campaignId);
        
        try {
            // Show loading notification
            if (typeof utils !== 'undefined' && utils.showNotification) {
                utils.showNotification('Loading campaign details...', 'info');
            }
            
            // Fetch campaign details
            let campaign = await this.fetchCampaignDetails(campaignId);
            
            if (!campaign) {
                throw new Error('Campaign not found');
            }
            
            // Create and show modal
            this.renderCampaignModal(campaign);
            
        } catch (error) {
            console.error('Error showing campaign details:', error);
            
            if (typeof utils !== 'undefined' && utils.showNotification) {
                utils.showNotification('Failed to load campaign details: ' + error.message, 'error');
            } else {
                alert('Failed to load campaign details: ' + error.message);
            }
        }
    },

    /**
     * Fetch campaign details from API
     * @param {number|string} campaignId
     * @returns {Promise<Object>} Campaign data
     */
    async fetchCampaignDetails(campaignId) {
        // Use utils.fetchAPI if available
        if (typeof utils !== 'undefined' && utils.fetchAPI) {
            try {
                const data = await utils.fetchAPI(`campaigns/get-single.php?id=${campaignId}`);
                if (data.success && data.campaign) {
                    return this.transformCampaignData(data.campaign);
                }
            } catch (e) {
                console.log('Utils fetch failed:', e);
            }
        }
        
        // Fallback: direct fetch with correct path
        try {
            const response = await fetch(`backend/api/campaigns/get-single.php?id=${campaignId}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.campaign) {
                    return this.transformCampaignData(result.campaign);
                }
            }
        } catch (e) {
            console.log('Direct fetch failed:', e);
        }
        
        throw new Error('Campaign not found');
    },

    /**
     * Transform campaign data to consistent format
     * @param {Object} campaign - Raw campaign data from API
     * @returns {Object} Formatted campaign data
     */
    transformCampaignData(campaign) {
        const target = parseFloat(campaign.target_amount || campaign.target || 0);
        const current = parseFloat(campaign.current_amount || campaign.raised || 0);
        const donors = parseInt(campaign.donors_count || campaign.donors || 0);
        
        // Calculate progress
        let progress = parseFloat(campaign.progress_percentage || campaign.progress || 0);
        if ((!progress || progress === 0) && target > 0) {
            progress = Math.min(100, (current / target) * 100);
        }
        progress = Math.round(progress * 10) / 10;
        
        // Calculate days left
        let daysLeft = parseInt(campaign.days_left || 0);
        if ((!daysLeft || daysLeft === 0) && campaign.end_date) {
            const endDate = new Date(campaign.end_date);
            const today = new Date();
            const diffTime = endDate - today;
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = daysLeft > 0 ? daysLeft : 0;
        }
        
        return {
            id: campaign.id,
            title: campaign.title || 'Untitled Campaign',
            description: campaign.description || 'No description available.',
            category: campaign.category || 'Uncategorized',
            target: target,
            raised: current,
            progress: progress,
            donors: donors,
            daysLeft: daysLeft,
            end_date: campaign.end_date,
            image: campaign.image_url || 'assets/images/default-campaign.jpg',
            organizer: campaign.organizer || 'Anonymous',
            dateCreated: campaign.created_at || campaign.dateCreated,
            featured: campaign.featured || false,
            status: campaign.status || 'active',
            created_by_name: campaign.created_by_name || 'Admin'
        };
    },

    /**
     * Render campaign details modal
     * @param {Object} campaign - Campaign data
     */
    renderCampaignModal(campaign) {
        // Remove existing modal if any
        const existingModal = document.getElementById('campaignDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
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
                day: 'numeric'
            });
        };
        
        // Status color
        const statusColor = {
            'active': 'success',
            'completed': 'info',
            'cancelled': 'danger',
            'pending': 'warning'
        }[campaign.status?.toLowerCase()] || 'secondary';
        
        // Category color
        const categoryColors = {
            'education': 'primary',
            'health': 'danger',
            'emergency': 'warning',
            'community': 'success',
            'environment': 'info',
            'sports': 'secondary',
            'technology': 'dark',
            'arts': 'purple'
        };
        const categoryColor = categoryColors[campaign.category?.toLowerCase()] || 'secondary';
        
        // Fix image path
        let imageUrl = campaign.image;
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('assets/')) {
            imageUrl = 'assets/' + imageUrl;
        }
        
        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="campaignDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
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
                                <img src="${imageUrl}" 
                                    alt="${campaign.title}" 
                                    class="img-fluid rounded" 
                                    style="max-height: 250px; width: 100%; object-fit: cover;"
                                    onerror="this.src='assets/images/default-campaign.jpg'">
                            </div>
                            
                            <!-- Title and Status -->
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h3 class="mb-2">${campaign.title}</h3>
                                    <div>
                                        <span class="badge bg-${statusColor} fs-6 me-2">${campaign.status}</span>
                                        <span class="badge bg-${categoryColor} fs-6">${campaign.category}</span>
                                        ${campaign.featured ? '<span class="badge bg-warning fs-6 ms-2"><i class="fas fa-star me-1"></i>Featured</span>' : ''}
                                    </div>
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
                                                <span class="fw-bold">Funding Progress</span>
                                                <span class="fw-bold text-${campaign.progress >= 100 ? 'success' : 'primary'}">
                                                    ${campaign.progress}%
                                                </span>
                                            </div>
                                            <div class="progress" style="height: 12px;">
                                                <div class="progress-bar ${campaign.progress >= 100 ? 'bg-success' : 'bg-primary'}" 
                                                    style="width: ${Math.min(campaign.progress, 100)}%"></div>
                                            </div>
                                            <div class="d-flex justify-content-between mt-2">
                                                <span class="text-success fw-bold">${formatCurrency(campaign.raised)}</span>
                                                <span class="text-muted">of ${formatCurrency(campaign.target)}</span>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="text-center border-start ps-3">
                                                <div class="mb-2">
                                                    <i class="fas fa-users fa-2x text-primary"></i>
                                                    <div class="h3 mb-0">${campaign.donors}</div>
                                                    <small class="text-muted">Total Donors</small>
                                                </div>
                                                ${campaign.daysLeft > 0 ? `
                                                <div>
                                                    <i class="fas fa-clock fa-2x text-warning"></i>
                                                    <div class="h4 mb-0">${campaign.daysLeft}</div>
                                                    <small class="text-muted">Days Left</small>
                                                </div>
                                                ` : ''}
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
                                            <table class="table table-sm mb-0">
                                                <tr>
                                                    <th style="width: 40%;">Category:</th>
                                                    <td><span class="badge bg-${categoryColor}">${campaign.category}</span></td>
                                                </tr>
                                                <tr>
                                                    <th>Organizer:</th>
                                                    <td>${campaign.organizer}</td>
                                                </tr>
                                                <tr>
                                                    <th>Created By:</th>
                                                    <td>${campaign.created_by_name}</td>
                                                </tr>
                                                <tr>
                                                    <th>Created Date:</th>
                                                    <td>${formatDate(campaign.dateCreated)}</td>
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
                                            <table class="table table-sm mb-0">
                                                <tr>
                                                    <th style="width: 40%;">Target Amount:</th>
                                                    <td class="fw-bold text-primary">${formatCurrency(campaign.target)}</td>
                                                </tr>
                                                <tr>
                                                    <th>Current Raised:</th>
                                                    <td class="fw-bold text-success">${formatCurrency(campaign.raised)}</td>
                                                </tr>
                                                <tr>
                                                    <th>End Date:</th>
                                                    <td>
                                                        ${campaign.end_date ? formatDate(campaign.end_date) : 'No deadline'}
                                                        ${campaign.daysLeft > 0 ? `
                                                            <span class="badge ${campaign.daysLeft < 7 ? 'bg-danger' : 'bg-secondary'} ms-2">
                                                                ${campaign.daysLeft} days left
                                                            </span>
                                                        ` : ''}
                                                    </td>
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
                                    <p class="mb-0" style="white-space: pre-line;">${campaign.description}</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <a href="donation-page.html?campaign=${campaign.id}" 
                               class="btn btn-primary">
                                <i class="fas fa-heart me-2"></i>Donate Now
                            </a>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Initialize and show modal
        const modalElement = document.getElementById('campaignDetailsModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Clean up after hidden
        modalElement.addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
};

// Make globally available
window.CampaignModal = CampaignModal;