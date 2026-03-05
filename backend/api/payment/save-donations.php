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
    
    // --- SECURE AUTHENTICATION ---
    // Get Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = null;

    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = trim($matches[1]);
        // Remove 'token_' prefix if present
        if (strpos($token, 'token_') === 0) {
            $token = substr($token, 6);
        }
        error_log("Token received for authentication");
    }

    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No authentication token provided']);
        exit;
    }

    // Validate token against database
    $user_id = null;
    $token_query = "SELECT ut.user_id, u.email, u.name, u.role
                    FROM user_tokens ut
                    JOIN users u ON ut.user_id = u.id
                    WHERE ut.token = :token AND ut.expires_at > NOW()";
    $token_stmt = $db->prepare($token_query);
    $token_stmt->bindParam(':token', $token);
    $token_stmt->execute();
    $token_data = $token_stmt->fetch(PDO::FETCH_ASSOC);

    if ($token_data) {
        $user_id = (int)$token_data['user_id'];
        $user = [
            'id' => $user_id,
            'email' => $token_data['email'],
            'name' => $token_data['name'],
            'role' => $token_data['role']
        ];
        error_log("Token authenticated user ID: " . $user_id);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit;
    }
    
    // --- GET AND VALIDATE REQUEST DATA ---
    // Read raw JSON input (frontend sends application/json)
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Log for debugging (remove in production)
    error_log("Raw input: " . $input);
    error_log("Decoded data: " . print_r($data, true));
    
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