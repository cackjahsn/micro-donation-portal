<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../models/User.php';

$database = new Database();
$db = $database->getConnection();

$user = new User($db);

// Get posted data
$data = json_decode(file_get_contents("php://input"));

// Validate input
if(!empty($data->email) && !empty($data->password)) {
    $user->email = $data->email;
    $user_password = $data->password;
    
    // Check if email exists
    if($user->emailExists()) {
        // Check account status
        if($user->status != 'active') {
            http_response_code(403);
            echo json_encode(array(
                "success" => false,
                "message" => "Account is " . $user->status
            ));
            exit;
        }
        
        // Verify password
        if($user->verifyPassword($user_password)) {
            // Get user data
            $user_data = $user->getUserInfo();
            
            // Generate token
            $token = bin2hex(random_bytes(32));
            
            http_response_code(200);
            echo json_encode(array(
                "success" => true,
                "message" => "Login successful",
                "token" => $token,
                "user" => $user_data
            ));
        } else {
            http_response_code(401);
            echo json_encode(array(
                "success" => false,
                "message" => "Incorrect password"
            ));
        }
    } else {
        http_response_code(404);
        echo json_encode(array(
            "success" => false,
            "message" => "User not found"
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Email and password required"
    ));
}
?>