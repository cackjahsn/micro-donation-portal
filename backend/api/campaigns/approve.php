<?php
require_once dirname(dirname(__FILE__)) . '/config/database.php';
header('Content-Type: application/json');
$basePath = dirname(dirname(dirname(__FILE__)));
require_once $basePath . '/backend/config/database.php';

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