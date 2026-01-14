// Donation page logic
class DonationPage {
    constructor() {
        this.basePath = this.getBasePath();
        this.donationData = {
            campaignId: 1,
            amount: 0,
            fees: 0,
            total: 0,
            paymentMethod: 'qr',
            donorName: '',
            donorEmail: '',
            anonymous: false,
            coverFees: false
        };
    }
    
    getBasePath() {
        // Determine if we're in the pages folder
        const path = window.location.pathname;
        return path.includes('pages') ? '../' : '';
    }
    
    init() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get('campaign') || 1;
        this.donationData.campaignId = campaignId;
        
        // Load campaign info
        this.loadCampaignInfo(campaignId);
        this.setupEventListeners();
        this.showStep(1);
        this.updateAmount(1);
        this.generateQRCode();
    }
    
    loadCampaignInfo(id) {
        // Shared campaign data - same as in campaigns.js
        const campaigns = {
            1: {
                title: "Emergency Relief Fund",
                description: "Support families affected by recent floods",
                target: 50000,
                raised: 32500,
                image: this.basePath + "assets/images/campaign1.jpg"
            },
            2: {
                title: "Student Scholarship Program",
                description: "Help underprivileged students continue their education",
                target: 30000,
                raised: 18500,
                image: this.basePath + "assets/images/campaign2.jpg"
            },
            3: {
                title: "Community Health Center",
                description: "Renovate and equip local health center",
                target: 75000,
                raised: 42000,
                image: this.basePath + "assets/images/campaign3.jpg"
            },
            4: {
                title: "Animal Shelter Support",
                description: "Help build a new shelter and provide care for stray animals",
                target: 20000,
                raised: 12500,
                image: this.basePath + "assets/images/campaign4.jpg"
            },
            5: {
                title: "Community Garden Project",
                description: "Create a sustainable community garden to provide fresh produce",
                target: 15000,
                raised: 8900,
                image: this.basePath + "assets/images/campaign5.jpg"
            },
            6: {
                title: "Digital Learning Lab",
                description: "Set up a computer lab for underprivileged children",
                target: 40000,
                raised: 21000,
                image: this.basePath + "assets/images/campaign6.jpg"
            }
        };
        
        const campaign = campaigns[id] || campaigns[1];
        const card = document.getElementById('campaignInfoCard');
        
        if (card) {
            card.innerHTML = `
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <img src="${campaign.image}" 
                                 class="img-fluid rounded" 
                                 alt="${campaign.title}"
                                 onerror="this.onerror=null; this.src='https://via.placeholder.com/400x200/cccccc/666666?text=Campaign+${id}'">
                        </div>
                        <div class="col-md-8">
                            <h4 class="card-title">${campaign.title}</h4>
                            <p class="card-text">${campaign.description}</p>
                            <div class="progress mb-2">
                                <div class="progress-bar bg-success" style="width: ${(campaign.raised / campaign.target * 100).toFixed(1)}%"></div>
                            </div>
                            <div class="row">
                                <div class="col-6">
                                    <strong>Raised: RM${campaign.raised.toLocaleString()}</strong>
                                </div>
                                <div class="col-6 text-end">
                                    <strong>Target: RM${campaign.target.toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    setupEventListeners() {
        // Amount buttons
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('customAmount').value = '';
                this.updateAmount(parseFloat(btn.dataset.amount));
            });
        });
        
        // Custom amount input
        const customAmountInput = document.getElementById('customAmount');
        if (customAmountInput) {
            customAmountInput.addEventListener('input', () => {
                document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
                this.updateAmount(parseFloat(customAmountInput.value) || 0);
            });
        }
        
        // Cover fees checkbox
        const coverFeesCheckbox = document.getElementById('coverFees');
        if (coverFeesCheckbox) {
            coverFeesCheckbox.addEventListener('change', () => {
                this.donationData.coverFees = coverFeesCheckbox.checked;
                this.updateSummary();
            });
        }
        
        // Payment method selection
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.donationData.paymentMethod = radio.value;
                const qrCodeArea = document.getElementById('qrCodeArea');
                const bankSelection = document.getElementById('bankSelection');
                
                if (radio.value === 'qr') {
                    if (qrCodeArea) qrCodeArea.style.display = 'block';
                    if (bankSelection) bankSelection.style.display = 'none';
                    this.generateQRCode();
                } else if (radio.value === 'fpx') {
                    if (qrCodeArea) qrCodeArea.style.display = 'none';
                    if (bankSelection) bankSelection.style.display = 'block';
                } else {
                    if (qrCodeArea) qrCodeArea.style.display = 'none';
                    if (bankSelection) bankSelection.style.display = 'none';
                }
            });
        });
        
        // Step navigation
        document.getElementById('nextStep1')?.addEventListener('click', () => this.nextStep(1));
        document.getElementById('backStep2')?.addEventListener('click', () => this.showStep(1));
        document.getElementById('nextStep2')?.addEventListener('click', () => this.nextStep(2));
        document.getElementById('backStep3')?.addEventListener('click', () => this.showStep(2));
        document.getElementById('confirmDonation')?.addEventListener('click', () => this.processDonation());
    }
    
    updateAmount(amount) {
        this.donationData.amount = amount;
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
        
        if (summaryAmount) summaryAmount.textContent = `RM ${this.donationData.amount.toFixed(2)}`;
        if (summaryFees) summaryFees.textContent = `RM ${this.donationData.fees.toFixed(2)}`;
        if (summaryTotal) summaryTotal.textContent = `RM ${this.donationData.total.toFixed(2)}`;
    }
    
    showStep(stepNumber) {
        // Hide all steps
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) step.style.display = 'none';
        }
        
        // Show selected step
        const currentStep = document.getElementById(`step${stepNumber}`);
        if (currentStep) currentStep.style.display = 'block';
        
        // Update progress circles
        document.querySelectorAll('.step-circle').forEach((circle, index) => {
            if (index < stepNumber) {
                circle.classList.add('active');
                circle.textContent = '✓';
            } else {
                circle.classList.remove('active');
                circle.textContent = index + 1;
            }
        });
    }
    
    nextStep(currentStep) {
        if (currentStep === 1 && this.donationData.amount < 1) {
            alert('Please select or enter a donation amount (minimum RM1)');
            return;
        }
        
        if (currentStep === 2 && this.donationData.paymentMethod === 'fpx') {
            const bankSelect = document.getElementById('bankSelect');
            if (bankSelect && !bankSelect.value) {
                alert('Please select your bank');
                return;
            }
        }
        
        this.showStep(currentStep + 1);
    }
    
    generateQRCode() {
        const qrCodeImage = document.getElementById('qrCodeImage');
        if (qrCodeImage) {
            qrCodeImage.src = this.basePath + "assets/qr-codes/sample-qr.png";
        }
    }
    
    async processDonation() {
        const termsAgreement = document.getElementById('termsAgreement');
        const donorEmail = document.getElementById('donorEmail');
        const confirmBtn = document.getElementById('confirmDonation');
        
        if (!termsAgreement?.checked) {
            alert('Please agree to the Terms & Conditions');
            return;
        }
        
        if (!donorEmail?.value) {
            alert('Please enter your email address');
            return;
        }
        
        this.donationData.donorName = document.getElementById('donorName')?.value || '';
        this.donationData.donorEmail = donorEmail.value;
        this.donationData.anonymous = document.getElementById('anonymousDonation')?.checked || false;
        
        try {
            // Show loading
            if (confirmBtn) {
                const originalText = confirmBtn.innerHTML;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                confirmBtn.disabled = true;
                
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Show success step
                this.showStep(4);
                
                // Update success details
                const now = new Date();
                document.getElementById('transactionId').textContent = 'DON-' + Date.now();
                document.getElementById('finalAmount').textContent = `RM ${this.donationData.total.toFixed(2)}`;
                document.getElementById('transactionDate').textContent = now.toLocaleDateString('en-MY');
                document.getElementById('receiptEmail').textContent = this.donationData.donorEmail;
                
                confirmBtn.innerHTML = originalText;
                confirmBtn.disabled = false;
            }
        } catch (error) {
            alert('Payment failed. Please try again.');
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-heart"></i> Complete Donation';
                confirmBtn.disabled = false;
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const donationPage = new DonationPage();
    donationPage.init();
    
    // Make available globally for debugging
    window.donationPage = donationPage;
});