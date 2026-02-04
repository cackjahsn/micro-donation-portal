// Enhanced Payment Processing Functions
class PaymentProcessor {
    constructor() {
        // Initialize config FIRST
        this.config = {
            sandboxMode: true,
            apiBaseUrl: null, // Will be set after config is initialized
            apiKey: null,
            merchantCode: 'YOUR_MERCHANT_CODE',
            callbackUrl: window.location.origin + '/payment-callback.html',
            simulatedApiBase: '/micro-donation-portal/backend/api/payment'
        };
        
        // Now set dependent properties
        this.config.apiBaseUrl = this.getApiBaseUrl();
        this.config.apiKey = this.getApiKey();
        
        // Payment methods
        this.paymentMethods = {
            qr: {
                name: 'QR Code Payment',
                supported: true,
                fee: 0.019, // 1.9%
                fixedFee: 0.20
            },
            fpx: {
                name: 'Online Banking (FPX)',
                supported: true,
                fee: 0.015, // 1.5%
                fixedFee: 0.15
            },
            card: {
                name: 'Credit/Debit Card',
                supported: false, // Coming soon
                fee: 0.025, // 2.5%
                fixedFee: 0.30
            }
        };
        
        // NEW: Duplicate prevention
        this.lastDonationTime = 0;
        this.minDonationInterval = 3000; // 3 seconds minimum between donations
        this.lastProcessedDonations = new Map(); // Store recent donations to prevent duplicates
    }
    
    getApiBaseUrl() {
        // Check if config is initialized
        if (!this.config || this.config.sandboxMode === undefined) {
            return 'https://sandbox.toyyibpay.com'; // Default to sandbox
        }
        return this.config.sandboxMode 
            ? 'https://sandbox.toyyibpay.com' 
            : 'https://toyyibpay.com';
    }
    
    getApiKey() {
        // Check if config is initialized
        if (!this.config || this.config.sandboxMode === undefined) {
            return 'SANDBOX_API_KEY'; // Default to sandbox
        }
        return this.config.sandboxMode 
            ? 'SANDBOX_API_KEY' 
            : 'PRODUCTION_API_KEY';
    }
    
    // NEW: Check for duplicate donations
    checkForDuplicateDonation(donationData) {
        const donationKey = `${donationData.userId || 'guest'}-${donationData.campaignId}-${donationData.amount}-${Date.now()}`;
        const donationHash = this.hashString(donationKey);
        
        // Check if this donation was recently processed (within 5 seconds)
        if (this.lastProcessedDonations.has(donationHash)) {
            const lastProcessTime = this.lastProcessedDonations.get(donationHash);
            const timeDiff = Date.now() - lastProcessTime;
            
            if (timeDiff < 5000) { // 5 second window
                console.warn('Duplicate donation detected:', donationKey);
                return true;
            }
        }
        
        // Store this donation
        this.lastProcessedDonations.set(donationHash, Date.now());
        
        // Clean old entries (older than 30 seconds)
        for (const [key, timestamp] of this.lastProcessedDonations.entries()) {
            if (Date.now() - timestamp > 30000) {
                this.lastProcessedDonations.delete(key);
            }
        }
        
        return false;
    }
    
    // NEW: Simple string hashing
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    // ==================== SIMULATED PAYMENT METHODS ====================
    
