<?php
// create.php - ADMIN ONLY VERSION

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Start session
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-User-Role');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Debug logging
error_log("=== CAMPAIGN CREATION REQUEST ===");
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("POST data: " . print_r($_POST, true));
error_log("FILES data: " . print_r($_FILES, true));

// Simple admin check
$isAdmin = false;
$userId = null;
$userName = null;

// Check session
if (isset($_SESSION['user_id']) && isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') {
    $isAdmin = true;
    $userId = $_SESSION['user_id'];
    $userName = $_SESSION['user_name'] ?? 'Admin';
    error_log("Admin access via session: User ID " . $_SESSION['user_id']);
}

// Check headers
if (!$isAdmin && isset($_SERVER['HTTP_X_USER_ID']) && isset($_SERVER['HTTP_X_USER_ROLE'])) {
    if ($_SERVER['HTTP_X_USER_ROLE'] === 'admin') {
        $isAdmin = true;
        $userId = $_SERVER['HTTP_X_USER_ID'];
        $userName = $_SERVER['HTTP_X_USER_NAME'] ?? 'Admin';
        error_log("Admin access via headers: User ID " . $_SERVER['HTTP_X_USER_ID']);
    }
}

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Only administrators can create campaigns'
    ]);
    exit;
}

// Database connection
$configPath = dirname(dirname(dirname(__FILE__))) . '/config/database.php';
require_once $configPath;

