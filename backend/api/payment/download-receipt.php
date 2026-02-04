<?php
// download-receipt.php

// Start session for authentication
session_start();

// Database connection
require_once dirname(__FILE__) . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Get donation ID from query parameter
$donation_id = $_GET['donation_id'] ?? 0;
$download = isset($_GET['download']) ? filter_var($_GET['download'], FILTER_VALIDATE_BOOLEAN) : false;

if (!$donation_id) {
    die('Donation ID is required');
}

// Check if user is authenticated
if (!isset($_SESSION['user_id'])) {
    die('Authentication required. Please login to view receipt.');
}

$user_id = $_SESSION['user_id'];
$isAdmin = isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';

try {
    // Build query based on user role
    if ($isAdmin) {
        // Admin can view any receipt
        $query = "SELECT d.*, u.name as user_name, u.email, 
                         c.title as campaign_title, c.organizer,
                         d.created_at as donation_date
                  FROM donations d
                  LEFT JOIN users u ON d.user_id = u.id
                  JOIN campaigns c ON d.campaign_id = c.id
                  WHERE d.id = :donation_id AND d.status = 'completed'";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':donation_id', $donation_id);
    } else {
        // Regular user can only view their own receipts
        $query = "SELECT d.*, u.name as user_name, u.email, 
                         c.title as campaign_title, c.organizer,
                         d.created_at as donation_date
                  FROM donations d
                  LEFT JOIN users u ON d.user_id = u.id
                  JOIN campaigns c ON d.campaign_id = c.id
                  WHERE d.id = :donation_id 
                    AND d.user_id = :user_id 
                    AND d.status = 'completed'";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':donation_id', $donation_id);
        $stmt->bindParam(':user_id', $user_id);
    }
    
    $stmt->execute();
    $donation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$donation) {
        if ($isAdmin) {
            die('Donation not found or not completed');
        } else {
            die('Donation not found, not completed, or you do not have permission to view this receipt.');
        }
    }
    
    // Generate receipt
    if ($download) {
        // For actual download (PDF format - you can implement proper PDF generation)
        generateReceiptPDF($donation);
    } else {
        // Display HTML receipt (default)
        $html = generateReceiptHTML($donation, $isAdmin);
        
        // If request wants JSON (for API calls)
        if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'donation' => [
                    'id' => $donation['id'],
                    'transaction_id' => $donation['transaction_id'] ?: 'DON-' . str_pad($donation['id'], 6, '0', STR_PAD_LEFT),
                    'amount' => $donation['amount'],
                    'campaign_title' => $donation['campaign_title'],
                    'user_name' => $donation['user_name'],
                    'donation_date' => $donation['donation_date']
                ],
                'receipt_url' => 'download-receipt.php?donation_id=' . $donation_id,
                'download_url' => 'download-receipt.php?donation_id=' . $donation_id . '&download=true'
            ]);
            exit();
        }
        
        // Output HTML receipt
        header('Content-Type: text/html');
        echo $html;
    }
    
} catch (Exception $e) {
    // Handle errors appropriately based on request type
    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ]);
    } else {
        die('Error: ' . $e->getMessage());
    }
}

/**
 * Generate HTML receipt (your original function with enhancements)
 */
