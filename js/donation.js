// Enhanced Donation Page Logic
class DonationPage {
    constructor() {
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
        
        this.donationData = {
            campaignId: 1,
            amount: 5,
            fees: 0,
            total: 0,
            paymentMethod: 'qr',
            donorName: '',
            donorEmail: '',
            anonymous: false,
            coverFees: false,
            selectedTier: 'helper',
            donationId: null,
            transactionId: null
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
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get('campaign') || 1;
        this.donationData.campaignId = parseInt(campaignId);
        
        // Load campaign info
        await this.loadCampaignInfo(campaignId);
        this.setupEventListeners();
        this.showStep(1);
        this.updateAmount(5);
        await this.generateQRCode();
        this.initLiveDonationsFeed();
    }
    
    async loadCampaignInfo(id) {
        try {
            // Try to fetch from API first
            const response = await fetch(utils.getApiUrl('campaigns/get-single.php?id=${id}'));
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.displayCampaignInfo(result.data || result);
                    return;
                }
            }
        } catch (error) {
            console.log('Using fallback campaign data:', error.message);
        }
        
        // Fallback to static data
        const campaigns = {
            1: {
                id: 1,
                title: "Emergency Relief Fund",
                description: "Support families affected by recent floods",
                target_amount: 50000,
                current_amount: 32500,
                image_url: this.basePath + "assets/images/campaign1.jpg",
                days_left: 7,
                donor_count: 127
            },
            2: {
                id: 2,
                title: "Student Scholarship Program",
                description: "Help underprivileged students continue their education",
                target_amount: 30000,
                current_amount: 18500,
                image_url: this.basePath + "assets/images/campaign2.jpg",
                days_left: 14,
                donor_count: 89
            },
            3: {
                id: 3,
                title: "Community Health Center",
                description: "Renovate and equip local health center",
                target_amount: 75000,
                current_amount: 42000,
                image_url: this.basePath + "assets/images/campaign3.jpg",
                days_left: 21,
                donor_count: 156
            },
            4: {
                id: 4,
                title: "Animal Shelter Support",
                description: "Help build a new shelter and provide care for stray animals",
                target_amount: 20000,
                current_amount: 12500,
                image_url: this.basePath + "assets/images/campaign4.jpg",
                days_left: 5,
                donor_count: 203
            }
        };
        
