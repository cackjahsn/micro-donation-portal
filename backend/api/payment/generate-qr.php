<?php
// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Include database config - using correct path from your test
require_once dirname(__FILE__) . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Get POST data
$data = json_decode(file_get_contents("php://input"));

// Validate required fields
if (!isset($data->amount) || !isset($data->campaign_id)) {
    echo json_encode([
        'success' => false,
        'message' => 'Amount and campaign ID are required'
    ]);
    exit;
}

try {
    // Generate transaction ID
    $transaction_id = 'DON-' . time() . '-' . rand(1000, 9999);
    
    // Get campaign details
    $campaign_query = "SELECT title FROM campaigns WHERE id = :campaign_id";
    $campaign_stmt = $db->prepare($campaign_query);
    $campaign_stmt->bindParam(':campaign_id', $data->campaign_id);
    $campaign_stmt->execute();
    $campaign = $campaign_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$campaign) {
        throw new Exception('Campaign not found');
    }
    
    // Get donor information from request or session
    $donor_name = '';
    $donor_email = '';
    $donor_phone = '';
    $is_anonymous = false;
    
    // First check if donor info is provided in the request
    if (isset($data->donor_name)) {
        $donor_name = $data->donor_name;
    }
    if (isset($data->donor_email)) {
        $donor_email = $data->donor_email;
    }
    if (isset($data->donor_phone)) {
        $donor_phone = $data->donor_phone;
    }
    if (isset($data->anonymous)) {
        $is_anonymous = (bool)$data->anonymous;
    }
    
    // If anonymous donation, clear donor info
    if ($is_anonymous) {
        $donor_name = 'Anonymous';
        $donor_email = '';
        $donor_phone = '';
    }
    
    // If donor info not provided in request but user is logged in, get from session/user data
    if (empty($donor_name) && isset($data->user_id) && $data->user_id > 0) {
        // Try to get user info from users table
        $user_query = "SELECT name, email, phone FROM users WHERE id = :user_id";
        $user_stmt = $db->prepare($user_query);
        $user_stmt->bindParam(':user_id', $data->user_id);
        $user_stmt->execute();
        $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            if (empty($donor_name)) $donor_name = $user['name'];
            if (empty($donor_email)) $donor_email = $user['email'];
            if (empty($donor_phone)) $donor_phone = $user['phone'] ?? '';
        }
    }
    
    // Create donation record with donor information
    $query = "INSERT INTO donations 
              (user_id, campaign_id, amount, transaction_id, payment_method, 
               donor_name, donor_email, donor_phone, is_anonymous, status, created_at) 
              VALUES (:user_id, :campaign_id, :amount, :transaction_id, :payment_method, 
                      :donor_name, :donor_email, :donor_phone, :is_anonymous, 'pending', NOW())";
    
    $stmt = $db->prepare($query);
    
    $user_id = $data->user_id ?? 0; // 0 for guest donations
    $payment_method = $data->payment_method ?? 'qr';
    
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':campaign_id', $data->campaign_id);
    $stmt->bindParam(':amount', $data->amount);
    $stmt->bindParam(':transaction_id', $transaction_id);
    $stmt->bindParam(':payment_method', $payment_method);
    $stmt->bindParam(':donor_name', $donor_name);
    $stmt->bindParam(':donor_email', $donor_email);
    $stmt->bindParam(':donor_phone', $donor_phone);
    $stmt->bindParam(':is_anonymous', $is_anonymous, PDO::PARAM_BOOL);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to create donation record');
    }
    
    $donation_id = $db->lastInsertId();
    
    // Generate fake QR code data
    $qr_data = [
        'donation_id' => $donation_id,
        'transaction_id' => $transaction_id,
        'amount' => $data->amount,
        'campaign_title' => $campaign['title'],
        'donor_name' => $is_anonymous ? 'Anonymous' : $donor_name,
        'timestamp' => time(),
        'type' => 'simulated'
    ];
    
    // Generate SVG QR code
    $qr_image = generateFakeQRCode($qr_data);
    
    // Update donation with QR code
    $update_query = "UPDATE donations SET qr_code_image = :qr_image WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':qr_image', $qr_image);
    $update_stmt->bindParam(':id', $donation_id);
    $update_stmt->execute();
    
    // Return success response
    echo json_encode([
        'success' => true,
        'qr_code_image' => $qr_image,
        'qr_data' => $qr_data,
        'transaction_id' => $transaction_id,
        'donation_id' => $donation_id,
        'amount' => $data->amount,
        'campaign_title' => $campaign['title'],
        'donor_name' => $is_anonymous ? 'Anonymous' : $donor_name,
        'donor_email' => $is_anonymous ? '' : $donor_email,
        'is_anonymous' => $is_anonymous,
        'message' => 'Simulated QR code generated successfully'
    ]);
    
} catch (Exception $e) {
    error_log('QR Generation Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to generate QR code: ' . $e->getMessage()
    ]);
}

function generateFakeQRCode($data) {
    $svg_width = 200;
    $svg_height = 200;
    
    // Create SVG QR code
    $svg = '<?xml version="1.0" encoding="UTF-8"?>';
    $svg .= '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
    $svg .= '<svg width="' . $svg_width . '" height="' . $svg_height . '" xmlns="http://www.w3.org/2000/svg">';
    
    // Background
    $svg .= '<rect width="100%" height="100%" fill="#f8f9fa"/>';
    
    // QR code border
    $svg .= '<rect x="10" y="10" width="180" height="180" fill="#ffffff" stroke="#4e73df" stroke-width="2"/>';
    
    // Fake QR pattern
    $svg .= '<rect x="30" y="30" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="60" y="30" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="90" y="30" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="120" y="30" width="15" height="15" fill="#000000"/>';
    
    $svg .= '<rect x="30" y="60" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="90" y="60" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="150" y="60" width="15" height="15" fill="#000000"/>';
    
    $svg .= '<rect x="30" y="90" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="60" y="90" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="120" y="90" width="15" height="15" fill="#000000"/>';
    
    $svg .= '<rect x="30" y="120" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="90" y="120" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="150" y="120" width="15" height="15" fill="#000000"/>';
    
    $svg .= '<rect x="60" y="150" width="15" height="15" fill="#000000"/>';
    $svg .= '<rect x="120" y="150" width="15" height="15" fill="#000000"/>';
    
    // Text - show amount
    $svg .= '<text x="100" y="180" text-anchor="middle" font-family="Arial" font-size="10" fill="#666666">';
    $svg .= htmlspecialchars(substr($data['donor_name'], 0, 12));
    $svg .= '</text>';
    $svg .= '<text x="100" y="190" text-anchor="middle" font-family="Arial" font-size="8" fill="#999999">';
    $svg .= 'RM ' . number_format($data['amount'], 2);
    $svg .= '</text>';
    
    $svg .= '</svg>';
    
    // Encode as data URL
    return 'data:image/svg+xml;base64,' . base64_encode($svg);
}
?>