    // Simulated payment method - generates fake QR and records in database
    async processSimulatedPayment(donationData) {
        try {
            // NEW: Check for duplicate before processing
            if (this.checkForDuplicateDonation(donationData)) {
                throw new Error('Duplicate donation detected. Please wait a moment before trying again.');
            }
            
            const { amount, campaignId, donorEmail, donorName, paymentMethod = 'qr' } = donationData;
            
            // Step 1: Generate simulated QR code via PHP API
            const qrResponse = await this.generateSimulatedQRCode({
                amount: amount,
                campaign_id: campaignId,
                user_id: this.getCurrentUserId(),
                donor_name: donorName || 'Anonymous',
                donor_email: donorEmail,
                payment_method: paymentMethod
            });
            
            if (!qrResponse.success) {
                throw new Error(qrResponse.message || 'Failed to generate QR code');
            }
            
            // Return data for QR display
            return {
                success: true,
                type: 'simulated',
                qrCodeUrl: qrResponse.qr_code_image,
                qrCodeData: qrResponse.qr_data,
                transactionId: qrResponse.transaction_id,
                donationId: qrResponse.donation_id,
                reference: qrResponse.transaction_id,
                fees: this.calculateFees(amount, paymentMethod),
                message: 'Simulated QR code generated successfully'
            };
            
        } catch (error) {
            console.error('Simulated payment error:', error);
            return {
                success: false,
                error: error.message || 'Simulated payment failed'
            };
        }
    }
    
