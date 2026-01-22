<?php
// register.php - Corrected paths
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get the correct base path
// register.php is in: backend/api/auth/
// We need to go up 3 levels: backend/api/auth -> backend/api -> backend
$backendPath = dirname(dirname(dirname(__FILE__))); // This gives us: C:\xampp\htdocs\micro-donation-portal\backend

// Debug output
error_log("Backend Path: " . $backendPath);

// Correct paths based on your structure:
// database.php is at: backend/config/database.php (relative to backendPath)
$databaseFile = $backendPath . '/config/database.php';

// User.php is at: backend/models/User.php (relative to backendPath)
$userFile = $backendPath . '/models/User.php';

error_log("Database file path: " . $databaseFile);
error_log("User file path: " . $userFile);

// Check if files exist
if (!file_exists($databaseFile)) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Database config file not found at: " . $databaseFile,
        "backend_path" => $backendPath,
        "debug_info" => [
            "current_file" => __FILE__,
            "levels_up" => "3 (from backend/api/auth to backend)",
            "calculated_path" => $databaseFile
        ]
    ));
    exit;
}

if (!file_exists($userFile)) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "User model file not found at: " . $userFile
    ));
    exit;
}

// Include required files
require_once $databaseFile;
require_once $userFile;

// Get posted data
$input = file_get_contents("php://input");

// Log the raw input for debugging
error_log("Registration input: " . $input);

$data = json_decode($input);

// If JSON decode fails, try to get form data
if (!$data && $_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("JSON decode failed, trying form data");
    $data = (object) [
        'name' => $_POST['name'] ?? '',
        'email' => $_POST['email'] ?? '',
        'password' => $_POST['password'] ?? '',
        'role' => $_POST['role'] ?? 'user'
    ];
}

// Log received data for debugging
error_log("Decoded data: " . print_r($data, true));

// Validate input
if(!$data) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "No data received. Please check your request format.",
        "raw_input" => $input
    ));
    exit;
}

if(
    !empty($data->email) &&
    !empty($data->password) &&
    !empty($data->name)
) {
    try {
        // Create database connection
        $database = new Database();
        $db = $database->getConnection();
        
        // Check if connection is valid
        if (!$db) {
            throw new Exception("Database connection failed");
        }
        
        // Log successful connection
        error_log("Database connection successful");
        
        $user = new User($db);
        
        $user->email = $data->email;
        $user->password = $data->password;
        $user->name = $data->name;
        $user->role = !empty($data->role) ? $data->role : 'user';
        
        // Log user data (without password)
        error_log("Attempting to register user: " . $user->email . ", Name: " . $user->name);
        
        // Check if email already exists
        if($user->emailExists()) {
            error_log("Email already exists: " . $user->email);
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "Email already registered"
            ));
            exit;
        }
        
        // Create the user
        if($user->register()) {
            // Get user data without password
            $user_data = $user->getUserInfo();
            
            // Generate token
            $token = bin2hex(random_bytes(32));
            
            error_log("Registration successful for: " . $user->email);
            
            http_response_code(201);
            echo json_encode(array(
                "success" => true,
                "message" => "User registered successfully",
                "token" => $token,
                "user" => $user_data
            ));
        } else {
            error_log("Registration failed for: " . $user->email);
            http_response_code(503);
            echo json_encode(array(
                "success" => false,
                "message" => "Unable to register user. Database error."
            ));
        }
    } catch (Exception $e) {
        error_log("Registration error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array(
            "success" => false,
            "message" => "Registration error: " . $e->getMessage()
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Incomplete data. Please provide email, password, and name.",
        "received" => $data
    ));
}
?>