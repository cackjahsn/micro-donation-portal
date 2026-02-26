<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With, X-User-ID, X-User-Role');

require_once '../../config/database.php';

$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
$adminId = isset($headers['X-User-ID']) ? $headers['X-User-ID'] : null;
$userRole = isset($headers['X-User-Role']) ? $headers['X-User-Role'] : null;

if (!$token || !$adminId || $userRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. Admin privileges required.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$userIdToDelete = isset($data['user_id']) ? intval($data['user_id']) : 0;

if (!$userIdToDelete) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

// Prevent admin from deleting themselves
if ($userIdToDelete == $adminId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'You cannot delete your own account']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    // Check if user exists
    $checkStmt = $db->prepare("SELECT id FROM users WHERE id = :id");
    $checkStmt->bindParam(':id', $userIdToDelete, PDO::PARAM_INT);
    $checkStmt->execute();
    
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    
    // Delete user (cascades to donations and tokens due to foreign keys)
    $deleteStmt = $db->prepare("DELETE FROM users WHERE id = :id");
    $deleteStmt->bindParam(':id', $userIdToDelete, PDO::PARAM_INT);
    
    if ($deleteStmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        throw new Exception('Failed to delete user');
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>