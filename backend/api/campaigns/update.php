<?php
// update.php - Update campaign endpoint
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

try {
    // Verify admin authorization
    $isAdmin = false;
    
    // Check via token/session
    if ($token) {
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
    
    // Get form data
    $campaign_id = isset($_POST['campaign_id']) ? intval($_POST['campaign_id']) : 0;
    $title = $_POST['title'] ?? '';
    $category = $_POST['category'] ?? '';
    $description = $_POST['description'] ?? '';
    $goal_amount = isset($_POST['goal_amount']) ? floatval($_POST['goal_amount']) : 0;
    $end_date = $_POST['end_date'] ?? null;  // Changed from deadline
    $status = $_POST['status'] ?? 'active';
    $organizer = $_POST['organizer'] ?? '';
    $featured = isset($_POST['featured']) ? 1 : 0;
    
    if (!$campaign_id || !$title || !$category || !$description || $goal_amount <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields'
        ]);
        exit;
    }
    
    // Check if campaign exists
    $check_query = "SELECT id, image_url FROM campaigns WHERE id = :id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    $check_stmt->execute();
    $existing = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Campaign not found'
        ]);
        exit;
    }
    
    // Handle image upload
    $image_url = $existing['image_url'];
    if (isset($_FILES['campaign_image']) && $_FILES['campaign_image']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = dirname(__FILE__) . '/../../../uploads/campaigns/';
        
        // Create directory if it doesn't exist
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        
        $file_extension = pathinfo($_FILES['campaign_image']['name'], PATHINFO_EXTENSION);
        $file_name = 'campaign_' . $campaign_id . '_' . time() . '.' . $file_extension;
        $target_path = $upload_dir . $file_name;
        
        // Validate file type
        $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array(strtolower($file_extension), $allowed_types)) {
            throw new Exception('Invalid file type. Only JPG, PNG, GIF, WebP allowed.');
        }
        
        // Validate file size (5MB max)
        if ($_FILES['campaign_image']['size'] > 5 * 1024 * 1024) {
            throw new Exception('File too large. Maximum size is 5MB.');
        }
        
        if (move_uploaded_file($_FILES['campaign_image']['tmp_name'], $target_path)) {
            // Delete old image if it exists and is not the default
            if ($existing['image_url'] && 
                $existing['image_url'] !== 'assets/images/default-campaign.jpg' && 
                file_exists(dirname(__FILE__) . '/../../../' . $existing['image_url'])) {
                unlink(dirname(__FILE__) . '/../../../' . $existing['image_url']);
            }
            
            $image_url = 'uploads/campaigns/' . $file_name;
        }
    }
    
    // UPDATED: Remove comments from SQL, add updated_by
    $update_query = "UPDATE campaigns 
                     SET title = :title,
                         category = :category,
                         description = :description,
                         target_amount = :target_amount,
                         end_date = :end_date,
                         status = :status,
                         organizer = :organizer,
                         featured = :featured,
                         image_url = :image_url,
                         updated_by = :updated_by,
                         updated_at = NOW()
                     WHERE id = :id";
    
    $stmt = $db->prepare($update_query);
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':target_amount', $goal_amount);
    $stmt->bindParam(':end_date', $end_date);
    $stmt->bindParam(':status', $status);
    $stmt->bindParam(':organizer', $organizer);
    $stmt->bindParam(':featured', $featured, PDO::PARAM_INT);
    $stmt->bindParam(':image_url', $image_url);
    $stmt->bindParam(':updated_by', $userId, PDO::PARAM_INT);
    $stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to update campaign');
    }
    
    // Fetch updated campaign with creator info
    $select_query = "SELECT c.*, u.name as creator_name 
                     FROM campaigns c
                     LEFT JOIN users u ON c.created_by = u.id
                     WHERE c.id = :id";
    $select_stmt = $db->prepare($select_query);
    $select_stmt->bindParam(':id', $campaign_id, PDO::PARAM_INT);
    $select_stmt->execute();
    $updated_campaign = $select_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate days left for the response
    if ($updated_campaign['end_date']) {
        $endDate = new DateTime($updated_campaign['end_date']);
        $today = new DateTime();
        $interval = $today->diff($endDate);
        $updated_campaign['days_left'] = $endDate > $today ? $interval->days : 0;
    } else {
        $updated_campaign['days_left'] = 0;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Campaign updated successfully',
        'campaign' => $updated_campaign
    ]);
    
} catch (Exception $e) {
    error_log('Update Campaign Error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update campaign: ' . $e->getMessage()
    ]);
}
?>