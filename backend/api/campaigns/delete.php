<?php
// delete.php - Delete campaign endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-User-Role');

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

// Get user role from header
$userRole = $headers['X-User-Role'] ?? '';
$userId = $headers['X-User-ID'] ?? null;

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

try {
    // Verify admin authorization
    $isAdmin = false;
    
    // Check via token/session
    if ($token) {
        // Try to verify token from users table
        $token_query = "SELECT role FROM users WHERE verification_token = :token OR id = :user_id";
        $token_stmt = $db->prepare($token_query);
        $token_stmt->bindParam(':token', $token);
        $token_stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $token_stmt->execute();
        
        if ($user = $token_stmt->fetch(PDO::FETCH_ASSOC)) {
            $isAdmin = ($user['role'] === 'admin');
        }
    }
    
    // Also check header role
    if (!$isAdmin && $userRole === 'admin') {
        $isAdmin = true;
    }
    
    // Start session as fallback
    if (!$isAdmin && session_status() === PHP_SESSION_NONE) {
        session_start();
        $isAdmin = ($_SESSION['user_role'] ?? '') === 'admin' || 
                   ($_SESSION['role'] ?? '') === 'admin';
    }
    
    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Access denied. Admin privileges required.'
        ]);
        exit;
    }
    
    // Start transaction
    $db->beginTransaction();
    
    // First, check if campaign exists
    $check_query = "SELECT id, title FROM campaigns WHERE id = :id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    $check_stmt->execute();
    $campaign = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$campaign) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Campaign not found'
        ]);
        exit;
    }
    
    // NEW: Update campaign with who deleted it before deletion
    $update_query = "UPDATE campaigns 
                     SET updated_by = :updated_by, 
                         updated_at = NOW() 
                     WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':updated_by', $userId, PDO::PARAM_INT);
    $update_stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    $update_stmt->execute();
    
    // Delete related donations first (foreign key constraint)
    $delete_donations = "DELETE FROM donations WHERE campaign_id = :campaign_id";
    $donations_stmt = $db->prepare($delete_donations);
    $donations_stmt->bindParam(':campaign_id', $campaign_id, PDO::PARAM_INT);
    $donations_stmt->execute();
    $deletedDonations = $donations_stmt->rowCount();
    
    // Delete campaign
    $delete_campaign = "DELETE FROM campaigns WHERE id = :id";
    $campaign_stmt = $db->prepare($delete_campaign);
    $campaign_stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    $campaign_stmt->execute();
    
    if ($campaign_stmt->rowCount() === 0) {
        throw new Exception('Failed to delete campaign');
    }
    
    $db->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Campaign deleted successfully',
        'campaign_id' => $campaign_id,
        'campaign_title' => $campaign['title'],
        'deleted_by' => $userId,
        'deleted_donations' => $deletedDonations
    ]);
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log('Delete Campaign Error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete campaign: ' . $e->getMessage()
    ]);
}
?>