        this.displayCampaignInfo(campaigns[id] || campaigns[1]);
    }
    
    displayCampaignInfo(campaign) {
        const card = document.getElementById('campaignInfoCard');
        if (!card) return;
        
        const progressPercent = ((campaign.current_amount / campaign.target_amount) * 100).toFixed(1);
        
        card.innerHTML = `
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <img src="${campaign.image_url}" 
                             class="img-fluid rounded" 
                             alt="${campaign.title}"
                             onerror="this.onerror=null; this.src='${this.basePath}assets/images/default-campaign.jpg'">
                    </div>
                    <div class="col-md-9">
                        <h3 class="card-title mb-2">${campaign.title}</h3>
                        <p class="text-muted mb-3">${campaign.description}</p>
                        
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
                                    <small>RM ${campaign.current_amount.toLocaleString()}</small>
                                    <small>Goal: RM ${campaign.target_amount.toLocaleString()}</small>
                                </div>
                            </div>
                            <div class="impact-stats d-flex justify-content-around mt-3">
                                <div class="stat text-center">
                                    <span class="stat-value d-block fw-bold">${campaign.donor_count || 0}</span>
                                    <span class="stat-label text-muted small">Donors</span>
                                </div>
                                <div class="stat text-center">
                                    <span class="stat-value d-block fw-bold">${campaign.days_left || 30}</span>
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
        
        // Payment method selection
        document.querySelectorAll('.payment-method-card').forEach(card => {
            card.addEventListener('click', () => {
                if (card.dataset.method === 'card') return; // Disabled
                
                document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                this.donationData.paymentMethod = card.dataset.method;
                const qrCodeArea = document.getElementById('qrCodeArea');
                const bankSelection = document.getElementById('bankSelection');
                
                if (card.dataset.method === 'qr') {
                    if (qrCodeArea) qrCodeArea.style.display = 'block';
                    if (bankSelection) bankSelection.style.display = 'none';
                    this.generateQRCode();
                } else if (card.dataset.method === 'fpx') {
                    if (qrCodeArea) qrCodeArea.style.display = 'none';
                    if (bankSelection) bankSelection.style.display = 'block';
                }
            });
        });
        
        // Payment method radio buttons
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.donationData.paymentMethod = e.target.value;
                const qrCodeArea = document.getElementById('qrCodeArea');
                const bankSelection = document.getElementById('bankSelection');
                
                if (e.target.value === 'qr') {
                    if (qrCodeArea) qrCodeArea.style.display = 'block';
                    if (bankSelection) bankSelection.style.display = 'none';
                    this.generateQRCode();
                } else if (e.target.value === 'fpx') {
                    if (qrCodeArea) qrCodeArea.style.display = 'none';
                    if (bankSelection) bankSelection.style.display = 'block';
                }
            });
        });
        
        // Step navigation
        document.getElementById('nextStep1')?.addEventListener('click', () => this.nextStep(1));
        document.getElementById('backStep2')?.addEventListener('click', () => this.showStep(1));
        document.getElementById('nextStep2')?.addEventListener('click', () => this.nextStep(2));
        document.getElementById('backStep3')?.addEventListener('click', () => this.showStep(2));
        document.getElementById('confirmDonation')?.addEventListener('click', () => this.processDonation());
        
        // Bank selection
        const bankSelect = document.getElementById('bankSelect');
        if (bankSelect) {
            bankSelect.addEventListener('change', () => {
                this.donationData.selectedBank = bankSelect.value;
            });
        }
        
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
        
        // NEW: Handle receipt download button
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
                if (this.donationData.paymentMethod === 'fpx' && !this.donationData.selectedBank) {
                    this.showNotification('Please select your bank', 'warning');
                    return false;
                }
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
        
        // Special handling for QR code generation
        if (currentStep === 2 && this.donationData.paymentMethod === 'qr') {
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
            reference: 'DON-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase()
        };
        
        // In production, this would call a payment gateway API
        // For demo, use QR code generator API
        try {
            const encodedData = encodeURIComponent(JSON.stringify(qrData));
            qrCodeImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&format=png&bgcolor=ffffff&color=000000&qzone=2`;
            qrCodeImage.alt = `QR Code for donation of RM${this.donationData.total}`;
            
            this.donationData.transactionReference = qrData.reference;
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
            
            const confirmBtn = document.getElementById('confirmDonation');
            const originalText = confirmBtn.innerHTML;
            
            try {
                // Set processing flag
                this.isProcessingDonation = true;
                
                // Update donation data
                this.donationData.donorName = document.getElementById('donorName')?.value || '';
                this.donationData.donorEmail = document.getElementById('donorEmail')?.value;
                this.donationData.anonymous = document.getElementById('anonymousDonation')?.checked || false;
                this.donationData.termsAgreed = document.getElementById('termsAgreement')?.checked || false;
                
                // Show loading with better visual feedback
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
                confirmBtn.disabled = true;
                confirmBtn.classList.add('processing');
                
                // Add overlay to prevent any clicks
                this.addProcessingOverlay();
                
                // NEW: Process payment with simulated system
                console.log('Processing donation:', this.donationData);
                
                // Use the PaymentProcessor's simulated method
                const paymentResult = await this.paymentProcessor.processDonation(
                    {
                        amount: this.donationData.amount,
                        campaignId: this.donationData.campaignId,
                        donorEmail: this.donationData.donorEmail,
                        donorName: this.donationData.anonymous ? 'Anonymous' : this.donationData.donorName,
                        paymentMethod: this.donationData.paymentMethod,
                        coverFees: this.donationData.coverFees,
                        userId: auth?.getCurrentUser()?.id || 0 // Add user ID if available
                    }, 
                    true // Use simulation mode
                );
                
                if (!paymentResult.success) {
                    throw new Error(paymentResult.error || paymentResult.message || 'Payment failed');
                }
                
                // Store donation and transaction IDs for receipt generation
                this.donationData.donationId = paymentResult.donationId;
                this.donationData.transactionId = paymentResult.transactionId;
                
                // Show success step
                this.showStep(4);
                
                // Update success details
                const now = new Date();
                document.getElementById('transactionId').textContent = this.donationData.transactionId || 
                    paymentResult.transactionId || 
                    'DON-' + Date.now();
                document.getElementById('finalAmount').textContent = `RM ${this.donationData.total.toFixed(2)}`;
                document.getElementById('transactionDate').textContent = now.toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                document.getElementById('receiptEmail').textContent = this.donationData.donorEmail;
                
                // Update receipt download button
                const downloadReceiptBtn = document.getElementById('downloadReceipt');
                if (downloadReceiptBtn) {
                    downloadReceiptBtn.onclick = (e) => {
                        e.preventDefault();
                        if (this.donationData.donationId) {
                            this.generateReceipt(this.donationData.donationId);
                        }
                    };
                }
                
                // Send to analytics or backend
                this.trackDonationSuccess();
                
                // Add to live donations feed
                this.addToLiveFeed();
                
                // Reset processing flag after a delay to prevent immediate re-submission
                setTimeout(() => {
                    this.isProcessingDonation = false;
                }, 3000); // 3 second cooldown
                
            } catch (error) {
                console.error('Donation error:', error);
                this.showNotification(error.message || 'Payment failed. Please try again.', 'error');
                
                // Reset processing flag on error
                this.isProcessingDonation = false;
            } finally {
                confirmBtn.innerHTML = originalText;
                confirmBtn.disabled = false;
                confirmBtn.classList.remove('processing');
                
                // Remove overlay
                this.removeProcessingOverlay();
            }
        }

        // Add these helper methods to your class
        addProcessingOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'donationProcessingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.7);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            overlay.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                        <span class="visually-hidden">Processing donation...</span>
                    </div>
                    <div class="mt-3 fw-bold">Processing your donation...</div>
                    <div class="mt-1 text-muted small">Please don't close this window</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        removeProcessingOverlay() {
            const overlay = document.getElementById('donationProcessingOverlay');
            if (overlay) {
                overlay.remove();
            }
        }
    
    // NEW: Generate receipt using simulated system
    async generateReceipt(donationId) {
        if (!donationId) {
            this.showNotification('No donation ID found. Please contact support.', 'warning');
            return;
        }
        
        try {
            // Use PaymentProcessor to generate receipt
            const receiptResult = await this.paymentProcessor.generateSimulatedReceipt(donationId);
            
            if (!receiptResult.success) {
                throw new Error(receiptResult.message || 'Failed to generate receipt');
            }
            
            // Receipt will open in new window automatically
            this.showNotification('Receipt generated successfully', 'success');
            
        } catch (error) {
            console.error('Receipt generation error:', error);
            this.showNotification('Could not generate receipt. Please try again later.', 'error');
            
            // Fallback: Open generic receipt page
            window.open(`${this.basePath}backend/api/payment/download-receipt.php?donation_id=${donationId}`, '_blank');
        }
    }
    
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