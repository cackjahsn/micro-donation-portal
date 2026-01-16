<?php
// Enable ALL error reporting at the VERY TOP
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Set headers BEFORE any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Get database connection - USE PATH 2
    $configPath = dirname(__FILE__) . '/../../config/database.php';
    
    if (!file_exists($configPath)) {
        throw new Exception("Database config not found at: " . $configPath);
    }
    
    require_once $configPath;
    
    $database = new Database();
    $db = $database->getConnection();
    
    // IMPORTANT: Set PDO to auto-commit mode
    $db->setAttribute(PDO::ATTR_AUTOCOMMIT, true);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
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
            'target_amount' => (float)$campaign['target_amount'],
            'image_url' => $campaign['image_url'] ?: '/micro-donation-portal/assets/images/default-campaign.jpg',
            'organizer' => $campaign['organizer'],
            'created_at' => $campaign['created_at'],
            'status' => $campaign['status']
        ];
    }
    
    $response = [
        'success' => true,
        'campaigns' => $formatted,
        'count' => count($formatted),
        'message' => count($formatted) . ' pending campaigns found'
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    $errorResponse = [
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'campaigns' => []
    ];
    
    http_response_code(500);
    echo json_encode($errorResponse, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $errorResponse = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'campaigns' => []
    ];
    
    http_response_code(500);
    echo json_encode($errorResponse, JSON_PRETTY_PRINT);
}
?>