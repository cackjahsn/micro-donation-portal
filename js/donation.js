// Enhanced Donation Page Logic
class DonationPage {
    constructor() {

        // Prevent duplicate instances
        if (window._donationPageInstance) {
            return window._donationPageInstance;
        }
        window._donationPageInstance = this;
        
        this.basePath = this.getBasePath();
        this.isProcessing = false;
        
        // Initialize PaymentProcessor with error handling
        try {
            this.paymentProcessor = new PaymentProcessor();
        } catch (error) {
            console.error('Failed to initialize PaymentProcessor:', error);
            // Create a fallback payment processor
            this.paymentProcessor = this.createFallbackPaymentProcessor();
        }
        
        // In constructor, update donationData defaults:
        this.donationData = {
            campaignId: 1,
            amount: 5,
            fees: 0,
            total: 0,
            paymentMethod: 'qr', // Default to QR only
            donorName: '',
            donorEmail: '',
            anonymous: false,
            coverFees: false,
            selectedTier: 'helper',
            donationId: null,
            transactionId: null,
            // REMOVED: selectedBank
            termsAgreed: false
        };
                this.steps = {
            current: 1,
            total: 4
        
        };
    }
    
    // Fallback payment processor if main one fails
    createFallbackPaymentProcessor() {
        return {
            processDonation: async (donationData, useSimulation = true) => {
                // Simple fallback simulation
                await new Promise(resolve => setTimeout(resolve, 2000));
                return {
                    success: true,
                    type: 'fallback',
                    transactionId: 'FALLBACK-' + Date.now(),
                    donationId: Date.now(),
                    amount: donationData.amount,
                    message: 'Donation processed (fallback mode)'
                };
            },
            generateSimulatedReceipt: async (donationId) => {
                return {
                    success: true,
                    receiptUrl: '#',
                    message: 'Receipt generation not available in fallback mode'
                };
            },
            calculateFees: (amount, method = 'qr') => {
                return {
                    percentageFee: 0,
                    fixedFee: 0,
                    totalFee: 0,
                    finalAmount: amount
                };
            },
            formatCurrency: (amount) => {
                return 'RM ' + amount.toFixed(2);
            }
        };
    }
    
    getBasePath() {
        const path = window.location.pathname;
        return path.includes('pages') ? '../' : '';
    }
    
    async init() {
        console.log('Auth token:', localStorage.getItem('auth_token'));
        console.log('User data:', localStorage.getItem('user'));
        console.log('All localStorage:', { ...localStorage });
        // Prevent duplicate initialization
        if (this.initialized) {
            console.log('DonationPage already initialized, skipping...');
            return;
        }
        
        this.initialized = true;
        
        // Get URL parameters correctly
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get('id') || urlParams.get('campaign') || 1;
        
        console.log('URL parameters:', {
            id: urlParams.get('id'),
            campaign: urlParams.get('campaign'),
            allParams: Object.fromEntries(urlParams.entries())
        });
        
        // Convert to number
        this.donationData.campaignId = parseInt(campaignId);
        
        // Load campaign info FIRST (with proper error handling)
        try {
            await this.loadCampaignInfo(this.donationData.campaignId);
            
            // Debug: Log what campaign was loaded
            console.log('Campaign loaded:', {
                id: this.donationData.campaignId,
                info: this.campaignInfo,
                title: this.campaignInfo?.title || 'No title'
            });
        } catch (error) {
            console.error('Failed to load campaign info:', error);
            this.showCampaignError(this.donationData.campaignId);
            return; // Stop initialization if campaign can't be loaded
        }
        
        this.setupEventListeners();
        this.showStep(1);
        this.updateAmount(5);
        
        // Wait a bit before generating QR code
        setTimeout(() => {
            this.generateQRCode();
        }, 500);
        
        this.initLiveDonationsFeed();
    }
    
