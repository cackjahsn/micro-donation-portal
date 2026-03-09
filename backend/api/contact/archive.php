<?php
// backend/api/contact/archive.php - Archive a contact message (admin only)

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit;
}

// Get posted data
$input = file_get_contents("php://input");
$data = json_decode($input);

// Validate required fields
if (empty($data->message_id)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Message ID is required."
    ]);
    exit;
}

try {
    // Get base path
    $backendPath = dirname(dirname(dirname(__FILE__)));

    // Include database configuration
    require_once $backendPath . '/config/database.php';

    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    $messageId = (int)$data->message_id;

    // Update the contact message status to archived
    $updateQuery = "UPDATE contact_messages
                    SET status = 'archived'
                    WHERE id = :message_id";

    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindParam(':message_id', $messageId, PDO::PARAM_INT);
    $updateStmt->execute();

    // Check if message exists
    if ($updateStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Message not found or already archived."
        ]);
        exit;
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Message archived successfully."
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }

    error_log("Archive message error: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