    // Generate simulated QR code via PHP API
    async generateSimulatedQRCode(paymentData) {
        try {
            const response = await fetch(`${this.config.simulatedApiBase}/generate-qr.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('QR generation API error:', error);
            throw error;
        }
    }
    
    // Verify simulated payment (simulates QR scan)
    async verifySimulatedPayment(donationId) {
        try {
            const response = await fetch(`${this.config.simulatedApiBase}/verify.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ donation_id: donationId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Payment verification error:', error);
            return {
                success: false,
                message: 'Payment verification failed: ' + error.message
            };
        }
    }
    
    // Generate receipt for simulated payment
    async generateSimulatedReceipt(donationId) {
        try {
            const response = await fetch(`${this.config.simulatedApiBase}/generate-receipt.php?donation_id=${donationId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Open receipt in new window
                window.open(`${this.config.simulatedApiBase}/download-receipt.php?donation_id=${donationId}`, '_blank');
                
                return {
                    success: true,
                    receiptUrl: `${this.config.simulatedApiBase}/download-receipt.php?donation_id=${donationId}`,
                    receiptData: data.donation
                };
            } else {
                throw new Error(data.message || 'Failed to generate receipt');
            }
            
        } catch (error) {
            console.error('Receipt generation error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Complete simulated donation flow with duplicate prevention
    async completeSimulatedDonation(donationData) {
        try {
            // NEW: Check time between donations
            const now = Date.now();
            if (now - this.lastDonationTime < this.minDonationInterval) {
                return {
                    success: false,
                    error: 'Please wait a moment before making another donation',
                    message: 'Too many donation attempts'
                };
            }
            
            this.lastDonationTime = now;
            
            // Step 1: Generate QR code
            const qrResult = await this.processSimulatedPayment(donationData);
            
            if (!qrResult.success) {
                return qrResult;
            }
            
            // Step 2: Simulate scanning delay (3 seconds)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Step 3: Verify payment
            const verifyResult = await this.verifySimulatedPayment(qrResult.donationId);
            
            if (!verifyResult.success) {
                return verifyResult;
            }
            
            // Step 4: Generate receipt
            const receiptResult = await this.generateSimulatedReceipt(qrResult.donationId);
            
            if (!receiptResult.success) {
                // Payment was successful but receipt generation failed
                console.warn('Receipt generation failed:', receiptResult.message);
            }
            
            // Return complete result
            return {
                success: true,
                type: 'simulated',
                transactionId: qrResult.transactionId,
                donationId: qrResult.donationId,
                amount: donationData.amount,
                campaignId: donationData.campaignId,
                receiptUrl: receiptResult.receiptUrl,
                message: 'Simulated donation completed successfully!'
            };
            
        } catch (error) {
            console.error('Complete donation error:', error);
            return {
                success: false,
                error: error.message || 'Donation process failed'
            };
        }
    }
    
    // ==================== EXISTING METHODS (UPDATED) ====================
    
    // Calculate fees for a payment method
    calculateFees(amount, method = 'qr') {
        const methodConfig = this.paymentMethods[method] || this.paymentMethods.qr;
        const percentageFee = amount * methodConfig.fee;
        const totalFee = percentageFee + methodConfig.fixedFee;
        
        return {
            percentageFee: parseFloat(percentageFee.toFixed(2)),
            fixedFee: methodConfig.fixedFee,
            totalFee: parseFloat(totalFee.toFixed(2)),
            finalAmount: parseFloat((amount + totalFee).toFixed(2))
        };
    }
    
    // Generate payment reference
    generatePaymentReference(campaignId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `DON-${campaignId}-${timestamp}-${random}`;
    }
    
    // Main donation processing method with enhanced duplicate prevention
    async processDonation(donationData, useSimulation = true) {
        // NEW: Enhanced validation and duplicate prevention
        const { amount, paymentMethod } = donationData;
        
        // Basic validation
        if (!amount || amount < 1) {
            return { success: false, error: 'Minimum donation is RM1' };
        }
        
        if (amount > 10000) {
            return { success: false, error: 'Maximum donation is RM10,000' };
        }
        
        if (!donationData.donorEmail) {
            return { success: false, error: 'Email is required for receipt' };
        }
        
        // NEW: Add timestamp to donation data for duplicate checking
        donationData.timestamp = Date.now();
        donationData.userId = this.getCurrentUserId() || 0;
        
        // If using simulation mode, use simulated payment
        if (useSimulation || (this.config && this.config.sandboxMode)) {
            return await this.completeSimulatedDonation(donationData);
        }
        
        // Otherwise use original payment methods
        try {
            switch (paymentMethod) {
                case 'qr':
                    return await this.generateQRPayment(donationData);
                    
                case 'fpx':
                    const bankSelect = document.getElementById('bankSelect');
                    const bankCode = bankSelect?.value;
                    if (!bankCode) {
                        return { success: false, error: 'Please select your bank' };
                    }
                    return await this.processFPXPayment(donationData, bankCode);
                    
                case 'card':
                    return { 
                        success: false, 
                        error: 'Credit card payments are coming soon' 
                    };
                    
                default:
                    return { 
                        success: false, 
                        error: 'Invalid payment method selected' 
                    };
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            return {
                success: false,
                error: 'Payment processing failed. Please try again.'
            };
        }
    }
    
    // Updated QR payment to optionally use simulation
    async generateQRPayment(donationData, useSimulation = true) {
        if (useSimulation || (this.config && this.config.sandboxMode)) {
            return await this.processSimulatedPayment(donationData);
        }
        
        // Original QR payment logic (kept for reference)
        try {
            // NEW: Check for duplicate
            if (this.checkForDuplicateDonation(donationData)) {
                return {
                    success: false,
                    error: 'Duplicate donation detected. Please wait and try again.'
                };
            }
            
            const { amount, campaignId, donorEmail, donorName } = donationData;
            
            // Generate payment reference
            const reference = this.generatePaymentReference(campaignId);
            
            // Calculate fees
            const fees = this.calculateFees(amount, 'qr');
            
            // Create payment data
            const paymentData = {
                userSecretKey: this.config.apiKey,
                categoryCode: this.config.merchantCode,
                billName: `Donation - Campaign ${campaignId}`,
                billDescription: `Thank you for your donation to campaign ${campaignId}`,
                billPriceSetting: 1,
                billPayorInfo: 1,
                billAmount: fees.finalAmount * 100, // Convert to cents
                billReturnUrl: this.config.callbackUrl,
                billCallbackUrl: this.config.callbackUrl,
                billExternalReferenceNo: reference,
                billTo: donorName || 'Anonymous Donor',
                billEmail: donorEmail,
                billPhone: '',
                billSplitPayment: 0,
                billSplitPaymentArgs: '',
                billPaymentChannel: '0',
                billDisplayMerchant: 1,
                billContentEmail: 'Thank you for your donation!',
                billChargeToCustomer: fees.totalFee * 100 // Charge fee to customer
            };
            
            // In production, this would make an actual API call to ToyyibPay
            // For demo purposes, simulate API response
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock successful response
            return {
                success: true,
                qrCodeUrl: this.generateMockQRCode(paymentData),
                reference: reference,
                billCode: `BILL-${Date.now()}`,
                fees: fees,
                paymentUrl: `${this.config.apiBaseUrl}/index.php/api/createBill`,
                message: 'QR code generated successfully'
            };
            
        } catch (error) {
            console.error('QR Payment generation error:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate QR payment'
            };
        }
    }
    
    // Helper method to get current user ID from localStorage
    getCurrentUserId() {
        try {
            // Try to get user from global auth if available
            if (typeof auth !== 'undefined' && auth.getCurrentUser) {
                const user = auth.getCurrentUser();
                return user ? user.id : null;
            }
            
            // Fallback to utils
            if (typeof Utils !== 'undefined') {
                const utils = new Utils();
                const user = utils.getCurrentUser();
                return user ? user.id : null;
            }
            
            // Try localStorage directly as last resort
            const userData = localStorage.getItem('communitygive_user');
            if (userData) {
                const user = JSON.parse(userData);
                return user ? user.id : null;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return null;
        }
    }
    
    // Generate mock QR code for demo
    generateMockQRCode(paymentData) {
        const qrData = {
            type: 'payment',
            amount: paymentData.billAmount / 100,
            reference: paymentData.billExternalReferenceNo,
            merchant: 'CommunityGive',
            timestamp: new Date().toISOString(),
            campaignId: paymentData.billExternalReferenceNo.split('-')[1]
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(qrData));
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&format=png&bgcolor=ffffff&color=4e73df&qzone=2`;
    }
    
    // Process FPX (online banking) payment with duplicate prevention
    async processFPXPayment(donationData, bankCode) {
        try {
            // NEW: Check for duplicate
            if (this.checkForDuplicateDonation(donationData)) {
                return {
                    success: false,
                    error: 'Duplicate donation detected. Please wait and try again.'
                };
            }
            
            const { amount, campaignId, donorEmail } = donationData;
            
            // Generate payment reference
            const reference = this.generatePaymentReference(campaignId);
            
            // Calculate fees
            const fees = this.calculateFees(amount, 'fpx');
            
            // In production, this would integrate with FPX
            // For demo, simulate processing
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            return {
                success: true,
                reference: reference,
                bankCode: bankCode,
                fees: fees,
                redirectUrl: `${this.config.callbackUrl}?reference=${reference}&status=pending`,
                message: 'Redirecting to bank portal...'
            };
            
        } catch (error) {
            console.error('FPX Payment error:', error);
            return {
                success: false,
                error: 'Bank payment service is currently unavailable'
            };
        }
    }
    
    // Get payment method details
    getPaymentMethodDetails(method) {
        return this.paymentMethods[method] || null;
    }
    
    // Get all supported payment methods
    getSupportedPaymentMethods() {
        return Object.entries(this.paymentMethods)
            .filter(([key, value]) => value.supported)
            .map(([key, value]) => ({ code: key, ...value }));
    }
    
    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 2
        }).format(amount);
    }
    
    // NEW: Reset donation cooldown (useful for testing)
    resetCooldown() {
        this.lastDonationTime = 0;
        this.lastProcessedDonations.clear();
    }
    
    // NEW: Check if donation is allowed (for UI feedback)
    canMakeDonation() {
        const now = Date.now();
        return now - this.lastDonationTime >= this.minDonationInterval;
    }
    
    // NEW: Get time until next allowed donation (for UI feedback)
    getTimeUntilNextDonation() {
        const now = Date.now();
        const timeDiff = now - this.lastDonationTime;
        if (timeDiff < this.minDonationInterval) {
            return Math.ceil((this.minDonationInterval - timeDiff) / 1000);
        }
        return 0;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentProcessor;
}

// NEW: Global payment processor instance with safety wrapper
if (typeof window !== 'undefined') {
    window.createPaymentProcessor = function() {
        if (!window._paymentProcessorInstance) {
            window._paymentProcessorInstance = new PaymentProcessor();
        }
        return window._paymentProcessorInstance;
    };
    
    // Auto-create instance for convenience
    window.paymentProcessor = window.createPaymentProcessor();
}