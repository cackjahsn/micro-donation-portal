<?php
// login.php - WITH DATABASE TOKEN STORAGE

ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_clean();

try {
    $configPath = dirname(__FILE__) . '/../../config/database.php';
    if (!file_exists($configPath)) {
        throw new Exception("Config file not found");
    }
    require_once $configPath;
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Get POST data
    $input = file_get_contents('php://input');
    if (empty($input)) {
        throw new Exception('No input data received');
    }
    
    $data = json_decode($input, true);
    if (!$data || !isset($data['email']) || !isset($data['password'])) {
        throw new Exception('Invalid login data');
    }
    
    $email = trim($data['email']);
    $password = trim($data['password']);
    
    // Accept test credentials (bypass password check for demo)
    if ($email === 'admin@communitygive.com') {
        $user = [
            'id' => 1,
            'email' => 'admin@communitygive.com',
            'name' => 'System Admin',
            'role' => 'admin',
            'avatar' => 'assets/images/default-avatar.png'
        ];
    } elseif ($email === 'testuser@example.com') {
        $user = [
            'id' => 2,
            'email' => 'testuser@example.com',
            'name' => 'Test User',
            'role' => 'user',
            'avatar' => 'assets/images/default-avatar.png'
        ];
    } else {
        // Database lookup for other users (including password verification)
        $query = "SELECT id, email, name, role, avatar, password FROM users WHERE email = :email AND status = 'active'";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        $dbUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$dbUser) {
            throw new Exception('User not found');
        }
        
        // Verify password (assuming passwords are hashed)
        if (!password_verify($password, $dbUser['password'])) {
            throw new Exception('Invalid password');
        }
        
        $user = [
            'id' => $dbUser['id'],
            'email' => $dbUser['email'],
            'name' => $dbUser['name'],
            'role' => $dbUser['role'],
            'avatar' => $dbUser['avatar'] ?: 'assets/images/default-avatar.png'
        ];
    }
    
    // Generate a secure random token
    $raw_token = bin2hex(random_bytes(32));
    $token = 'token_' . $raw_token;
    $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
    
    // Store token in database
    $insert_token = "INSERT INTO user_tokens (user_id, token, expires_at) VALUES (:user_id, :token, :expires)";
    $stmt_token = $db->prepare($insert_token);
    $stmt_token->bindParam(':user_id', $user['id']);
    $stmt_token->bindParam(':token', $raw_token); // store without prefix
    $stmt_token->bindParam(':expires', $expires);
    $stmt_token->execute();
    
    // Start session for future requests
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $user['role'];
    
    // Clear output buffer
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    echo json_encode([
        'success' => true,
        'user' => $user,
        'token' => $token, // send with 'token_' prefix for frontend
        'message' => 'Login successful'
    ]);
    
    exit();
    
} catch (Exception $e) {
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Login failed: ' . $e->getMessage()
    ]);
    exit();
}
?>