<?php
// save-donations.php - Updated for your actual database schema
require_once dirname(__FILE__) . '/../../config/database.php';

// Set headers FIRST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the raw POST data
$input = file_get_contents('php://input');
if (empty($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit;
}

// Decode JSON data
$data = json_decode($input, true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit;
}

// Debug logging
error_log("Save donation request received: " . print_r($data, true));

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Check Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    $token = null;
    
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        error_log("Token received: " . substr($token, 0, 20) . "...");
    }
    
    // Start session
    session_start();
    
    // Get user ID from session or token
    $user_id = $_SESSION['user_id'] ?? null;
    
    // If no session, try to extract from token
    if (!$user_id && $token) {
        // Simple token parsing - adjust based on your token format
        if (preg_match('/token_(\d+)_/', $token, $matches)) {
            $user_id = $matches[1];
        } elseif (strpos($token, 'token_') === 0) {
            // Try to get user from database using token
            $token_query = "SELECT id FROM users WHERE verification_token = :token";
            $token_stmt = $db->prepare($token_query);
            $token_stmt->bindParam(':token', $token);
            $token_stmt->execute();
            
            if ($token_user = $token_stmt->fetch(PDO::FETCH_ASSOC)) {
                $user_id = $token_user['id'];
            }
        }
    }
    
    error_log("User ID determined: " . ($user_id ?: 'NULL'));
    
    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    // Validate required fields
    $required = ['campaignId', 'amount'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
            exit;
        }
    }
    
    // Prepare donation data based on ACTUAL database schema
    $campaign_id = intval($data['campaignId']);
    $amount = floatval($data['amount']);
    $payment_method = $data['paymentMethod'] ?? 'qr';
    $donor_name = $data['donorName'] ?? $data['donor_name'] ?? '';
    $donor_email = $data['donorEmail'] ?? $data['donor_email'] ?? '';
    $donor_phone = $data['donorPhone'] ?? $data['donor_phone'] ?? '';
    
    // Use correct column name: is_anonymous (not anonymous)
    $is_anonymous = isset($data['anonymous']) ? ($data['anonymous'] ? 1 : 0) : 
                   (isset($data['is_anonymous']) ? ($data['is_anonymous'] ? 1 : 0) : 0);
    
    // Note: cover_fees column doesn't exist in your schema, so skip it
    
    // Generate transaction ID
    $transaction_id = 'DON-' . time() . '-' . rand(1000, 9999);
    
    // Insert donation using ACTUAL column names from your schema
    $query = "INSERT INTO donations (
                user_id, 
                campaign_id, 
                amount, 
                payment_method,
                transaction_id,
                status,
                donor_name,
                donor_email,
                donor_phone,
                is_anonymous,
                created_at
              ) VALUES (
                :user_id,
                :campaign_id,
                :amount,
                :payment_method,
                :transaction_id,
                'pending',
                :donor_name,
                :donor_email,
                :donor_phone,
                :is_anonymous,
                NOW()
              )";
    
    $stmt = $db->prepare($query);
    
    $result = $stmt->execute([
        ':user_id' => $user_id,
        ':campaign_id' => $campaign_id,
        ':amount' => $amount,
        ':payment_method' => $payment_method,
        ':transaction_id' => $transaction_id,
        ':donor_name' => $donor_name,
        ':donor_email' => $donor_email,
        ':donor_phone' => $donor_phone,
        ':is_anonymous' => $is_anonymous
    ]);
    
    if (!$result) {
        $error_info = $stmt->errorInfo();
        error_log("Database error: " . print_r($error_info, true));
        
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Database error: ' . ($error_info[2] ?? 'Unknown error')
        ]);
        exit;
    }
    
    $donation_id = $db->lastInsertId();
    
    error_log("Donation saved successfully: ID $donation_id");
    
    // Return success response
    echo json_encode([
        'success' => true,
        'donationId' => $donation_id,
        'transactionId' => $transaction_id,
        'message' => 'Donation saved successfully'
    ]);
    
} catch (Exception $e) {
    error_log("Exception in save-donations.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>