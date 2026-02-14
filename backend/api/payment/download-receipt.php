<?php
// download-receipt.php - Fixed for users table with 'id' column
// Enable CORS if needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Start session with proper configuration
session_set_cookie_params([
    'lifetime' => 86400,
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'],
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

// Database connection
require_once dirname(__FILE__) . '/../../config/database.php';
$database = new Database();
$db = $database->getConnection();

// Get donation ID from query parameter
$donation_id = $_GET['donation_id'] ?? 0;
$download = isset($_GET['download']) ? filter_var($_GET['download'], FILTER_VALIDATE_BOOLEAN) : false;
$print = isset($_GET['print']) ? filter_var($_GET['print'], FILTER_VALIDATE_BOOLEAN) : false;
$autoprint = isset($_GET['autoprint']) ? filter_var($_GET['autoprint'], FILTER_VALIDATE_BOOLEAN) : false;

// Check if this is an API request
$accept_header = $_SERVER['HTTP_ACCEPT'] ?? '';
$is_api_request = (strpos($accept_header, 'application/json') !== false);

if (!$donation_id) {
    sendError('Donation ID is required', 400, $is_api_request);
    exit;
}

// === AUTHENTICATION LOGIC ===
$user_id = null;
$isAdmin = false;
$authenticated = false;

// Debug info
error_log("Receipt request - Session ID: " . session_id());
error_log("Session data: " . print_r($_SESSION, true));
error_log("GET parameters: " . print_r($_GET, true));

// Check if user is logged in via session
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $isAdmin = isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
    $authenticated = true;
    error_log("User authenticated via session: id=$user_id, isAdmin=" . ($isAdmin ? 'true' : 'false'));
} else {
    // Check for user_id parameter (passed from JavaScript)
    $param_user_id = $_GET['user_id'] ?? null;
    if ($param_user_id && is_numeric($param_user_id)) {
        $user_id = (int)$param_user_id;
        
        // Verify this user exists and get their role
        try {
            $user_query = "SELECT role FROM users WHERE id = :user_id";
            $user_stmt = $db->prepare($user_query);
            $user_stmt->bindParam(':user_id', $user_id);
            $user_stmt->execute();
            $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                $isAdmin = $user['role'] === 'admin';
                $authenticated = true;
                
                // Set session for future requests
                $_SESSION['user_id'] = $user_id;
                if ($isAdmin) {
                    $_SESSION['user_role'] = 'admin';
                }
                
                error_log("User authenticated via parameter: id=$user_id, isAdmin=" . ($isAdmin ? 'true' : 'false'));
            } else {
                error_log("User ID $param_user_id not found in database");
            }
        } catch (Exception $e) {
            error_log("User verification error: " . $e->getMessage());
        }
    }
    
    if (!$authenticated) {
        error_log("Authentication failed - no valid user ID found");
        sendError('Authentication required. Please login to view receipt.', 401, $is_api_request);
        exit;
    }
}

