<?php
// backend/api/contact/get-user-messages.php - Get contact messages for logged-in user

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get base path
$backendPath = dirname(dirname(dirname(__FILE__)));

require_once $backendPath . '/config/database.php';

// Check if request method is GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use GET."
    ]);
    exit;
}

// Get user ID from query parameter
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Valid user ID is required."
    ]);
    exit;
}

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    // Get user's email from users table
    $userQuery = "SELECT email FROM users WHERE id = :user_id";
    $userStmt = $db->prepare($userQuery);
    $userStmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $userStmt->execute();
    $userData = $userStmt->fetch();

    if (!$userData) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "User not found."
        ]);
        exit;
    }

    // Get all messages sent from this user's email
    $query = "SELECT cm.*,
              (SELECT COUNT(*) FROM contact_replies cr WHERE cr.message_id = cm.id) as reply_count
              FROM contact_messages cm
              WHERE cm.email = :email
              ORDER BY cm.created_at DESC
              LIMIT 50";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':email', $userData['email']);
    $stmt->execute();
    $messages = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "messages" => $messages,
        "count" => count($messages)
    ]);

} catch (Exception $e) {
    error_log("Get user messages error: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
