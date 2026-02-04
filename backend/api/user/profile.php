<?php
// /backend/api/user/profile.php

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$response = [];

try {
    // Database connection - go up 3 levels from /backend/api/user/profile.php to /backend/config/database.php
    require_once dirname(dirname(dirname(__FILE__))) . '/config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Include User model - CORRECT PATH: go up 2 levels then into models
    // From: /backend/api/user/profile.php
    // To: /backend/models/User.php
    require_once dirname(dirname(dirname(__FILE__))) . '/models/User.php';
    
    $user = new User($db);
    
    // Get user ID from query parameter
    $user_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if(!$user_id || $user_id <= 0) {
        throw new Exception("Valid User ID is required");
    }
    
    // Get user data
    $user_data = $user->getUserById($user_id);
    
    if($user_data) {
        // Add campaigns supported count
        $user_data['campaigns_supported'] = 0;
        
        // Try to get donations count if table exists
        try {
            $checkTable = $db->query("SHOW TABLES LIKE 'donations'");
            if($checkTable && $checkTable->rowCount() > 0) {
                $query = "SELECT COUNT(DISTINCT campaign_id) as campaign_count 
                         FROM donations 
                         WHERE user_id = :user_id AND status = 'completed'";
                $stmt = $db->prepare($query);
                $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
                $stmt->execute();
                $campaign_count = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($campaign_count) {
                    $user_data['campaigns_supported'] = $campaign_count['campaign_count'] ?? 0;
                }
            }
        } catch(Exception $e) {
            // Silently fail
            error_log("Donations count error: " . $e->getMessage());
        }
        
        $response = [
            "success" => true,
            "user" => $user_data,
            "message" => "User profile retrieved successfully"
        ];
    } else {
        $response = [
            "success" => false,
            "message" => "User not found"
        ];
    }
    
} catch(PDOException $e) {
    $response = [
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ];
} catch(Exception $e) {
    $response = [
        "success" => false,
        "message" => $e->getMessage()
    ];
}

// Output JSON
echo json_encode($response, JSON_PRETTY_PRINT);
exit();
?>