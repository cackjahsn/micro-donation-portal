// Enhanced Payment Processing Functions (QR Only)
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
        
        // Payment methods (QR ONLY)
        this.paymentMethods = {
            qr: {
                name: 'QR Code Payment',
                supported: true,
                fee: 0.019, // 1.9%
                fixedFee: 0.20
            }
            // Removed: fpx and card methods
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
    
    // ==================== DATABASE-BASED PAYMENT METHODS ====================
    
    // Process donation and save to database
    async processDonation(donationData, useSimulation = true) {
        // Enhanced validation and duplicate prevention
        const { amount } = donationData;
        
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
        
        // Add timestamp to donation data for duplicate checking
        donationData.timestamp = Date.now();
        donationData.userId = this.getCurrentUserId() || 0;
        donationData.paymentMethod = 'qr'; // Force QR method
        
        // Check for duplicate before processing
        if (this.checkForDuplicateDonation(donationData)) {
            return { 
                success: false, 
                error: 'Duplicate donation detected. Please wait a moment before trying again.' 
            };
        }
        
        try {
            // Step 1: Generate QR code via PHP API
            console.log('Step 1: Generating QR code...');
            const qrResponse = await this.generateQRCode({
                amount: amount,
                campaign_id: donationData.campaignId,
                user_id: this.getCurrentUserId(),
                donor_name: donationData.donorName || 'Anonymous',
                donor_email: donationData.donorEmail,
                payment_method: 'qr',
                anonymous: donationData.anonymous || false,
                cover_fees: donationData.coverFees || false
            });
            
            if (!qrResponse.success) {
                throw new Error(qrResponse.message || 'Failed to generate QR code');
            }
            
            // Step 2: Save donation to database
            console.log('Step 2: Saving donation to database...');
            const saveResponse = await this.saveDonationToDatabase(donationData);
            
            if (!saveResponse.success) {
                throw new Error(saveResponse.message || 'Failed to save donation to database');
            }
            
            // Update last donation time
            this.lastDonationTime = Date.now();
            
            // Return success with REAL database data
            return {
                success: true,
                type: 'database',
                qrCodeUrl: qrResponse.qr_code_image,
                qrCodeData: qrResponse.qr_data,
                transactionId: saveResponse.transactionId,
                donationId: saveResponse.donationId, // REAL ID from database
                amount: donationData.amount,
                message: 'Donation processed and saved to database successfully',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Donation processing error:', error);
            return {
                success: false,
                error: error.message || 'Donation processing failed'
            };
        }
    }
    
    // Generate QR code via PHP API
    async generateQRCode(paymentData) {
        try {
            console.log('Generating QR code for payment:', paymentData);
            
            const response = await fetch(`${this.config.simulatedApiBase}/generate-qr.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(paymentData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('QR code generated:', result);
            return result;
            
        } catch (error) {
            console.error('QR generation API error:', error);
            throw error;
        }
    }
    
    // Save donation to database
    async saveDonationToDatabase(donationData) {
        try {
            console.log('Saving donation to database:', donationData);
            
            // Build URL using utils if available
            let saveUrl;
            if (typeof utils !== 'undefined' && utils.getApiUrl) {
                saveUrl = utils.getApiUrl('payment/save-donations.php');
            } else {
                saveUrl = '/micro-donation-portal/backend/api/payment/save-donations.php';
            }
            
            console.log('Using save URL:', saveUrl);
            
            // Get auth token - try all possible locations
            const authToken = localStorage.getItem('auth_token') || 
                            localStorage.getItem('token') ||
                            localStorage.getItem('micro_donation_token');
            
            // Get current user - IMPORTANT: Use micro_donation_user, NOT 'user'
            let currentUser = null;
            try {
                // Try to get from AuthManager first
                if (window.authManager && typeof window.authManager.getUser === 'function') {
                    currentUser = window.authManager.getUser();
                }
                
                // Fallback to localStorage - use the CORRECT key
                if (!currentUser) {
                    const userStr = localStorage.getItem('micro_donation_user');
                    if (userStr) {
                        currentUser = JSON.parse(userStr);
                    }
                }
                
                // Last resort - try to parse from other keys but warn
                if (!currentUser) {
                    const legacyUserStr = localStorage.getItem('user');
                    if (legacyUserStr) {
                        console.warn('Using legacy user key - this should be fixed');
                        currentUser = JSON.parse(legacyUserStr);
                    }
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
            
            console.log('Auth token available:', !!authToken);
            console.log('Current user:', currentUser);
            
            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            // Add Authorization header if token exists
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            // Prepare request body - INCLUDE USER ID
            const requestBody = {
                campaignId: donationData.campaignId,
                amount: donationData.amount,
                paymentMethod: donationData.paymentMethod || 'qr',
                donorName: donationData.donorName || currentUser?.name || '',
                donorEmail: donationData.donorEmail || currentUser?.email || '',
                anonymous: donationData.anonymous || false
            };
            
            // IMPORTANT: Add userId to help backend identify the user
            if (currentUser && currentUser.id) {
                requestBody.userId = currentUser.id;
            }
            
            // If donationData already has transactionId from QR generation, include it
            if (donationData.transactionId) {
                requestBody.transactionId = donationData.transactionId;
            }
            
            // If donationData has donationId from QR generation, include it
            if (donationData.donationId) {
                requestBody.donationId = donationData.donationId;
            }
            
            console.log('Sending request with headers:', { 
                ...headers, 
                Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined 
            });
            console.log('Request body:', requestBody);
            
            const response = await fetch(saveUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            console.log('Save response status:', response.status);
            
            // Parse response
            const responseText = await response.text();
            console.log('Save response text:', responseText.substring(0, 200));
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }
            
            const result = JSON.parse(responseText);
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to save donation');
            }
            
            console.log('Donation saved successfully:', result);
            return result;
            
        } catch (error) {
            console.error('[PaymentProcessor] Database save error:', error);
            
            // Re-throw with descriptive message
            throw new Error(`Failed to save donation to database: ${error.message}`);
        }
    }
    
    // Verify payment (simulates QR scan and marks as completed)
    async verifyPayment(donationId) {
        try {
            console.log('Verifying payment for donation:', donationId);
            
            const response = await fetch(`${this.config.simulatedApiBase}/verify.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ donation_id: donationId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Payment verification result:', result);
            return result;
            
        } catch (error) {
            console.error('Payment verification error:', error);
            return {
                success: false,
                message: 'Payment verification failed: ' + error.message
            };
        }
    }
    
    // Generate receipt for a donation
    async generateReceipt(donationId) {
        console.log(`[PaymentProcessor] Generating receipt for donation: ${donationId}`);
        
        try {
            // The receipt will be generated by download-receipt.php
            return {
                success: true,
                receiptUrl: `backend/api/payment/download-receipt.php?donation_id=${donationId}&print=true`,
                message: 'Receipt generated successfully'
            };
            
        } catch (error) {
            console.error('[PaymentProcessor] Receipt generation error:', error);
            throw new Error('Failed to generate receipt: ' + error.message);
        }
    }
    
    // ==================== HELPER METHODS ====================
    
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
            const userData = localStorage.getItem('communitygive_user') || 
                           localStorage.getItem('micro_donation_user') ||
                           localStorage.getItem('user');
            
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
    
    // Generate mock QR code for demo (only used if PHP API fails)
    generateMockQRCode(paymentData) {
        const qrData = {
            type: 'payment',
            amount: paymentData.amount || 0,
            reference: paymentData.transaction_id || 'MOCK-' + Date.now(),
            merchant: 'CommunityGive',
            timestamp: new Date().toISOString(),
            campaignId: paymentData.campaign_id || 1
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(qrData));
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&format=png&bgcolor=ffffff&color=4e73df&qzone=2`;
    }
    
    // Get payment method details
    getPaymentMethodDetails(method) {
        return this.paymentMethods[method] || null;
    }
    
    // Get all supported payment methods (only QR now)
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
    
    // Reset donation cooldown (useful for testing)
    resetCooldown() {
        this.lastDonationTime = 0;
        this.lastProcessedDonations.clear();
    }
    
    // Check if donation is allowed (for UI feedback)
    canMakeDonation() {
        const now = Date.now();
        return now - this.lastDonationTime >= this.minDonationInterval;
    }
    
    // Get time until next allowed donation (for UI feedback)
    getTimeUntilNextDonation() {
        const now = Date.now();
        const timeDiff = now - this.lastDonationTime;
        if (timeDiff < this.minDonationInterval) {
            return Math.ceil((this.minDonationInterval - timeDiff) / 1000);
        }
        return 0;
    }
    
    // ==================== SIMULATION FALLBACK (REMOVED) ====================
    // Removed the simulation fallback methods since we're using database now
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentProcessor;
}

// Global payment processor instance with safety wrapper
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