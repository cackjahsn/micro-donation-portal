<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With, X-User-ID, X-User-Role');

require_once '../../config/database.php';

// Get token and user info from headers
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
$userId = isset($headers['X-User-ID']) ? $headers['X-User-ID'] : null;
$userRole = isset($headers['X-User-Role']) ? $headers['X-User-Role'] : null;

// Verify admin access
if (!$token || !$userId || $userRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. Admin privileges required.']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    // Fetch all users, exclude password
    $query = "SELECT 
                id, email, name, role, avatar, 
                date_joined, total_donated, last_donation_date, donation_count, 
                status, created_at, updated_at 
              FROM users 
              ORDER BY id DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate stats for the admin dashboard
    $total = count($users);
    $active = count(array_filter($users, fn($u) => $u['status'] === 'active'));
    $admins = count(array_filter($users, fn($u) => $u['role'] === 'admin'));
    
    $thirtyDaysAgo = date('Y-m-d H:i:s', strtotime('-30 days'));
    $new = count(array_filter($users, fn($u) => $u['created_at'] >= $thirtyDaysAgo));
    
    echo json_encode([
        'success' => true,
        'users' => $users,
        'stats' => [
            'total' => $total,
            'active' => $active,
            'admins' => $admins,
            'new' => $new
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>