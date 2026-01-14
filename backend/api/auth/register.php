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
if(
    !empty($data->email) &&
    !empty($data->password) &&
    !empty($data->name)
) {
    $user->email = $data->email;
    $user->password = $data->password;
    $user->name = $data->name;
    $user->role = !empty($data->role) ? $data->role : 'user';
    
    // Check if email already exists
    if($user->emailExists()) {
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
        
        http_response_code(201);
        echo json_encode(array(
            "success" => true,
            "message" => "User registered successfully",
            "token" => $token,
            "user" => $user_data
        ));
    } else {
        http_response_code(503);
        echo json_encode(array(
            "success" => false,
            "message" => "Unable to register user"
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Incomplete data. Please provide email, password, and name."
    ));
}
?>