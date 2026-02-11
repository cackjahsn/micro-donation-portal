<?php
// remove-image.php - Remove campaign image endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once dirname(__FILE__) . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Get authorization headers
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$token = null;

if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $token = $matches[1];
}

try {
    // Verify admin authorization
    $isAdmin = false;
    
    if ($token) {
        $token_query = "SELECT role FROM users WHERE verification_token = :token";
        $token_stmt = $db->prepare($token_query);
        $token_stmt->bindParam(':token', $token);
        $token_stmt->execute();
        
        if ($user = $token_stmt->fetch(PDO::FETCH_ASSOC)) {
            $isAdmin = ($user['role'] === 'admin');
        }
    }
    
    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Access denied. Admin privileges required.'
        ]);
        exit;
    }
    
    // Get POST data
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->campaign_id)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Campaign ID is required'
        ]);
        exit;
    }
    
    $campaign_id = intval($data->campaign_id);
    
    // Get current image
    $query = "SELECT image_url FROM campaigns WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    $stmt->execute();
    $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$campaign) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Campaign not found'
        ]);
        exit;
    }
    
    // Delete image file if it exists and is not default
    if ($campaign['image_url'] && 
        $campaign['image_url'] !== 'assets/images/default-campaign.jpg' &&
        file_exists(dirname(__FILE__) . '/../../../' . $campaign['image_url'])) {
        unlink(dirname(__FILE__) . '/../../../' . $campaign['image_url']);
    }
    
    // Update database to remove image
    $update = "UPDATE campaigns 
               SET image_url = 'assets/images/default-campaign.jpg',
                   updated_at = NOW()
               WHERE id = :id";
    
    $update_stmt = $db->prepare($update);
    $update_stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    $update_stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Campaign image removed successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Remove Image Error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to remove image: ' . $e->getMessage()
    ]);
}
?>