    async loadCampaignInfo(id) {
        try {
            console.log('Loading campaign info for ID:', id);
            
            // First, check if we have utils available
            if (typeof utils !== 'undefined' && utils.fetchAPI) {
                // Use utils.fetchAPI with proper endpoint
                const data = await utils.fetchAPI(`campaigns/get-single.php?id=${id}`);
                
                console.log('API response for campaign:', data);
                
                if (data.success && data.campaign) {
                    // Your API returns data.campaign with formatted properties
                    const campaign = data.campaign;
                    console.log('Real campaign loaded:', campaign.title);
                    
                    // Display the campaign info
                    this.displayCampaignInfo(campaign);
                    
                    // Store the real campaign data
                    this.campaignInfo = campaign;
                    
                    // Update donation data with real campaign ID
                    this.donationData.campaignId = campaign.id;
                    return;
                } else {
                    console.warn('API returned but no campaign data:', data);
                    throw new Error(data.message || 'No campaign data received');
                }
            } else {
                // Fallback to direct fetch if utils not available
                const response = await fetch(`backend/api/campaigns/get-single.php?id=${id}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.campaign) {
                        const campaign = result.campaign;
                        console.log('Real campaign loaded via direct fetch:', campaign.title);
                        this.displayCampaignInfo(campaign);
                        this.campaignInfo = campaign;
                        this.donationData.campaignId = campaign.id;
                        return;
                    }
                }
            }
        } catch (error) {
            console.warn('API fetch failed:', error.message);
            
            // Try one more time with absolute URL
            try {
                const response = await fetch(`/micro-donation-portal/backend/api/campaigns/get-single.php?id=${id}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.campaign) {
                        const campaign = result.campaign;
                        console.log('Real campaign loaded via absolute URL:', campaign.title);
                        this.displayCampaignInfo(campaign);
                        this.campaignInfo = campaign;
                        this.donationData.campaignId = campaign.id;
                        return;
                    }
                }
            } catch (secondError) {
                console.warn('Second fetch attempt failed:', secondError.message);
            }
        }
        
        // LAST RESORT: Check localStorage for campaigns
        try {
            const savedCampaigns = localStorage.getItem('micro_donation_campaigns');
            if (savedCampaigns) {
                const campaigns = JSON.parse(savedCampaigns);
                const campaign = campaigns.find(c => c.id === parseInt(id));
                if (campaign) {
                    console.log('Campaign loaded from localStorage:', campaign.title);
                    this.displayCampaignInfo(campaign);
                    this.campaignInfo = campaign;
                    this.donationData.campaignId = campaign.id;
                    return;
                }
            }
        } catch (error) {
            console.warn('LocalStorage check failed:', error);
        }
        