// === MAIN LOGIC ===
try {
    // Enhanced debugging
    error_log("=== ENHANCED RECEIPT DEBUG ===");
    error_log("REQUEST URI: " . $_SERVER['REQUEST_URI']);
    error_log("GET Parameters: " . print_r($_GET, true));
    error_log("Session ID: " . session_id());
    error_log("User ID from session: " . ($_SESSION['user_id'] ?? 'NOT SET'));
    error_log("User ID from variable: " . ($user_id ?? 'NULL'));
    error_log("Is Admin: " . ($isAdmin ? 'YES' : 'NO'));
    error_log("Donation ID requested: " . $donation_id);
    
    // Check if donation exists with detailed info
    $check_query = "SELECT d.*, u.name as donor_name, c.title as campaign_name 
                    FROM donations d 
                    LEFT JOIN users u ON d.user_id = u.id 
                    LEFT JOIN campaigns c ON d.campaign_id = c.id 
                    WHERE d.id = :donation_id";
    
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':donation_id', $donation_id);
    $check_stmt->execute();
    $check_donation = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($check_donation) {
        error_log("DONATION FOUND:");
        error_log("  ID: " . $check_donation['id']);
        error_log("  User ID: " . $check_donation['user_id']);
        error_log("  Campaign ID: " . $check_donation['campaign_id']);
        error_log("  Status: " . $check_donation['status']);
        error_log("  Amount: " . $check_donation['amount']);
        error_log("  Donor Name: " . ($check_donation['donor_name'] ?? 'NULL'));
        error_log("  Campaign Name: " . ($check_donation['campaign_name'] ?? 'NULL'));
        
        // Check campaign exists
        $camp_check = "SELECT id, title FROM campaigns WHERE id = :campaign_id";
        $camp_stmt = $db->prepare($camp_check);
        $camp_stmt->bindParam(':campaign_id', $check_donation['campaign_id']);
        $camp_stmt->execute();
        $campaign = $camp_stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($campaign) {
            error_log("CAMPAIGN FOUND: " . $campaign['title']);
        } else {
            error_log("CAMPAIGN NOT FOUND for ID: " . $check_donation['campaign_id']);
        }
    } else {
        error_log("DONATION NOT FOUND in database for ID: " . $donation_id);
        sendError('Donation ID ' . $donation_id . ' not found in database', 404, $is_api_request);
        exit;
    }
    
    // Check user permission
    if (!$isAdmin && $check_donation['user_id'] != $user_id) {
        error_log("PERMISSION DENIED:");
        error_log("  Donation user_id: " . $check_donation['user_id']);
        error_log("  Current user_id: " . $user_id);
        error_log("  Is Admin: NO");
    } else {
        error_log("PERMISSION GRANTED (or admin)");
    }
    
    // Build query based on user role
    if ($isAdmin) {
        error_log("Using ADMIN query");
        $query = "SELECT d.*, u.name as user_name, u.email, 
                         c.title as campaign_title, c.organizer,
                         d.created_at as donation_date
                  FROM donations d
                  LEFT JOIN users u ON d.user_id = u.id
                  JOIN campaigns c ON d.campaign_id = c.id
                  WHERE d.id = :donation_id AND d.status IN ('completed', 'pending')";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':donation_id', $donation_id);
    } else {
        error_log("Using USER query (user_id = $user_id)");
        $query = "SELECT d.*, u.name as user_name, u.email, 
                         c.title as campaign_title, c.organizer,
                         d.created_at as donation_date
                  FROM donations d
                  LEFT JOIN users u ON d.user_id = u.id
                  JOIN campaigns c ON d.campaign_id = c.id
                  WHERE d.id = :donation_id 
                    AND d.user_id = :user_id 
                    AND d.status IN ('completed', 'pending')"; // CHANGED HERE
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':donation_id', $donation_id);
        $stmt->bindParam(':user_id', $user_id);
        error_log("Query prepared with donation_id=$donation_id, user_id=$user_id");
    }
    
    $stmt->execute();
    $donation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($donation) {
        error_log("QUERY SUCCESS - Donation data retrieved");
        error_log("Campaign title: " . $donation['campaign_title']);
        error_log("User name: " . $donation['user_name']);
    } else {
        error_log("QUERY FAILED - No results returned");
        error_log("Last SQL error: " . print_r($stmt->errorInfo(), true));
        
        // Try a simpler query without JOIN to debug
        $simple_query = "SELECT * FROM donations WHERE id = :donation_id AND user_id = :user_id AND status = 'completed'";
        $simple_stmt = $db->prepare($simple_query);
        $simple_stmt->bindParam(':donation_id', $donation_id);
        $simple_stmt->bindParam(':user_id', $user_id);
        $simple_stmt->execute();
        $simple_result = $simple_stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($simple_result) {
            error_log("SIMPLE QUERY WORKED - Issue might be with JOINs");
        } else {
            error_log("SIMPLE QUERY ALSO FAILED");
            error_log("Simple query params: donation_id=$donation_id, user_id=$user_id");
        }
        
        $message = $isAdmin 
            ? 'Donation not found or not completed' 
            : 'Donation not found, not completed, or you do not have permission to view this receipt.';
        
        sendError($message, 404, $is_api_request);
        exit;
    }
    
    error_log("=== END DEBUG ===");
    
    // Generate receipt based on request type
    if ($download) {
        generateReceiptPDF($donation);
    } else {
        if ($is_api_request) {
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
                'receipt_url' => 'download-receipt.php?donation_id=' . $donation_id . '&user_id=' . $user_id,
                'print_url' => 'download-receipt.php?donation_id=' . $donation_id . '&user_id=' . $user_id . '&print=true'
            ]);
            exit();
        }
        
        $html = generateReceiptHTML($donation, $isAdmin, $print, $autoprint);
        header('Content-Type: text/html');
        echo $html;
    }
    
} catch (Exception $e) {
    error_log("Receipt generation error: " . $e->getMessage());
    sendError('Error generating receipt: ' . $e->getMessage(), 500, $is_api_request);
}