try {
    $database = new Database();
    $db = $database->getConnection();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get form data
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $category = $_POST['category'] ?? '';
    $target_amount = $_POST['goal_amount'] ?? 0;
    $organizer = $_POST['organizer'] ?? 'CommunityGive Admin';  // Changed from organization
    $end_date = $_POST['end_date'] ?? '';  // Changed from deadline
    $featured = isset($_POST['featured']) ? 1 : 0;
    
    // Log received data
    error_log("Form data received:");
    error_log("  Title: $title");
    error_log("  Category: $category");
    error_log("  Target: $target_amount");
    error_log("  Organizer: $organizer");
    error_log("  End Date: $end_date");
    error_log("  Featured: $featured");
    error_log("  Created By ID: $userId");
    error_log("  Created By Name: $userName");
    
    // Validate required fields
    if (empty($title) || empty($description) || empty($category) || empty($target_amount) || empty($end_date)) {
        throw new Exception('Missing required fields: Title, Description, Category, Target Amount, and End Date are required');
    }
    
    // Sanitize input
    $title = htmlspecialchars(trim($title), ENT_QUOTES, 'UTF-8');
    $description = htmlspecialchars(trim($description), ENT_QUOTES, 'UTF-8');
    $category = htmlspecialchars(trim($category), ENT_QUOTES, 'UTF-8');
    $target_amount = filter_var($target_amount, FILTER_VALIDATE_FLOAT);
    $organizer = htmlspecialchars(trim($organizer), ENT_QUOTES, 'UTF-8');
    
    if ($target_amount === false || $target_amount <= 0) {
        throw new Exception('Target amount must be a positive number');
    }
    
    // Validate end date is in the future
    if (!empty($end_date)) {
        $endDateObj = new DateTime($end_date);
        $today = new DateTime();
        $today->setTime(0, 0, 0); // Set to midnight for comparison
        
        if ($endDateObj < $today) {
            throw new Exception('End date must be in the future');
        }
    }
    
    // Handle file upload - SIMPLIFIED VERSION
    $image_url = 'assets/images/default-campaign.jpg';
    
    if (isset($_FILES['campaign_image']) && $_FILES['campaign_image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['campaign_image'];
        
        // Create upload directory structure
        $uploadBaseDir = dirname(dirname(dirname(dirname(__FILE__)))) . '/assets/';
        $uploadDir = $uploadBaseDir . 'images/campaigns/';
        
        // Create directories if they don't exist
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Validate file
        $maxFileSize = 5 * 1024 * 1024; // 5MB
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        
        // Check file size
        if ($file['size'] > $maxFileSize) {
            throw new Exception('File size exceeds 5MB limit');
        }
        
        // Check MIME type
        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!in_array($fileExtension, $allowedExtensions)) {
            throw new Exception('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
        }
        
        // Generate unique filename
        $fileName = 'campaign_' . time() . '_' . uniqid() . '.' . $fileExtension;
        $uploadPath = $uploadDir . $fileName;
        
        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
            $image_url = 'assets/images/campaigns/' . $fileName;
            error_log("Image uploaded successfully: " . $image_url);
        } else {
            throw new Exception('Failed to move uploaded file. Check server permissions.');
        }
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    // UPDATED INSERT QUERY - using correct column names
    $query = "INSERT INTO campaigns (
        title, 
        description, 
        category, 
        target_amount, 
        current_amount,
        progress_percentage,
        donors_count,
        end_date,           // Correct column name
        image_url,
        organizer,
        featured,
        status,
        created_by,
        created_by_name,    // New field
        updated_by,
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
        :end_date,          // Correct column name
        :image_url,
        :organizer,
        :featured,
        'active',
        :created_by,
        :created_by_name,   // New field
        :updated_by,        // Set updated_by
        NOW(),
        NOW()
    )";
    
    error_log("SQL Query: " . $query);
    
    $stmt = $db->prepare($query);
    
    // Bind parameters
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':target_amount', $target_amount);
    $stmt->bindParam(':end_date', $end_date);  // Changed from deadline
    $stmt->bindParam(':image_url', $image_url);
    $stmt->bindParam(':organizer', $organizer);
    $stmt->bindParam(':featured', $featured, PDO::PARAM_INT);
    $stmt->bindParam(':created_by', $userId, PDO::PARAM_INT);
    $stmt->bindParam(':created_by_name', $userName);
    $stmt->bindParam(':updated_by', $userId, PDO::PARAM_INT);
    
    error_log("Binding parameters:");
    error_log("  title: $title");
    error_log("  category: $category");
    error_log("  target_amount: $target_amount");
    error_log("  end_date: $end_date");
    error_log("  image_url: $image_url");
    error_log("  organizer: $organizer");
    error_log("  featured: $featured");
    error_log("  created_by: $userId");
    error_log("  created_by_name: $userName");
    error_log("  updated_by: $userId");
    
    if ($stmt->execute()) {
        $campaign_id = $db->lastInsertId();
        
        // Commit transaction
        $db->commit();
        
        error_log("Campaign created successfully! ID: $campaign_id");
        
        // Get the created campaign with creator info
        $query = "SELECT c.*, u.name as creator_name 
                  FROM campaigns c
                  LEFT JOIN users u ON c.created_by = u.id
                  WHERE c.id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $campaign_id);
        $stmt->execute();
        $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update campaigns.json
        updateCampaignsJSON($db);
        
        echo json_encode([
            'success' => true,
            'campaign_id' => $campaign_id,
            'campaign' => $campaign,
            'message' => 'Campaign created successfully!',
            'image_url' => $image_url
        ]);
        
    } else {
        $db->rollBack();
        throw new Exception('Failed to execute database query');
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
    
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

// Helper function to update campaigns.json
function updateCampaignsJSON($db) {
    try {
        $query = "SELECT * FROM campaigns WHERE status = 'active' ORDER BY created_at DESC";
        $stmt = $db->query($query);
        $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedCampaigns = [];
        foreach ($campaigns as $campaign) {
            // Calculate days left from end_date
            $daysLeft = 0;
            if ($campaign['end_date']) {
                $endDate = new DateTime($campaign['end_date']);
                $today = new DateTime();
                $interval = $today->diff($endDate);
                $daysLeft = $interval->days;
                if ($endDate < $today) {
                    $daysLeft = 0;
                }
            }
            
            $formattedCampaigns[] = [
                'id' => $campaign['id'],
                'title' => $campaign['title'],
                'description' => $campaign['description'],
                'category' => $campaign['category'],
                'target_amount' => floatval($campaign['target_amount']),
                'current_amount' => floatval($campaign['current_amount']),
                'progress_percentage' => floatval($campaign['progress_percentage']),
                'donors_count' => intval($campaign['donors_count']),
                'days_left' => $daysLeft,  // Calculated from end_date
                'organizer' => $campaign['organizer'],
                'image_url' => $campaign['image_url'],
                'status' => $campaign['status'],
                'featured' => (bool)$campaign['featured'],
                'end_date' => $campaign['end_date'],
                'created_by_name' => $campaign['created_by_name']
            ];
        }
        
        $jsonPath = dirname(dirname(dirname(dirname(__FILE__)))) . '/data/campaigns.json';
        $jsonDir = dirname($jsonPath);
        if (!file_exists($jsonDir)) {
            mkdir($jsonDir, 0755, true);
        }
        file_put_contents($jsonPath, json_encode($formattedCampaigns, JSON_PRETTY_PRINT));
        
    } catch (Exception $e) {
        error_log("Error updating campaigns.json: " . $e->getMessage());
    }
}
?>