        // ULTIMATE FALLBACK: Show error message
        console.error('Could not load campaign. ID:', id);
        this.showCampaignError(id);
    }
    
    // Add processing overlay during donation
    addProcessingOverlay() {
        console.log('Adding processing overlay...');
        
        // Remove existing overlay if any
        this.removeProcessingOverlay();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'donationProcessingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.85);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(3px);
        `;
        
        overlay.innerHTML = `
            <div class="text-center" style="max-width: 400px;">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Processing donation...</span>
                </div>
                <h5 class="mb-2">Processing Your Donation</h5>
                <p class="text-muted mb-3">Please wait while we process your payment...</p>
                <div class="progress" style="height: 6px; width: 200px; margin: 0 auto;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                        role="progressbar" 
                        style="width: 100%">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        console.log('Processing overlay added');
    }

    // Remove processing overlay
    removeProcessingOverlay() {
        console.log('Removing processing overlay...');
        
        const overlay = document.getElementById('donationProcessingOverlay');
        if (overlay) {
            // Add fade-out animation
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                document.body.style.overflow = ''; // Restore scrolling
            }, 300);
        }
        
        console.log('Processing overlay removed');
    }

    // Add this method to your DonationPage class
    showCampaignError(id) {
        const card = document.getElementById('campaignInfoCard');
        if (!card) return;
        
        card.innerHTML = `
            <div class="card-body text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4>Campaign Not Found</h4>
                <p class="text-muted mb-3">Campaign ID: ${id}</p>
                <p class="text-muted mb-4">The campaign you're trying to donate to could not be loaded. It may have been removed or is currently unavailable.</p>
                <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                    <a href="pages/campaigns.html" class="btn btn-primary">
                        <i class="fas fa-arrow-left me-2"></i>Browse Campaigns
                    </a>
                    <button onclick="window.location.reload()" class="btn btn-outline-primary">
                        <i class="fas fa-redo me-2"></i>Try Again
                    </button>
                    <a href="index.html" class="btn btn-outline-secondary">
                        <i class="fas fa-home me-2"></i>Go to Homepage
                    </a>
                </div>
            </div>
        `;
    }
    displayCampaignInfo(campaign) {
        const card = document.getElementById('campaignInfoCard');
        if (!card) {
            console.error('Campaign card container not found');
            return;
        }
        
        // Use properties from your API response
        const progressPercent = campaign.progress || 
            ((campaign.raised / campaign.target) * 100).toFixed(1);
        
        const raisedAmount = campaign.raised || campaign.current_amount || 0;
        const targetAmount = campaign.target || campaign.target_amount || 0;
        const donorsCount = campaign.donors || campaign.donors_count || 0;
        const daysLeft = campaign.daysLeft || campaign.days_left || 30;
        const imageUrl = campaign.image || campaign.image_url || 
            'assets/images/default-campaign.jpg';
        
        card.innerHTML = `
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <img src="${imageUrl}" 
                            class="img-fluid rounded" 
                            alt="${campaign.title}"
                            onerror="this.onerror=null; this.src='${this.basePath}assets/images/default-campaign.jpg'">
                    </div>
                    <div class="col-md-9">
                        <h3 class="card-title mb-2">${campaign.title}</h3>
                        <p class="text-muted mb-3">${campaign.description || 'No description available'}</p>
                        
                        <!-- Donation Impact Visualizer -->
                        <div class="donation-impact-visual">
                            <div class="donation-goal-tracker">
                                <div class="progress" style="height: 20px; border-radius: 10px;">
                                    <div class="progress-bar" role="progressbar" 
                                        style="width: ${progressPercent}%; background: linear-gradient(90deg, #4e73df, #6f42c1);"
                                        aria-valuenow="${progressPercent}" 
                                        aria-valuemin="0" 
                                        aria-valuemax="100">
                                        ${progressPercent}%
                                    </div>
                                </div>
                                <div class="d-flex justify-content-between mt-2">
                                    <small>RM ${raisedAmount.toLocaleString()}</small>
                                    <small>Goal: RM ${targetAmount.toLocaleString()}</small>
                                </div>
                            </div>
                            <div class="impact-stats d-flex justify-content-around mt-3">
                                <div class="stat text-center">
                                    <span class="stat-value d-block fw-bold">${donorsCount}</span>
                                    <span class="stat-label text-muted small">Donors</span>
                                </div>
                                <div class="stat text-center">
                                    <span class="stat-value d-block fw-bold">${daysLeft}</span>
                                    <span class="stat-label text-muted small">Days left</span>
                                </div>
                                <div class="stat text-center">
                                    <span class="stat-value d-block fw-bold">${progressPercent}%</span>
                                    <span class="stat-label text-muted small">Funded</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Store campaign data for receipt generation
        this.campaignInfo = campaign;
    }
        
    setupEventListeners() {
        // Amount buttons
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('customAmount').value = '';
                this.updateAmount(parseFloat(btn.dataset.amount));
                this.resetTierSelection();
            });
        });
        
        // Custom amount input
        const customAmountInput = document.getElementById('customAmount');
        if (customAmountInput) {
            customAmountInput.addEventListener('input', () => {
                document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
                this.updateAmount(parseFloat(customAmountInput.value) || 0);
                this.resetTierSelection();
            });
        }
        
        // Tier selection
        document.querySelectorAll('.tier-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const amount = parseFloat(card.dataset.amount);
                const tier = card.dataset.tier;
                
                document.getElementById('customAmount').value = amount;
                document.querySelectorAll('.amount-btn').forEach(b => {
                    b.classList.remove('active');
                    if (parseFloat(b.dataset.amount) === amount) {
                        b.classList.add('active');
                    }
                });
                
                this.donationData.selectedTier = tier;
                this.updateAmount(amount);
            });
        });
        
        // Cover fees checkbox
        const coverFeesCheckbox = document.getElementById('coverFees');
        if (coverFeesCheckbox) {
            coverFeesCheckbox.addEventListener('change', () => {
                this.donationData.coverFees = coverFeesCheckbox.checked;
                this.updateSummary();
            });
        }
        
        // Payment method selection (QR Only)
        document.querySelectorAll('.payment-method-card:not(.disabled)').forEach(card => {
            card.addEventListener('click', () => {
                if (card.dataset.method !== 'qr') return; // Only allow QR
                
                document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                this.donationData.paymentMethod = 'qr'; // Always set to QR
                
                const qrCodeArea = document.getElementById('qrCodeArea');
                if (qrCodeArea) qrCodeArea.style.display = 'block';
                
                this.generateQRCode();
            });
        });
        
        // Payment method radio buttons (Only QR is available)
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                // Only QR is supported
                if (e.target.value !== 'qr') {
                    e.target.checked = false;
                    // Re-check the QR option
                    const qrRadio = document.querySelector('input[name="paymentMethod"][value="qr"]');
                    if (qrRadio) qrRadio.checked = true;
                    this.showNotification('Only QR code payments are available', 'info');
                    return;
                }
                
                this.donationData.paymentMethod = 'qr';
                const qrCodeArea = document.getElementById('qrCodeArea');
                if (qrCodeArea) qrCodeArea.style.display = 'block';
                
                this.generateQRCode();
            });
        });
        
        // Step navigation
        document.getElementById('nextStep1')?.addEventListener('click', () => this.nextStep(1));
        document.getElementById('backStep2')?.addEventListener('click', () => this.showStep(1));
        document.getElementById('nextStep2')?.addEventListener('click', () => this.nextStep(2));
        document.getElementById('backStep3')?.addEventListener('click', () => this.showStep(2));
        document.getElementById('confirmDonation')?.addEventListener('click', () => this.processDonation());
        
        // REMOVED: Bank selection listener
        
        // Terms agreement
        const termsCheckbox = document.getElementById('termsAgreement');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', () => {
                this.donationData.termsAgreed = termsCheckbox.checked;
            });
        }
        
        // Anonymous donation
        const anonymousCheckbox = document.getElementById('anonymousDonation');
        if (anonymousCheckbox) {
            anonymousCheckbox.addEventListener('change', () => {
                this.donationData.anonymous = anonymousCheckbox.checked;
            });
        }
        
        // Handle receipt download button
        document.getElementById('downloadReceipt')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.donationData.donationId) {
                this.generateReceipt(this.donationData.donationId);
            }
        });
    }

    resetTierSelection() {
        document.querySelectorAll('.tier-card').forEach(card => {
            card.classList.remove('active');
        });
        this.donationData.selectedTier = '';
    }

    updateAmount(amount) {
        this.donationData.amount = amount || 0;
        this.updateSummary();
    }

    updateSummary() {
        // Calculate fees (1.9% + RM0.20)
        const percentageFee = this.donationData.amount * 0.019;
        const fixedFee = 0.20;
        this.donationData.fees = this.donationData.coverFees ? (percentageFee + fixedFee) : 0;
        this.donationData.total = this.donationData.amount + this.donationData.fees;
        
        // Update summary display
        const summaryAmount = document.getElementById('summaryAmount');
        const summaryFees = document.getElementById('summaryFees');
        const summaryTotal = document.getElementById('summaryTotal');
        const summaryTier = document.getElementById('summaryTier');
        
        if (summaryAmount) summaryAmount.textContent = `RM ${this.donationData.amount.toFixed(2)}`;
        if (summaryFees) summaryFees.textContent = this.donationData.fees > 0 ? 
            `RM ${this.donationData.fees.toFixed(2)}` : 'Free';
        if (summaryTotal) summaryTotal.textContent = `RM ${this.donationData.total.toFixed(2)}`;
        if (summaryTier && this.donationData.selectedTier) {
            summaryTier.textContent = this.donationData.selectedTier.charAt(0).toUpperCase() + 
                                    this.donationData.selectedTier.slice(1) + ' Tier';
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        for (let i = 1; i <= this.steps.total; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) step.style.display = 'none';
        }
        
        // Show selected step
        const currentStep = document.getElementById(`step${stepNumber}`);
        if (currentStep) currentStep.style.display = 'block';
        
        // Update progress indicators
        document.querySelectorAll('.step').forEach((stepEl, index) => {
            const stepNum = index + 1;
            stepEl.classList.remove('active', 'completed');
            
            if (stepNum < stepNumber) {
                stepEl.classList.add('completed');
            } else if (stepNum === stepNumber) {
                stepEl.classList.add('active');
            }
        });
        
        // Update current step
        this.steps.current = stepNumber;
        
        // Scroll to top of step
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    validateStep(currentStep) {
        switch(currentStep) {
            case 1:
                if (this.donationData.amount < 1) {
                    this.showNotification('Please select or enter a donation amount (minimum RM1)', 'warning');
                    return false;
                }
                break;
                
            case 2:
                // REMOVED: FPX bank validation
                // Only QR is available, always valid
                break;
                
            case 3:
                const donorEmail = document.getElementById('donorEmail');
                if (!donorEmail?.value) {
                    this.showNotification('Please enter your email address', 'warning');
                    donorEmail?.focus();
                    return false;
                }
                
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(donorEmail.value)) {
                    this.showNotification('Please enter a valid email address', 'warning');
                    donorEmail.focus();
                    return false;
                }
                
                if (!document.getElementById('termsAgreement')?.checked) {
                    this.showNotification('Please agree to the Terms & Conditions', 'warning');
                    return false;
                }
                break;
        }
        return true;
    }

    nextStep(currentStep) {
        if (!this.validateStep(currentStep)) {
            return;
        }
        
        // Always generate QR code for step 2
        if (currentStep === 2) {
            this.donationData.paymentMethod = 'qr'; // Force QR method
            this.generateQRCode();
        }
        
        this.showStep(currentStep + 1);
    }

    async generateQRCode() {
        const qrCodeImage = document.getElementById('qrCodeImage');
        if (!qrCodeImage) return;
        
        // Generate dynamic QR code data
        const qrData = {
            amount: this.donationData.total,
            campaignId: this.donationData.campaignId,
            timestamp: new Date().toISOString(),
            reference: 'DON-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            paymentMethod: 'qr' // Always QR
        };
        
        // In production, this would call a payment gateway API
        // For demo, use QR code generator API
        try {
            const encodedData = encodeURIComponent(JSON.stringify(qrData));
            qrCodeImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&format=png&bgcolor=ffffff&color=000000&qzone=2`;
            qrCodeImage.alt = `QR Code for donation of RM${this.donationData.total}`;
            
            this.donationData.transactionReference = qrData.reference;
            
            // Show QR code area if hidden
            const qrCodeArea = document.getElementById('qrCodeArea');
            if (qrCodeArea) {
                qrCodeArea.style.display = 'block';
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            // Fallback to static image
            qrCodeImage.src = this.basePath + "assets/qr-codes/sample-qr.png";
        }
    }
    
    initLiveDonationsFeed() {
        // Simulate live donation updates
        setInterval(() => {
            this.addRandomDonation();
        }, 10000); // Every 10 seconds
        
        // Initial donations
        this.addRandomDonation();
        setTimeout(() => this.addRandomDonation(), 2000);
        setTimeout(() => this.addRandomDonation(), 4000);
    }
    
    addRandomDonation() {
        const feed = document.querySelector('.donation-feed');
        if (!feed) return;
        
        const names = ['Anonymous', 'Sarah M.', 'John D.', 'Maria L.', 'Kevin T.', 'Amina R.', 'David L.', 'Lisa S.'];
        const amounts = [5, 10, 25, 50, 100];
        const times = ['just now', '1 min ago', '2 mins ago', '5 mins ago'];
        
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
        const randomTime = times[Math.floor(Math.random() * times.length)];
        const initial = randomName === 'Anonymous' ? 'A' : randomName.charAt(0);
        
        const donationItem = document.createElement('div');
        donationItem.className = 'donation-feed-item animate-fade-in';
        donationItem.innerHTML = `
            <div class="donor-avatar">${initial}</div>
            <div class="donor-info">
                <div class="donor-name">${randomName}</div>
                <div class="donation-amount">RM ${randomAmount}</div>
                <div class="donation-time">${randomTime}</div>
            </div>
        `;
        
        feed.insertBefore(donationItem, feed.firstChild);
        
        // Limit to 8 items
        if (feed.children.length > 8) {
            feed.removeChild(feed.lastChild);
        }
    }
    
