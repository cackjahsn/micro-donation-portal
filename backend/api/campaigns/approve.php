<?php
// Add error reporting at the TOP
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// FIX THE PATH HERE:
$configPath = dirname(__FILE__) . '/../../config/database.php';
require_once $configPath;

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || !isset($data->action)) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

try {
    $status = $data->action === 'approve' ? 'active' : 'cancelled';
    
    $query = "UPDATE campaigns SET status = :status, updated_at = NOW() WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':status', $status);
    $stmt->bindParam(':id', $data->id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Campaign ' . ($data->action === 'approve' ? 'approved' : 'rejected')
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Update failed']);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>