function generateReceiptHTML($donation, $isAdminView = false) {
    $date = date('d M Y, h:i A', strtotime($donation['donation_date']));
    $receipt_id = 'REC-' . $donation['id'] . '-' . time();
    
    // Generate QR code data for receipt verification (optional)
    $qr_data = "Receipt Verification\n";
    $qr_data .= "ID: " . $receipt_id . "\n";
    $qr_data .= "Transaction: " . ($donation['transaction_id'] ?: 'DON-' . str_pad($donation['id'], 6, '0', STR_PAD_LEFT)) . "\n";
    $qr_data .= "Amount: RM " . number_format($donation['amount'], 2) . "\n";
    $qr_data .= "Date: " . $date;
    
    $admin_note = $isAdminView ? 
        '<div style="background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #4e73df; font-size: 12px;">
            <strong>Admin View:</strong> This receipt is being viewed by an administrator.
        </div>' : '';
    
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Donation Receipt - ' . ($donation['transaction_id'] ?: 'DON-' . str_pad($donation['id'], 6, '0', STR_PAD_LEFT)) . '</title>
        <style>
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
                .receipt { border: none; padding: 0; }
                .print-instructions { display: none; }
            }
            @media screen {
                body { font-family: Arial, sans-serif; margin: 40px; background-color: #f8f9fa; }
                .receipt { max-width: 800px; margin: 0 auto; border: 2px solid #4e73df; padding: 30px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .logo { color: #4e73df; font-size: 24px; font-weight: bold; }
            .title { color: #333; margin: 10px 0; }
            .details { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .label { font-weight: bold; color: #666; width: 40%; }
            .value { color: #333; width: 55%; }
            .amount { font-size: 28px; color: #28a745; font-weight: bold; text-align: center; margin: 30px 0; padding: 20px; background: #f8fff8; border-radius: 10px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
            .thank-you { text-align: center; margin: 30px 0; color: #4e73df; font-style: italic; padding: 20px; background: #f8f9ff; border-radius: 10px; }
            .print-btn { text-align: center; margin: 20px 0; }
            .button-group { display: flex; justify-content: center; gap: 10px; margin: 20px 0; }
            .btn { padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; }
            .btn-primary { background: #4e73df; color: white; }
            .btn-secondary { background: #6c757d; color: white; }
            .btn-success { background: #28a745; color: white; }
            .print-instructions { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; font-size: 14px; }
            .verification-section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
            .verification-qr { margin: 20px auto; padding: 10px; background: white; display: inline-block; }
            .admin-actions { background: #e8f4f8; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        ' . $admin_note . '
        
        <div class="print-btn no-print">
            <div class="button-group">
                <button onclick="window.print()" class="btn btn-primary">
                    <i class="fas fa-print"></i> Print Receipt
                </button>
                <a href="?donation_id=' . $donation['id'] . '&download=true" class="btn btn-success">
                    <i class="fas fa-download"></i> Download PDF
                </a>
                <button onclick="window.close()" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
            
            <div class="print-instructions">
                <strong>Print Instructions:</strong> For best results, use "Save as PDF" in your print dialog.
                Ensure "Background graphics" is enabled in print settings.
            </div>
        </div>
        
        <div class="receipt">
            <div class="header">
                <div class="logo">CommunityGive</div>
                <h1 class="title">OFFICIAL DONATION RECEIPT</h1>
                <p>Tax-Deductible Contribution Receipt</p>
            </div>
            
            <div class="amount">RM ' . number_format($donation['amount'], 2) . '</div>
            
            <div class="details">
                <div class="row">
                    <div class="label">Receipt Number:</div>
                    <div class="value"><strong>' . $receipt_id . '</strong></div>
                </div>
                <div class="row">
                    <div class="label">Transaction ID:</div>
                    <div class="value">' . ($donation['transaction_id'] ?: 'DON-' . str_pad($donation['id'], 6, '0', STR_PAD_LEFT)) . '</div>
                </div>
                <div class="row">
                    <div class="label">Date of Donation:</div>
                    <div class="value">' . $date . '</div>
                </div>
                <div class="row">
                    <div class="label">Date Issued:</div>
                    <div class="value">' . date('d M Y, h:i A') . '</div>
                </div>
                <div class="row">
                    <div class="label">Donor Name:</div>
                    <div class="value">' . ($donation['user_name'] ?: 'Anonymous Donor') . '</div>
                </div>
                <div class="row">
                    <div class="label">Donor Email:</div>
                    <div class="value">' . ($donation['email'] ?: 'Not provided') . '</div>
                </div>
                <div class="row">
                    <div class="label">Campaign:</div>
                    <div class="value">' . $donation['campaign_title'] . '</div>
                </div>
                <div class="row">
                    <div class="label">Organizer:</div>
                    <div class="value">' . $donation['organizer'] . '</div>
                </div>
                <div class="row">
                    <div class="label">Payment Method:</div>
                    <div class="value">' . ($donation['payment_method'] ?: 'QR Code Payment') . '</div>
                </div>
                <div class="row">
                    <div class="label">Payment Status:</div>
                    <div class="value"><strong style="color: #28a745;">COMPLETED</strong></div>
                </div>
                <div class="row">
                    <div class="label">Donation ID:</div>
                    <div class="value">' . $donation['id'] . '</div>
                </div>
            </div>
            
            <div class="verification-section">
                <h3 style="color: #4e73df; margin-bottom: 15px;">Receipt Verification</h3>
                <p style="margin-bottom: 15px; color: #666;">
                    This receipt can be verified by contacting CommunityGive support.
                </p>
                <div class="verification-qr">
                    <!-- Placeholder for QR code -->
                    <div style="width: 150px; height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">
                        QR Code<br>(Verification)
                    </div>
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">
                    Scan to verify receipt authenticity
                </p>
            </div>
            
            <div class="thank-you">
                <h3>Thank You for Your Generous Support!</h3>
                <p>Your contribution of <strong>RM ' . number_format($donation['amount'], 2) . '</strong> will directly support "<strong>' . $donation['campaign_title'] . '</strong>"</p>
                <p>Your donation helps make a real difference in our community.</p>
            </div>
            
            <div class="footer">
                <p><strong>CommunityGive Micro-Donation Portal</strong></p>
                <p>This is an official tax receipt. Please retain for your records.</p>
                <p>For questions or verification: support@communitygive.org | +603-1234-5678</p>
                <p style="font-size: 10px; color: #999; margin-top: 20px;">
                    Receipt generated electronically. No physical copy required.
                    Valid for tax purposes in accordance with local regulations.
                </p>
            </div>
        </div>
        
        <!-- Admin actions section (only for admin users) -->
        ' . ($isAdminView ? '
        <div class="admin-actions no-print">
            <h4 style="margin: 0 0 10px 0; color: #4e73df;">Admin Actions</h4>
            <div class="button-group">
                <a href="../../admin-dashboard.html" class="btn btn-primary">
                    <i class="fas fa-tachometer-alt"></i> Back to Dashboard
                </a>
                <a href="../user/donations.php?user_id=' . $donation['user_id'] . '" class="btn btn-secondary">
                    <i class="fas fa-list"></i> View All Donations
                </a>
            </div>
        </div>
        ' : '') . '
        
        <!-- Include Font Awesome for icons -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        
        <script>
            // Auto-print option (uncomment if needed)
            window.onload = function() {
                // Check if auto-print is requested
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get("print") === "true") {
                    setTimeout(function() { 
                        window.print(); 
                    }, 500);
                }
                
                // Add keyboard shortcut for printing (Ctrl+P)
                document.addEventListener("keydown", function(e) {
                    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
                        e.preventDefault();
                        window.print();
                    }
                });
            };
            
            // Function to save as PDF (simplified)
            function saveAsPDF() {
                alert("PDF download feature requires server-side implementation. Use the Download PDF button for basic functionality.");
            }
        </script>
    </body>
    </html>';
}

/**
 * Generate PDF receipt (placeholder - implement with TCPDF, mPDF, or similar)
 */
function generateReceiptPDF($donation) {
    // For now, redirect to HTML version with print dialog
    // In a real implementation, you would generate actual PDF using TCPDF, mPDF, etc.
    
    header('Location: ?donation_id=' . $donation['id'] . '&print=true');
    exit();
    
    /* 
    // Example with TCPDF (you would need to install and configure TCPDF)
    require_once('tcpdf/tcpdf.php');
    
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    $pdf->SetCreator('CommunityGive');
    $pdf->SetAuthor('CommunityGive');
    $pdf->SetTitle('Donation Receipt - ' . $donation['transaction_id']);
    $pdf->SetSubject('Donation Receipt');
    $pdf->SetKeywords('Donation, Receipt, CommunityGive');
    
    // Add a page
    $pdf->AddPage();
    
    // Set content
    $html = '<h1>Donation Receipt</h1>';
    $html .= '<p>Transaction ID: ' . $donation['transaction_id'] . '</p>';
    $html .= '<p>Amount: RM ' . number_format($donation['amount'], 2) . '</p>';
    // ... more content
    
    $pdf->writeHTML($html, true, false, true, false, '');
    
    // Output PDF
    $pdf->Output('receipt-' . $donation['transaction_id'] . '.pdf', 'D');
    */
}
?>