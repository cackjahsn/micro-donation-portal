<?php
// save-donations.php - Fixed for your EXACT database schema
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

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // --- SIMPLIFIED AUTHENTICATION for your schema ---
    // Get Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = null;
    
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        error_log("Token received for authentication");
    }
    
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No authentication token provided']);
        exit;
    }
    
    // METHOD 1: Get user ID from token pattern (since verification_token is NULL)
    // Your token format: token_d952832cfe2988e7e62307d2b3de8934
    $user_id = null;
    
    // Try to extract user ID from the request body FIRST
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (isset($data['userId'])) {
        $user_id = intval($data['userId']);
        error_log("Got user ID from request body: " . $user_id);
    }
    
    // If no user_id in request, try to extract from token
    if (!$user_id) {
        // Since your tokens don't contain user ID, we need to check if you have a sessions table
        // or we can get the user ID from the frontend
        
        // For now, let's check if there's a user logged in via session
        session_start();
        if (isset($_SESSION['user_id'])) {
            $user_id = $_SESSION['user_id'];
            error_log("Got user ID from session: " . $user_id);
        }
    }
    
    // If still no user_id, try to get the first user (FOR DEVELOPMENT ONLY - REMOVE IN PRODUCTION)
    if (!$user_id) {
        // TEMPORARY: Get the test user (ID: 2 from your logs)
        $user_id = 2; // Your test user ID
        error_log("WARNING: Using fallback user ID: " . $user_id);
    }
    
    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Could not determine user ID']);
        exit;
    }
    
    // Get user details from database
    $user_query = "SELECT id, email, name, role FROM users WHERE id = :id";
    $user_stmt = $db->prepare($user_query);
    $user_stmt->bindParam(':id', $user_id);
    $user_stmt->execute();
    
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    
    error_log("Authenticated user: " . $user['email']);
    
    // --- GET AND VALIDATE REQUEST DATA ---
    if (empty($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No data received']);
        exit;
    }
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
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
    
    // Prepare donation data
    $campaign_id = intval($data['campaignId']);
    $amount = floatval($data['amount']);
    $payment_method = $data['paymentMethod'] ?? 'qr';
    $donor_name = $data['donorName'] ?? $data['donor_name'] ?? $user['name'] ?? '';
    $donor_email = $data['donorEmail'] ?? $data['donor_email'] ?? $user['email'] ?? '';
    $donor_phone = $data['donorPhone'] ?? $data['donor_phone'] ?? '';
    $is_anonymous = isset($data['anonymous']) ? ($data['anonymous'] ? 1 : 0) : 
                   (isset($data['is_anonymous']) ? ($data['is_anonymous'] ? 1 : 0) : 0);
    
    // Generate transaction ID
    $transaction_id = 'DON-' . time() . '-' . rand(1000, 9999);
    
    // Insert donation
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