<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-User-Role');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once dirname(__FILE__) . '/../../config/database.php';

// Get authorization headers
 $headers = getallheaders();
 $token = null;
if (isset($headers['Authorization'])) {
    $token = str_replace('Bearer ', '', $headers['Authorization']);
}

// Get user info from headers
 $user_id = isset($headers['X-User-ID']) ? $headers['X-User-ID'] : null;
 $user_role = isset($headers['X-User-Role']) ? $headers['X-User-Role'] : null;

// Verify admin access
if (!$token || !$user_id || $user_role !== 'admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Access denied. Admin privileges required.'
    ]);
    exit;
}

 $database = new Database();
 $db = $database->getConnection();

try {
    // Get form data
    $title = isset($_POST['title']) ? trim($_POST['title']) : '';
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';
    $category = isset($_POST['category']) ? trim($_POST['category']) : '';
    $goal_amount = isset($_POST['goal_amount']) ? floatval($_POST['goal_amount']) : 0;
    $end_date = isset($_POST['end_date']) ? trim($_POST['end_date']) : null;
    $organizer = isset($_POST['organizer']) ? trim($_POST['organizer']) : 'CommunityGive';
    $featured = isset($_POST['featured']) ? 1 : 0;
    
    // Validate required fields
    if (empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Campaign title is required']);
        exit;
    }
    
    if (empty($description)) {
        echo json_encode(['success' => false, 'message' => 'Campaign description is required']);
        exit;
    }
    
    if (empty($category)) {
        echo json_encode(['success' => false, 'message' => 'Campaign category is required']);
        exit;
    }
    
    if ($goal_amount <= 0) {
        echo json_encode(['success' => false, 'message' => 'Valid goal amount is required']);
        exit;
    }
    
    if (empty($end_date)) {
        echo json_encode(['success' => false, 'message' => 'End date is required']);
        exit;
    }
    
    // Initialize image_url
    $image_url = 'assets/images/default-campaign.jpg'; // Default fallback
    
    // Handle image upload
    if (isset($_FILES['campaign_image']) && $_FILES['campaign_image']['error'] === UPLOAD_ERR_OK) {
        
        // FIX: Calculate path to project root
        // This script is at: backend/api/campaigns/create.php
        // We need to go up 4 levels to reach the project root:
        // 1. campaigns -> 2. api -> 3. backend -> 4. root
        $project_root = dirname(dirname(dirname(dirname(__FILE__))));
        
        // Target directory: micro-donation-portal/uploads/campaigns/
        $upload_dir = $project_root . '/uploads/campaigns/';
        
        // Create directory if it doesn't exist
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        
        // Get file info
        $file_tmp = $_FILES['campaign_image']['tmp_name'];
        $file_name = $_FILES['campaign_image']['name'];
        $file_extension = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        
        // Generate unique filename
        $new_file_name = 'campaign_' . time() . '_' . uniqid() . '.' . $file_extension;
        $target_file = $upload_dir . $new_file_name;
        
        // Allowed types
        $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        // Validate file type
        if (in_array($file_extension, $allowed_types)) {
            // Move uploaded file
            if (move_uploaded_file($file_tmp, $target_file)) {
                // Save the relative path for database (accessible from web root)
                $image_url = 'uploads/campaigns/' . $new_file_name;
            } else {
                // Log error if move fails (permissions issue usually)
                error_log("Failed to move uploaded file to: " . $target_file);
            }
        }
    }
    
    // Calculate days left
    $today = new DateTime();
    $end = new DateTime($end_date);
    $days_left = $today->diff($end)->days;
    
    // Set start date to today
    $start_date = date('Y-m-d');
    
    // Insert campaign
    $query = "INSERT INTO campaigns (
                title, description, category, target_amount, 
                current_amount, progress_percentage, donors_count, days_left, 
                image_url, organizer, start_date, end_date, 
                featured, status, created_at, updated_at
              ) VALUES (
                :title, :description, :category, :target_amount,
                0.00, 0.00, 0, :days_left,
                :image_url, :organizer, :start_date, :end_date,
                :featured, 'active', NOW(), NOW()
              )";
    
    $stmt = $db->prepare($query);
    
    // Bind parameters
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':target_amount', $goal_amount);
    $stmt->bindParam(':days_left', $days_left, PDO::PARAM_INT);
    $stmt->bindParam(':image_url', $image_url);
    $stmt->bindParam(':organizer', $organizer);
    $stmt->bindParam(':start_date', $start_date);
    $stmt->bindParam(':end_date', $end_date);
    $stmt->bindParam(':featured', $featured, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        $campaign_id = $db->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Campaign created successfully',
            'campaign_id' => $campaign_id,
            'image_url' => $image_url // Return the path to verify
        ]);
    } else {
        throw new Exception('Failed to create campaign');
    }
    
} catch (Exception $e) {
    error_log('Campaign creation error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>