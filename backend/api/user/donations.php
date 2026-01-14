<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;

if($user_id) {
    // Query to get user donations with campaign info
    $query = "SELECT d.*, c.title as campaign_title 
              FROM donations d 
              LEFT JOIN campaigns c ON d.campaign_id = c.id 
              WHERE d.user_id = :user_id 
              ORDER BY d.created_at DESC 
              LIMIT 10";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":user_id", $user_id);
    $stmt->execute();
    
    $donations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // If no donations table exists, return empty array
    if(!$donations) {
        $donations = [];
    }
    
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "count" => count($donations),
        "donations" => $donations
    ));
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "User ID required"
    ));
}
?>