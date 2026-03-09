<?php
// backend/api/contact/get-messages.php - Get all contact messages (admin only)

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

// Get query parameters
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
$status = isset($_GET['status']) ? $_GET['status'] : '';
$category = isset($_GET['category']) ? $_GET['category'] : '';
$search = isset($_GET['search']) ? $_GET['search'] : '';

try {
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    // Build query
    $query = "SELECT cm.*, 
              u.name as admin_name 
              FROM contact_messages cm
              LEFT JOIN users u ON cm.admin_id = u.id
              WHERE 1=1";

    $params = [];

    // Filter by status
    if (!empty($status)) {
        $query .= " AND cm.status = :status";
        $params[':status'] = $status;
    }

    // Filter by category
    if (!empty($category)) {
        $query .= " AND cm.category = :category";
        $params[':category'] = $category;
    }

    // Search in name, email, subject, message
    if (!empty($search)) {
        $searchTerm = "%$search%";
        $query .= " AND (cm.name LIKE :search_name OR cm.email LIKE :search_email OR cm.subject LIKE :search_subject OR cm.message LIKE :search_message)";
        $params[':search_name'] = $searchTerm;
        $params[':search_email'] = $searchTerm;
        $params[':search_subject'] = $searchTerm;
        $params[':search_message'] = $searchTerm;
    }

    $query .= " ORDER BY cm.created_at DESC";

    // Add LIMIT and OFFSET directly (cannot be bound as named parameters in PDO)
    $query .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;

    $stmt = $db->prepare($query);

    // Bind parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }

    $stmt->execute();
    $messages = $stmt->fetchAll();

    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM contact_messages WHERE 1=1";
    if (!empty($status)) {
        $countQuery .= " AND status = :status";
    }
    if (!empty($category)) {
        $countQuery .= " AND category = :category";
    }
    if (!empty($search)) {
        $searchTerm = "%$search%";
        $countQuery .= " AND (name LIKE :search_name OR email LIKE :search_email OR subject LIKE :search_subject OR message LIKE :search_message)";
    }

    $countStmt = $db->prepare($countQuery);
    if (!empty($status)) {
        $countStmt->bindValue(':status', $status);
    }
    if (!empty($category)) {
        $countStmt->bindValue(':category', $category);
    }
    if (!empty($search)) {
        $searchTerm = "%$search%";
        $countStmt->bindValue(':search_name', $searchTerm);
        $countStmt->bindValue(':search_email', $searchTerm);
        $countStmt->bindValue(':search_subject', $searchTerm);
        $countStmt->bindValue(':search_message', $searchTerm);
    }
    $countStmt->execute();
    $total = $countStmt->fetch()['total'];

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "messages" => $messages,
        "total" => $total,
        "limit" => $limit,
        "offset" => $offset
    ]);

} catch (Exception $e) {
    error_log("Get contact messages error: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
