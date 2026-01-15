<?php
require_once dirname(dirname(__FILE__)) . '/config/database.php';
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$basePath = dirname(dirname(dirname(__FILE__)));
require_once $basePath . '/backend/config/database.php';
include_once dirname(dirname(dirname(__FILE__))) . '/models/User.php';

$database = new Database();
$db = $database->getConnection();

$user = new User($db);

// Get user ID from query parameter
$user_id = isset($_GET['id']) ? $_GET['id'] : null;

if($user_id) {
    // Get user data
    $user_data = $user->getUserById($user_id);
    
    if($user_data) {
        // Count user donations
        $query = "SELECT COUNT(DISTINCT campaign_id) as campaign_count 
                  FROM donations 
                  WHERE user_id = :user_id AND status = 'completed'";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        $campaign_count = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $user_data['campaigns_supported'] = $campaign_count['campaign_count'] ?? 0;
        
        http_response_code(200);
        echo json_encode(array(
            "success" => true,
            "user" => $user_data
        ));
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
        "message" => "User ID required"
    ));
}
?>