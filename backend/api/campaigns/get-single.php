<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// CORRECT PATH FOR YOUR STRUCTURE:
$configPath = dirname(dirname(dirname(__FILE__))) . '/config/database.php';

try {
    if (!file_exists($configPath)) {
        throw new Exception("Database config not found");
    }
    
    require_once $configPath;
    
    $id = isset($_GET['id']) ? $_GET['id'] : null;

    if (!$id) {
        echo json_encode([
            'success' => false,
            'message' => 'Campaign ID is required'
        ]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();
    $db->setAttribute(PDO::ATTR_AUTOCOMMIT, true);
    
    $query = "SELECT * FROM campaigns WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    
    $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($campaign) {
        $formatted = [
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
        
        echo json_encode([
            'success' => true,
            'campaign' => $formatted
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Campaign not found'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>