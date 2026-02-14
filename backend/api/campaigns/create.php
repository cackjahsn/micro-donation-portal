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
        echo json_encode([
            'success' => false,
            'message' => 'Campaign title is required'
        ]);
        exit;
    }
    
    if (empty($description)) {
        echo json_encode([
            'success' => false,
            'message' => 'Campaign description is required'
        ]);
        exit;
    }
    
    if (empty($category)) {
        echo json_encode([
            'success' => false,
            'message' => 'Campaign category is required'
        ]);
        exit;
    }
    
    if ($goal_amount <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Valid goal amount is required'
        ]);
        exit;
    }
    
    if (empty($end_date)) {
        echo json_encode([
            'success' => false,
            'message' => 'End date is required'
        ]);
        exit;
    }
    
    // Initialize image_url as null
    $image_url = null;
    $file_name = null; // FIX: Initialize variable
    
    // Handle image upload
    if (isset($_FILES['campaign_image']) && $_FILES['campaign_image']['error'] === UPLOAD_ERR_OK) {
        // FIX: Use uploads directory instead of assets/images/campaigns/
        $upload_dir = dirname(dirname(dirname(__FILE__))) . '/uploads/campaigns/';
        
        // Create directory if it doesn't exist
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        
        $file_extension = pathinfo($_FILES['campaign_image']['name'], PATHINFO_EXTENSION);
        $file_name = 'campaign_' . time() . '_' . uniqid() . '.' . $file_extension; // FIX: Define $file_name
        $target_file = $upload_dir . $file_name;
        
        $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp']; // FIX: Added webp, removed svg
        if (in_array(strtolower($file_extension), $allowed_types)) {
            if (move_uploaded_file($_FILES['campaign_image']['tmp_name'], $target_file)) {
                // FIX: Use uploads path, not assets path
                $image_url = 'uploads/campaigns/' . $file_name;
            }
        }
    } else {
        // No image uploaded, use default
        $image_url = 'assets/images/default-campaign.jpg';
    }
    
    // Calculate days left
    $today = new DateTime();
    $end = new DateTime($end_date);
    $days_left = $today->diff($end)->days;
    
    // Set start date to today
    $start_date = date('Y-m-d');
    
    // Insert campaign - MATCHING YOUR EXACT TABLE COLUMNS
    $query = "INSERT INTO campaigns (
                title,
                description,
                category,
                target_amount,
                current_amount,
                progress_percentage,
                donors_count,
                days_left,
                image_url,
                organizer,
                start_date,
                end_date,
                featured,
                status,
                created_at,
                updated_at
              ) VALUES (
                :title,
                :description,
                :category,
                :target_amount,
                0.00,
                0.00,
                0,
                :days_left,
                :image_url,
                :organizer,
                :start_date,
                :end_date,
                :featured,
                'active',
                NOW(),
                NOW()
              )";
    
    $stmt = $db->prepare($query);
    
    // Bind all parameters
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
            'image_url' => $image_url
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