async processDonation() {
    // Prevent multiple clicks
    if (this.isProcessingDonation) {
        console.log('Donation already processing, please wait...');
        return;
    }
    
    if (!this.validateStep(3)) return;
    
    // Check if we have real campaign data
    if (!this.campaignInfo || !this.campaignInfo.id) {
        this.showNotification('Campaign information is missing. Please refresh the page.', 'error');
        return;
    }
    
    const confirmBtn = document.getElementById('confirmDonation');
    const originalText = confirmBtn.innerHTML;
    
    try {
        // Set processing flag
        this.isProcessingDonation = true;
        
        // Update donation data with REAL campaign ID
        this.donationData.donorName = document.getElementById('donorName')?.value || '';
        this.donationData.donorEmail = document.getElementById('donorEmail')?.value;
        this.donationData.anonymous = document.getElementById('anonymousDonation')?.checked || false;
        this.donationData.termsAgreed = document.getElementById('termsAgreement')?.checked || false;
        
        // Use REAL campaign ID and force QR method
        this.donationData.campaignId = this.campaignInfo.id;
        this.donationData.campaignTitle = this.campaignInfo.title;
        this.donationData.paymentMethod = 'qr'; // Always QR
        
        console.log('Processing donation for:', {
            campaignId: this.donationData.campaignId,
            amount: this.donationData.amount,
            paymentMethod: this.donationData.paymentMethod,
            donorName: this.donationData.anonymous ? 'Anonymous' : this.donationData.donorName
        });
        
        // Show loading
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        confirmBtn.disabled = true;
        confirmBtn.classList.add('processing');
        
        // Add overlay
        this.addProcessingOverlay();
        
        // Get current user ID
        let userId = null;
        if (auth?.getCurrentUser) {
            const user = auth.getCurrentUser();
            userId = user?.id;
        }
        
        if (!userId) {
            // Try localStorage as fallback
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    userId = user?.id;
                }
            } catch (e) {
                console.error('Error getting user from localStorage:', e);
            }
        }
        
        console.log('Current user ID:', userId);
        
            // Process donation (DATABASE MODE - NO SIMULATION)
            const paymentResult = await this.paymentProcessor.processDonation(
                {
                    amount: this.donationData.amount,
                    campaignId: this.donationData.campaignId,
                    donorEmail: this.donationData.donorEmail,
                    donorName: this.donationData.anonymous ? 'Anonymous' : this.donationData.donorName,
                    paymentMethod: 'qr', // Always QR
                    coverFees: this.donationData.coverFees,
                    anonymous: this.donationData.anonymous,
                    userId: userId || 0
                }
                // REMOVED: No simulation mode parameter - always use database
            );
            
            if (!paymentResult.success) {
                throw new Error(paymentResult.error || paymentResult.message || 'Payment failed');
            }

            console.log('Payment result:', paymentResult);
            
            // Store donation and transaction IDs (REAL DATABASE IDs)
            this.donationData.donationId = paymentResult.donationId;
            this.donationData.transactionId = paymentResult.transactionId;
            
            // Show QR code if returned (for display purposes)
            if (paymentResult.qrCodeUrl) {
                const qrImg = document.getElementById('qrCodeImage');
                if (qrImg) {
                    qrImg.src = paymentResult.qrCodeUrl;
                    qrImg.alt = `QR Code for donation of RM${this.donationData.amount}`;
                }
            }

            // Show success step
            this.showStep(4);

            // SAFELY update success details - check if elements exist first
            const now = new Date();

            // Check and update transaction ID
            const transactionIdElement = document.getElementById('transactionId');
            if (transactionIdElement) {
                transactionIdElement.textContent = this.donationData.transactionId || 
                    paymentResult.transactionId || 
                    'DON-' + Date.now();
            }

            // Check and update final amount
            const finalAmountElement = document.getElementById('finalAmount');
            if (finalAmountElement) {
                finalAmountElement.textContent = `RM ${this.donationData.total.toFixed(2)}`;
            }

            // Check and update transaction date
            const transactionDateElement = document.getElementById('transactionDate');
            if (transactionDateElement) {
                transactionDateElement.textContent = now.toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            }

            // Check and update receipt email
            const receiptEmailElement = document.getElementById('receiptEmail');
            if (receiptEmailElement) {
                receiptEmailElement.textContent = this.donationData.donorEmail;
            }

            // Check and update campaign title in success step
            const campaignTitleElement = document.getElementById('campaignTitleSuccess');
            if (campaignTitleElement) {
                campaignTitleElement.textContent = this.donationData.campaignTitle || this.campaignInfo?.title || 'Campaign';
            }

            // Check and update donation ID display
            const donationIdElement = document.getElementById('donationIdSuccess');
            if (donationIdElement && this.donationData.donationId) {
                donationIdElement.textContent = `#${this.donationData.donationId}`;
            }

            // Update download receipt button
            const downloadReceiptBtn = document.getElementById('downloadReceipt');
            if (downloadReceiptBtn) {
                // Store reference to current donation data
                const currentDonationId = this.donationData.donationId;
                
                downloadReceiptBtn.onclick = async (e) => {
                    e.preventDefault(); // PREVENT DEFAULT ACTION
                    e.stopPropagation(); // STOP EVENT BUBBLING
                    
                    console.log('Downloading receipt for donation:', currentDonationId);
                    
                    if (currentDonationId) {
                        try {
                            // Show loading state
                            const originalHtml = downloadReceiptBtn.innerHTML;
                            downloadReceiptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';
                            downloadReceiptBtn.disabled = true;
                            
                            // Generate receipt (opens in new tab only)
                            await this.generateReceipt(currentDonationId);
                            
                        } catch (error) {
                            console.error('Receipt error:', error);
                            this.showNotification('Failed to open receipt: ' + error.message, 'error');
                        } finally {
                            // Reset button state after delay
                            setTimeout(() => {
                                downloadReceiptBtn.disabled = false;
                                downloadReceiptBtn.innerHTML = '<i class="fas fa-download"></i> Download Receipt';
                            }, 1000);
                        }
                    } else {
                        this.showNotification('No donation ID found', 'error');
                    }
                };
            }

            // Update campaign stats in database (if you have this feature)
            await this.updateCampaignStats();

            // Add to live donations feed
            this.addToLiveFeed();

            // Track donation success
            this.trackDonationSuccess();
            
            // Verify payment (optional - marks as verified in database)
            if (paymentResult.donationId) {
                setTimeout(async () => {
                    try {
                        const verifyResult = await this.paymentProcessor.verifyPayment(paymentResult.donationId);
                        console.log('Payment verification:', verifyResult);
                    } catch (verifyError) {
                        console.warn('Payment verification failed (non-critical):', verifyError);
                    }
                }, 1000);
            }

            // Reset processing flag
            this.isProcessingDonation = false;
            
            // Show success message
            this.showNotification('Donation completed successfully! Receipt is now available.', 'success');
            
        } catch (error) {
            console.error('Donation error:', error);
            this.showNotification(error.message || 'Payment failed. Please try again.', 'error');
            
            // Reset processing flag on error
            this.isProcessingDonation = false;
            
            // Reset button state
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('processing');
            
        } finally {
            // Remove overlay
            this.removeProcessingOverlay();
        }
    }

    // Add this helper method
    async updateCampaignStats() {
        try {
            console.log('Updating campaign stats for campaign:', {
                campaignId: this.donationData.campaignId,
                amount: this.donationData.amount,
                currentDonors: this.campaignInfo?.donors || 0,
                currentRaised: this.campaignInfo?.raised || 0
            });
            
            // In a real implementation, call your API here
            // await utils.fetchAPI('campaigns/update-stats.php', {...});
            
        } catch (error) {
            console.warn('Failed to update campaign stats (simulation mode):', error);
        }
    }
    
    async generateReceipt(donationId) {
        try {
            console.log(`Generating receipt for donation: ${donationId}`);
            
            // Get user ID from localStorage
            let userId = null;
            try {
                const userStr = localStorage.getItem('user') || localStorage.getItem('micro_donation_user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    userId = user.id;
                }
            } catch (e) {
                console.error('Error parsing user:', e);
            }
            
            // Build receipt URL with ALL parameters
            const params = new URLSearchParams({
                donation_id: donationId,
                autoprint: 'true'
            });
            
            if (userId) {
                params.append('user_id', userId);
            }
            
            const baseUrl = '/micro-donation-portal/backend/api';
            const receiptUrl = `${baseUrl}/payment/download-receipt.php?${params.toString()}`;
            
            console.log('Opening receipt in new tab:', receiptUrl);
            
            // Try to open in new tab
            const newWindow = window.open(receiptUrl, '_blank');
            
            // SILENT FALLBACK: Only console log, no user notifications
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                console.warn('Popup blocked. Manual URL:', receiptUrl);
                // SILENT: Just log to console, don't bother the user
            }
            
            return { success: true, url: receiptUrl };
            
        } catch (error) {
            console.error('Receipt generation error:', error);
            return { success: false, error: error.message };
        }
    }

        debugUserInfo() {
        console.log('=== USER DATA DEBUG ===');
        
        // Check localStorage
        console.log('LocalStorage contents:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log(`  ${key}:`, localStorage.getItem(key));
        }
        
        // Check auth system
        if (window.auth) {
            console.log('Auth system:', window.auth);
            if (window.auth.getCurrentUser) {
                console.log('Current user from auth:', window.auth.getCurrentUser());
            }
        }
        
        // Check for user ID in common locations
        const userId = 
            localStorage.getItem('user_id') ||
            (JSON.parse(localStorage.getItem('user') || '{}').id) ||
            (JSON.parse(localStorage.getItem('auth_data') || '{}').user?.id);
        
        console.log('Extracted user ID:', userId);
        console.log('=== END DEBUG ===');
        
        return userId;
    }

    // Call this from console: donationPage.debugUserInfo()
            
    // NEW: Add current donation to live feed
    addToLiveFeed() {
        const feed = document.querySelector('.donation-feed');
        if (!feed) return;
        
        const donorName = this.donationData.anonymous ? 'Anonymous' : 
                         (this.donationData.donorName || 'A Donor');
        const initial = donorName === 'Anonymous' ? 'A' : donorName.charAt(0);
        
        const donationItem = document.createElement('div');
        donationItem.className = 'donation-feed-item animate-fade-in';
        donationItem.innerHTML = `
            <div class="donor-avatar" style="background: linear-gradient(135deg, #4e73df, #6f42c1);">${initial}</div>
            <div class="donor-info">
                <div class="donor-name">${donorName}</div>
                <div class="donation-amount text-success">RM ${this.donationData.amount.toFixed(2)}</div>
                <div class="donation-time">just now</div>
            </div>
        `;
        
        feed.insertBefore(donationItem, feed.firstChild);
        
        // Limit to 8 items
        if (feed.children.length > 8) {
            feed.removeChild(feed.lastChild);
        }
    }
    
    trackDonationSuccess() {
        // Send analytics or log donation
        const donationEvent = {
            type: 'donation_completed',
            data: {
                amount: this.donationData.amount,
                campaignId: this.donationData.campaignId,
                paymentMethod: this.donationData.paymentMethod,
                timestamp: new Date().toISOString(),
                donationId: this.donationData.donationId,
                transactionId: this.donationData.transactionId
            }
        };
        
        // In production, send to analytics service
        console.log('Donation completed:', donationEvent);
        
        // Update local storage for donation history
        try {
            const donations = JSON.parse(localStorage.getItem('user_donations') || '[]');
            donations.unshift({
                ...this.donationData,
                date: new Date().toISOString(),
                status: 'completed'
            });
            localStorage.setItem('user_donations', JSON.stringify(donations.slice(0, 10))); // Keep last 10
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.donation-notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `donation-notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease-out;
        `;
        
        const icon = type === 'error' ? 'exclamation-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 
                    type === 'success' ? 'check-circle' : 'info-circle';
        
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${icon} me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add animation styles if not present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .donation-notification-exit {
                    animation: slideOutRight 0.3s ease-out forwards;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('donation-notification-exit');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const donationPage = new DonationPage();
    donationPage.init();
    
    // Make available globally for debugging
    window.donationPage = donationPage;
    
    // Add CSS for donation feed
    if (!document.querySelector('#donation-feed-styles')) {
        const style = document.createElement('style');
        style.id = 'donation-feed-styles';
        style.textContent = `
            .donation-feed-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border-radius: 8px;
                background: #f8f9fa;
                margin-bottom: 8px;
                animation: fadeIn 0.5s ease-out;
            }
            .donor-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #4e73df;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-right: 12px;
            }
            .donor-info {
                flex: 1;
            }
            .donor-name {
                font-weight: 600;
                color: #333;
            }
            .donation-amount {
                color: #28a745;
                font-weight: 600;
            }
            .donation-time {
                font-size: 12px;
                color: #6c757d;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes animate-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
});