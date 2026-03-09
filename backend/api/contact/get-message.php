<?php
// backend/api/contact/get-message.php - Get single contact message by ID

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

// Get message ID from query parameter
$messageId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($messageId <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Valid message ID is required."
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

    // Get message details
    $query = "SELECT cm.*, 
              u.name as admin_name,
              u.email as admin_email
              FROM contact_messages cm
              LEFT JOIN users u ON cm.admin_id = u.id
              WHERE cm.id = :message_id";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':message_id', $messageId, PDO::PARAM_INT);
    $stmt->execute();

    $message = $stmt->fetch();

    if (!$message) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Message not found."
        ]);
        exit;
    }

    // Get reply history
    $replyQuery = "SELECT cr.*, u.name as admin_name 
                   FROM contact_replies cr
                   LEFT JOIN users u ON cr.admin_id = u.id
                   WHERE cr.message_id = :message_id
                   ORDER BY cr.created_at DESC";

    $replyStmt = $db->prepare($replyQuery);
    $replyStmt->bindParam(':message_id', $messageId, PDO::PARAM_INT);
    $replyStmt->execute();
    $replies = $replyStmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => $message,
        "replies" => $replies
    ]);

} catch (Exception $e) {
    error_log("Get message error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
