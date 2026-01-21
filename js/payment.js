// Enhanced Payment Processing Functions
class PaymentProcessor {
    constructor() {
        this.config = {
            sandboxMode: true,
            apiBaseUrl: this.getApiBaseUrl(),
            apiKey: this.getApiKey(),
            merchantCode: 'YOUR_MERCHANT_CODE',
            callbackUrl: window.location.origin + '/payment-callback.html'
        };
        
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
    }
    
    getApiBaseUrl() {
        return this.config.sandboxMode 
            ? 'https://sandbox.toyyibpay.com' 
            : 'https://toyyibpay.com';
    }
    
    getApiKey() {
        return this.config.sandboxMode 
            ? 'YOUR_SANDBOX_API_KEY' 
            : 'YOUR_PRODUCTION_API_KEY';
    }
    
    // Calculate fees for a payment method
    calculateFees(amount, method = 'qr') {
        const methodConfig = this.paymentMethods[method] || this.paymentMethods.qr;
        const percentageFee = amount * methodConfig.fee;
        const totalFee = percentageFee + methodConfig.fixedFee;
        
        return {
            percentageFee: percentageFee,
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
    
    // Generate QR code payment
    async generateQRPayment(donationData) {
        try {
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
            if (this.config.sandboxMode) {
                // Simulate API response delay
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
            } else {
                // Actual API call would go here
                // const response = await fetch(`${this.config.apiBaseUrl}/index.php/api/createBill`, {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                //     body: new URLSearchParams(paymentData)
                // });
                // const result = await response.json();
                
                return {
                    success: true,
                    qrCodeUrl: this.generateMockQRCode(paymentData),
                    reference: reference,
                    fees: fees,
                    message: 'QR code generated successfully'
                };
            }
            
        } catch (error) {
            console.error('QR Payment generation error:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate QR payment'
            };
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
    
    // Process FPX (online banking) payment
    async processFPXPayment(donationData, bankCode) {
        try {
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
    
    // Verify payment status
    async verifyPayment(reference) {
        try {
            // In production, query payment gateway API
            // For demo, simulate verification
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulate 90% success rate in sandbox
            const isSuccessful = Math.random() > 0.1;
            
            return {
                success: true,
                verified: isSuccessful,
                reference: reference,
                status: isSuccessful ? 'completed' : 'failed',
                verifiedAt: new Date().toISOString(),
                amount: isSuccessful ? 10.00 : 0,
                message: isSuccessful ? 'Payment verified successfully' : 'Payment verification failed'
            };
            
        } catch (error) {
            console.error('Payment verification error:', error);
            return {
                success: false,
                error: 'Unable to verify payment status'
            };
        }
    }
    
    // Main donation processing method
    async processDonation(donationData) {
        const { amount, paymentMethod } = donationData;
        
        // Validation
        if (!amount || amount < 1) {
            return { success: false, error: 'Minimum donation is RM1' };
        }
        
        if (amount > 10000) {
            return { success: false, error: 'Maximum donation is RM10,000' };
        }
        
        if (!donationData.donorEmail) {
            return { success: false, error: 'Email is required for receipt' };
        }
        
        // Process based on payment method
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
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentProcessor;
}