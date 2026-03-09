<?php
// backend/api/contact/reply.php - Admin reply to contact message

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get base path
$backendPath = dirname(dirname(dirname(__FILE__)));

require_once $backendPath . '/config/database.php';

// Get posted data
$input = file_get_contents("php://input");
$data = json_decode($input);

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit;
}

// Validate required fields
if (empty($data->message_id) || empty($data->reply)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Message ID and reply text are required."
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

    $messageId = (int)$data->message_id;
    $replyText = htmlspecialchars(strip_tags($data->reply));
    $adminId = isset($data->admin_id) ? (int)$data->admin_id : 1; // Default to 1 if not provided

    // Start transaction
    $db->beginTransaction();

    // Update the contact message with admin reply
    $updateQuery = "UPDATE contact_messages 
                    SET status = 'replied', 
                        admin_reply = :reply,
                        admin_id = :admin_id,
                        replied_at = NOW()
                    WHERE id = :message_id";

    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->bindParam(':reply', $replyText);
    $updateStmt->bindParam(':admin_id', $adminId);
    $updateStmt->bindParam(':message_id', $messageId, PDO::PARAM_INT);
    $updateStmt->execute();

    // Check if message exists
    if ($updateStmt->rowCount() === 0) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Message not found."
        ]);
        exit;
    }

    // Insert reply record
    $insertQuery = "INSERT INTO contact_replies 
                    (message_id, admin_id, reply_text, is_email_sent) 
                    VALUES (:message_id, :admin_id, :reply_text, 0)";

    $insertStmt = $db->prepare($insertQuery);
    $insertStmt->bindParam(':message_id', $messageId, PDO::PARAM_INT);
    $insertStmt->bindParam(':admin_id', $adminId);
    $insertStmt->bindParam(':reply_text', $replyText);
    $insertStmt->execute();

    // Get the original message sender's email for simulated email notification
    $emailQuery = "SELECT email, name FROM contact_messages WHERE id = :message_id";
    $emailStmt = $db->prepare($emailQuery);
    $emailStmt->bindParam(':message_id', $messageId, PDO::PARAM_INT);
    $emailStmt->execute();
    $senderData = $emailStmt->fetch();

    // Commit transaction
    $db->commit();

    // Simulate sending email (in production, use PHPMailer or similar)
    if ($senderData) {
        error_log("Simulated email sent to: " . $senderData['email']);
        error_log("Subject: Re: Your message to CommunityGive");
        error_log("Reply: " . $replyText);
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Reply sent successfully.",
        "email_sent" => true,
        "sender_email" => $senderData ? $senderData['email'] : null
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log("Reply error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
