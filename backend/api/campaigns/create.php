<?php
// create.php - FIXED VERSION

require_once dirname(dirname(__FILE__)) . '/config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$basePath = dirname(dirname(dirname(__FILE__)));
require_once $basePath . '/backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

// Set auto-commit to true
$db->setAttribute(PDO::ATTR_AUTOCOMMIT, true);

$data = json_decode(file_get_contents("php://input"));

// Validate required fields
if (!isset($data->title) || !isset($data->description) || 
    !isset($data->category) || !isset($data->target)) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields'
    ]);
    exit;
}

try {
    // Insert campaign
    $query = "INSERT INTO campaigns 
              (title, description, category, target_amount, current_amount, 
               progress_percentage, donors_count, days_left, organizer, 
               image_url, start_date, end_date, status, created_at) 
              VALUES 
              (:title, :description, :category, :target_amount, 0, 
               0, 0, :days_left, :organizer, :image_url, 
               NOW(), DATE_ADD(NOW(), INTERVAL :days_left DAY), 'pending', NOW())";
    
    $stmt = $db->prepare($query);
    
    $days_left = isset($data->days_left) ? $data->days_left : 30;
    $organizer = isset($data->organizer) ? $data->organizer : 'Anonymous';
    $image_url = isset($data->image_url) ? $data->image_url : 
                 '/micro-donation-portal/assets/images/default-campaign.jpg';
    
    $stmt->bindParam(':title', $data->title);
    $stmt->bindParam(':description', $data->description);
    $stmt->bindParam(':category', $data->category);
    $stmt->bindParam(':target_amount', $data->target);
    $stmt->bindParam(':days_left', $days_left);
    $stmt->bindParam(':organizer', $organizer);
    $stmt->bindParam(':image_url', $image_url);
    
    if ($stmt->execute()) {
        $campaign_id = $db->lastInsertId();
        
        // Get the created campaign
        $query = "SELECT * FROM campaigns WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $campaign_id);
        $stmt->execute();
        $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
    
        echo json_encode([
            'success' => true,
            'campaign' => $campaign,
            'message' => 'Campaign submitted successfully. Waiting for admin approval.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to create campaign'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>