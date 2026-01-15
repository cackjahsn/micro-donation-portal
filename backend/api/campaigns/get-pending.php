<?php
require_once dirname(dirname(__FILE__)) . '/config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get database connection
$basePath = dirname(dirname(dirname(__FILE__)));
require_once $basePath . '/backend/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // IMPORTANT: Set auto-commit
    $db->setAttribute(PDO::ATTR_AUTOCOMMIT, true);
    
    // Get ALL campaigns including pending
    $query = "SELECT * FROM campaigns WHERE status = 'pending' ORDER BY created_at DESC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $formatted = [];
    foreach ($campaigns as $campaign) {
        $formatted[] = [
            'id' => (int)$campaign['id'],
            'title' => $campaign['title'],
            'description' => $campaign['description'],
            'category' => $campaign['category'],
            'target' => (float)$campaign['target_amount'],
            'raised' => (float)$campaign['current_amount'],
            'progress' => (float)$campaign['progress_percentage'],
            'donors' => (int)$campaign['donors_count'],
            'daysLeft' => (int)$campaign['days_left'],
            'image' => $campaign['image_url'] ?: 'assets/images/default-campaign.jpg',
            'organizer' => $campaign['organizer'],
            'dateCreated' => $campaign['created_at'],
            'featured' => (bool)$campaign['featured'],
            'status' => $campaign['status']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'campaigns' => $formatted,
        'count' => count($formatted),
        'message' => count($formatted) . ' pending campaigns found'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'campaigns' => []
    ]);
}
?>