/**
 * Send error response
 */
function sendError($message, $code = 500, $json = false) {
    http_response_code($code);
    
    if ($json) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => $message,
            'code' => $code
        ]);
    } else {
        echo '<!DOCTYPE html>
        <html>
        <head>
            <title>Error</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                .error { color: #dc3545; margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>Error ' . $code . '</h1>
            <div class="error">' . htmlspecialchars($message) . '</div>
            <a href="javascript:history.back()">Go Back</a>
        </body>
        </html>';
    }
    exit;
}

/**
 * Simple token validation function
 */
function extractUserIdFromToken($token) {
    // This is a simple implementation. In production, use a proper JWT or database lookup.
    // For now, we'll extract user ID from a token format like "user_1_token" or similar
    if (preg_match('/user_(\d+)_/', $token, $matches)) {
        return $matches[1];
    }
    
    // Check if token is in a simple format like just a user ID
    if (is_numeric($token)) {
        return (int)$token;
    }
    
    return null;
}

/**
 * Generate HTML receipt (simplified without API token dependencies)
 */
function generateReceiptHTML($donation, $isAdminView = false, $print = false, $autoprint = false) {
    $date = date('d M Y, h:i A', strtotime($donation['donation_date']));
    $receipt_id = 'REC-' . $donation['id'] . '-' . time();
    
    // Determine if we should auto-print
    $should_autoprint = $autoprint || $print;
    
    // Auto-print script - FIXED VERSION
    $auto_print_script = '';
    if ($should_autoprint) {
        $auto_print_script = '
        <script>
            // Wait for DOM to be fully loaded
            document.addEventListener("DOMContentLoaded", function() {
                console.log("DOM loaded, attempting to print...");
                
                // Short delay to ensure everything is rendered
                setTimeout(function() {
                    console.log("Triggering print dialog...");
                    try {
                        window.print();
                        console.log("Print dialog triggered successfully");
                        
                        // Optional: Close window after printing (uncomment if needed)
                        /*
                        window.addEventListener("afterprint", function() {
                            setTimeout(function() {
                                window.close();
                            }, 1000);
                        });
                        */
                    } catch (error) {
                        console.error("Print error:", error);
                    }
                }, 500); // Reduced delay
            });
            
            // Fallback: If DOMContentLoaded already fired
            if (document.readyState === "complete" || document.readyState === "interactive") {
                setTimeout(function() {
                    console.log("Document already ready, printing now...");
                    window.print();
                }, 100);
            }
        </script>';
    }
    
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Donation Receipt - ' . ($donation['transaction_id'] ?: 'DON-' . str_pad($donation['id'], 6, '0', STR_PAD_LEFT)) . '</title>
        ' . $auto_print_script . '
        <style>
            /* Your existing CSS styles here - keep them as they are */
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
    <body>';
    
    // Add admin note if admin view
    if ($isAdminView) {
        $html .= '
        <div style="background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #4e73df; font-size: 12px;" class="no-print">
            <strong>Admin View:</strong> This receipt is being viewed by an administrator.
        </div>';
    }
    
    // Add print controls if not in print mode
    if (!$print) {
        $html .= '
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
        </div>';
    }
    
    // Add receipt content
    $html .= '
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
        </div>';
    
    // Add admin actions if admin view
    if ($isAdminView && !$print) {
        $html .= '
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
        </div>';
    }
    
    // Add scripts
    $html .= '
        <!-- Include Font Awesome for icons -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        
        <script>
            // Auto-print option
            window.onload = function() {
                // Add keyboard shortcut for printing (Ctrl+P)
                document.addEventListener("keydown", function(e) {
                    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
                        e.preventDefault();
                        window.print();
                    }
                });
            };
        </script>
    </body>
    </html>';
    
    return $html;
}

/**
 * Generate PDF receipt (placeholder)
 */
function generateReceiptPDF($donation) {
    // For now, redirect to HTML version with print dialog
    header('Location: ?donation_id=' . $donation['id'] . '&print=true');
    exit();
}
?>