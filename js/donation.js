// Enhanced Donation Page Logic
class DonationPage {
    constructor() {
        this.basePath = this.getBasePath();
        this.paymentProcessor = new PaymentProcessor();
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
            selectedTier: 'helper'
        };
        this.steps = {
            current: 1,
            total: 4
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
        this.donationData.campaignId = campaignId;
        
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
            const response = await fetch(`${this.basePath}backend/api/campaigns/get-single.php?id=${id}`);
            if (response.ok) {
                const campaign = await response.json();
                this.displayCampaignInfo(campaign);
                return;
            }
        } catch (error) {
            console.log('Using fallback campaign data');
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
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/400x200/4e73df/ffffff?text=Campaign'">
                    </div>
                    <div class="col-md-9">
                        <h3 class="card-title mb-2">${campaign.title}</h3>
                        <p class="text-muted mb-3">${campaign.description}</p>
                        
                        <!-- Donation Impact Visualizer -->
                        <div class="donation-impact-visual">
                            <div class="donation-goal-tracker">
                                <div class="progress" style="width: ${progressPercent}%;">
                                    <div class="progress-goal-marker" style="left: 100%;">Goal: RM ${campaign.target_amount.toLocaleString()}</div>
                                </div>
                            </div>
                            <div class="impact-stats">
                                <div class="stat">
                                    <span class="stat-value">${campaign.donor_count || 0}</span>
                                    <span class="stat-label">Donors</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value">RM ${campaign.current_amount.toLocaleString()}</span>
                                    <span class="stat-label">Raised</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value">${campaign.days_left || 30}</span>
                                    <span class="stat-label">Days left</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
        if (!this.validateStep(3)) return;
        
        const confirmBtn = document.getElementById('confirmDonation');
        const originalText = confirmBtn.innerHTML;
        
        try {
            // Update donation data
            this.donationData.donorName = document.getElementById('donorName')?.value || '';
            this.donationData.donorEmail = document.getElementById('donorEmail')?.value;
            this.donationData.anonymous = document.getElementById('anonymousDonation')?.checked || false;
            
            // Show loading
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            confirmBtn.disabled = true;
            
            // Process payment
            const paymentResult = await this.paymentProcessor.processDonation(this.donationData);
            
            if (!paymentResult.success) {
                throw new Error(paymentResult.error || 'Payment failed');
            }
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Show success step
            this.showStep(4);
            
            // Update success details
            const now = new Date();
            document.getElementById('transactionId').textContent = this.donationData.transactionReference || 
                'DON-' + Date.now();
            document.getElementById('finalAmount').textContent = `RM ${this.donationData.total.toFixed(2)}`;
            document.getElementById('transactionDate').textContent = now.toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            document.getElementById('receiptEmail').textContent = this.donationData.donorEmail;
            
            // Send to analytics or backend
            this.trackDonationSuccess();
            
        } catch (error) {
            console.error('Donation error:', error);
            this.showNotification(error.message || 'Payment failed. Please try again.', 'error');
        } finally {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
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
                timestamp: new Date().toISOString()
            }
        };
        
        // In production, send to analytics service
        console.log('Donation completed:', donationEvent);
        
        // Update local storage for donation history
        const donations = JSON.parse(localStorage.getItem('user_donations') || '[]');
        donations.unshift({
            ...this.donationData,
            date: new Date().toISOString(),
            status: 'completed'
        });
        localStorage.setItem('user_donations', JSON.stringify(donations.slice(0, 10))); // Keep last 10
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            animation: fadeIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <strong>${type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info'}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
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
});