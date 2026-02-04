<?php
require_once dirname(__FILE__) . '/../../config/database.php';

// For PDF generation, we'll use a simple approach
// In production, use TCPDF or Dompdf

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$database = new Database();
$db = $database->getConnection();

$donation_id = $_GET['donation_id'] ?? 0;

if (!$donation_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Donation ID is required'
    ]);
    exit;
}

try {
    $query = "SELECT d.*, u.name as user_name, u.email, 
                     c.title as campaign_title, c.organizer,
                     d.created_at as donation_date
              FROM donations d
              LEFT JOIN users u ON d.user_id = u.id
              JOIN campaigns c ON d.campaign_id = c.id
              WHERE d.id = :donation_id AND d.status = 'completed'";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':donation_id', $donation_id);
    $stmt->execute();
    $donation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$donation) {
        throw new Exception('Donation not found or not completed');
    }
    
    // Generate receipt HTML
    $receipt_html = generateReceiptHTML($donation);
    
    // For now, we'll just return the HTML
    // In production, convert this HTML to PDF using a library
    
    // Store receipt in database (optional)
    $update_query = "UPDATE donations SET receipt_generated = 1 WHERE id = :donation_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':donation_id', $donation_id);
    $update_stmt->execute();
    
    echo json_encode([
        'success' => true,
        'html' => $receipt_html,
        'donation' => $donation,
        'download_url' => '/backend/api/payment/download-receipt.php?donation_id=' . $donation_id
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function generateReceiptHTML($donation) {
    $date = date('d M Y, h:i A', strtotime($donation['donation_date']));
    
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Donation Receipt - ' . $donation['transaction_id'] . '</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #4e73df; padding: 30px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .logo { color: #4e73df; font-size: 24px; font-weight: bold; }
            .title { color: #333; margin: 10px 0; }
            .details { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .amount { font-size: 28px; color: #28a745; font-weight: bold; text-align: center; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
            .thank-you { text-align: center; margin: 30px 0; color: #4e73df; font-style: italic; }
        </style>
    </head>
    <body>
        <div class="receipt">
            <div class="header">
                <div class="logo">CommunityGive</div>
                <h1 class="title">DONATION RECEIPT</h1>
                <p>Official Receipt for Tax Purposes</p>
            </div>
            
            <div class="amount">RM ' . number_format($donation['amount'], 2) . '</div>
            
            <div class="details">
                <div class="row">
                    <div class="label">Transaction ID:</div>
                    <div class="value">' . $donation['transaction_id'] . '</div>
                </div>
                <div class="row">
                    <div class="label">Date:</div>
                    <div class="value">' . $date . '</div>
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
                    <div class="value">QR Code Payment (Simulated)</div>
                </div>
                <div class="row">
                    <div class="label">Status:</div>
                    <div class="value"><strong style="color: #28a745;">COMPLETED</strong></div>
                </div>
            </div>
            
            <div class="thank-you">
                <p>Thank you for your generous donation!</p>
                <p>Your contribution makes a real difference in our community.</p>
            </div>
            
            <div class="footer">
                <p>CommunityGive Micro-Donation Portal</p>
                <p>This is an official receipt for your records.</p>
                <p>Generated on: ' . date('d M Y, h:i A') . '</p>
                <p>Receipt ID: REC-' . $donation['id'] . '-' . time() . '</p>
            </div>
        </div>
    </body>
    </html>';
}
?>