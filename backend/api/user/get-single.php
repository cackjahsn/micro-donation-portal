<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With, X-User-ID, X-User-Role');

require_once '../../config/database.php';

$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
$userId = isset($headers['X-User-ID']) ? $headers['X-User-ID'] : null;
$userRole = isset($headers['X-User-Role']) ? $headers['X-User-Role'] : null;

if (!$token || !$userId || $userRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. Admin privileges required.']);
    exit;
}

$requestedId = isset($_GET['id']) ? intval($_GET['id']) : 0;
if (!$requestedId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $query = "SELECT 
                id, email, name, role, avatar, 
                date_joined, total_donated, last_donation_date, donation_count, 
                status, created_at, updated_at 
              FROM users 
              WHERE id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $requestedId, PDO::PARAM_INT);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    
    echo json_encode(['success' => true, 'user' => $user]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>