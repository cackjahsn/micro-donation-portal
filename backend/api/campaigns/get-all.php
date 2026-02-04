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
    // CORRECT PATH FOR YOUR STRUCTURE:
    $configPath = dirname(dirname(dirname(__FILE__))) . '/config/database.php';
    
    if (!file_exists($configPath)) {
        throw new Exception("Database config not found at: " . $configPath);
    }
    
    require_once $configPath;
    
    $database = new Database();
    $db = $database->getConnection();
    
    // IMPORTANT: Set PDO to auto-commit mode
    $db->setAttribute(PDO::ATTR_AUTOCOMMIT, true);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get limit parameter if provided (for admin dashboard)
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
    
    // Build query - Admin dashboard needs to see all campaigns regardless of status
    if ($limit > 0) {
        // For admin dashboard widget (recent campaigns)
        $query = "SELECT * FROM campaigns ORDER BY created_at DESC LIMIT :limit";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    } else {
        // For admin campaigns management page (all campaigns)
        $query = "SELECT * FROM campaigns ORDER BY created_at DESC";
        $stmt = $db->prepare($query);
    }
    
    $stmt->execute();
    
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Always return an array, even if empty
    $formatted = [];
    foreach ($campaigns as $campaign) {
        // Calculate progress percentage if it's 0 but we have amounts
        $progress_percentage = (float)$campaign['progress_percentage'];
        if ($progress_percentage == 0 && $campaign['target_amount'] > 0) {
            $progress_percentage = ($campaign['current_amount'] / $campaign['target_amount']) * 100;
        }
        
        $formatted[] = [
            // Basic info
            'id' => (int)$campaign['id'],
            'title' => $campaign['title'],
            'description' => $campaign['description'],
            'category' => $campaign['category'],
            
            // Financial info - using EXACT database column names
            'target_amount' => (float)$campaign['target_amount'],
            'current_amount' => (float)$campaign['current_amount'],
            'progress_percentage' => (float)$progress_percentage,
            
            // Donor info
            'donors_count' => (int)$campaign['donors_count'],
            'days_left' => (int)$campaign['days_left'],
            
            // Media & organizer
            'image_url' => $campaign['image_url'] ?: 'assets/images/default-campaign.jpg',
            'organizer' => $campaign['organizer'],
            'organizer_logo' => $campaign['organizer_logo'],
            
            // Dates - using EXACT database column names
            'start_date' => $campaign['start_date'],
            'end_date' => $campaign['end_date'],
            'created_at' => $campaign['created_at'],
            'updated_at' => $campaign['updated_at'],
            
            // Status & flags
            'featured' => (bool)$campaign['featured'],
            'status' => $campaign['status'],
            
            // User info (if available)
            'created_by' => $campaign['created_by'] ? (int)$campaign['created_by'] : null,
            'updated_by' => $campaign['updated_by'] ? (int)$campaign['updated_by'] : null
        ];
    }
    
    $response = [
        'success' => true,
        'campaigns' => $formatted,
        'count' => count($formatted),
        'message' => count($formatted) . ' campaigns found',
        'debug' => [
            'query_used' => $query,
            'limit_applied' => $limit > 0 ? $limit : 'none'
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    $errorResponse = [
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'campaigns' => [],
        'error_details' => [
            'code' => $e->getCode(),
            'sql_state' => $e->errorInfo[0] ?? '',
            'driver_code' => $e->errorInfo[1] ?? '',
            'driver_message' => $e->errorInfo[2] ?? ''
        ]
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