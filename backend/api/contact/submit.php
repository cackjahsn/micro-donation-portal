<?php
// backend/api/contact/submit.php - Submit contact form message

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get base path (go up 3 levels from backend/api/contact to backend)
$backendPath = dirname(dirname(dirname(__FILE__)));

require_once $backendPath . '/config/database.php';

// Get posted data
$input = file_get_contents("php://input");
$data = json_decode($input);

// If JSON decode fails, try to get form data
if (!$data && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = (object) [
        'name' => $_POST['name'] ?? '',
        'email' => $_POST['email'] ?? '',
        'subject' => $_POST['subject'] ?? '',
        'message' => $_POST['message'] ?? '',
        'category' => $_POST['category'] ?? ''
    ];
}

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
if (
    empty($data->name) ||
    empty($data->email) ||
    empty($data->subject) ||
    empty($data->message) ||
    empty($data->category)
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "All fields are required."
    ]);
    exit;
}

// Validate email format
if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid email format."
    ]);
    exit;
}

// Validate category
$validCategories = ['general', 'technical', 'donation', 'campaign', 'feedback'];
if (!in_array($data->category, $validCategories)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid category."
    ]);
    exit;
}

// Validate message length
if (strlen($data->message) < 10) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Message must be at least 10 characters long."
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

    // Sanitize inputs
    $name = htmlspecialchars(strip_tags($data->name));
    $email = filter_var($data->email, FILTER_SANITIZE_EMAIL);
    $subject = htmlspecialchars(strip_tags($data->subject));
    $message = htmlspecialchars(strip_tags($data->message));
    $category = $data->category;

    // Insert message into database
    $query = "INSERT INTO contact_messages 
              (name, email, subject, message, category, status) 
              VALUES (:name, :email, :subject, :message, :category, 'pending')";

    $stmt = $db->prepare($query);

    // Bind parameters
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':subject', $subject);
    $stmt->bindParam(':message', $message);
    $stmt->bindParam(':category', $category);

    // Execute query
    if ($stmt->execute()) {
        $messageId = $db->lastInsertId();

        // Log the submission (in production, you would send an email to admin here)
        error_log("New contact message received - ID: $messageId, From: $email, Category: $category");

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Thank you! Your message has been sent successfully. We will review it and get back to you soon.",
            "message_id" => $messageId
        ]);
    } else {
        http_response_code(503);
        echo json_encode([
            "success" => false,
            "message" => "Unable to send message. Please try again later."
        ]);
    }

} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
