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
    
    // Get parameters with defaults
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $exclude_cancelled = isset($_GET['exclude_cancelled']) ? filter_var($_GET['exclude_cancelled'], FILTER_VALIDATE_BOOLEAN) : false;
    $only_active = isset($_GET['only_active']) ? filter_var($_GET['only_active'], FILTER_VALIDATE_BOOLEAN) : false;
    
    // Build base query
    $query = "SELECT * FROM campaigns WHERE 1=1";
    $params = [];
    
    // Apply status filter if specified
    if ($status !== null) {
        $query .= " AND status = :status";
        $params[':status'] = $status;
    }
    
    // Exclude cancelled campaigns if requested
    if ($exclude_cancelled) {
        $query .= " AND status != 'cancelled'";
    }
    
    // Only show active campaigns if requested (for frontend)
    if ($only_active) {
        $query .= " AND status = 'active'";
    }
    
    // Apply sorting
    $query .= " ORDER BY created_at DESC";
    
    // Apply limit if specified
    if ($limit > 0) {
        $query .= " LIMIT :limit";
        $params[':limit'] = $limit;
    }
    
    $stmt = $db->prepare($query);
    
    // Bind parameters
    foreach ($params as $key => $value) {
        if ($key === ':limit') {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
    }
    
    $stmt->execute();
    
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate statistics for active campaigns
    $statsStmt = $db->prepare("
        SELECT 
            COUNT(*) as total_active,
            SUM(current_amount) as total_funded,
            SUM(target_amount) as total_target
        FROM campaigns 
        WHERE status = 'active'
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // Always return an array, even if empty
    $formatted = [];
    foreach ($campaigns as $campaign) {
        // With this ALWAYS recalculation:
    $progress_percentage = 0;
    if ($campaign['target_amount'] > 0) {
        $progress_percentage = ($campaign['current_amount'] / $campaign['target_amount']) * 100;
    }
    // Round it
    $progress_percentage = round($progress_percentage, 1);
        
        // Calculate days left if not set
        $days_left = (int)$campaign['days_left'];
        if ($campaign['end_date'] && !$days_left) {
            $end_date = new DateTime($campaign['end_date']);
            $today = new DateTime();
            $interval = $today->diff($end_date);
            $days_left = $interval->days;
            if ($interval->invert) {
                $days_left = 0; // Campaign has ended
            }
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
            'days_left' => $days_left,
            
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
        'stats' => [
            'total_active' => (int)($stats['total_active'] ?? 0),
            'total_funded' => (float)($stats['total_funded'] ?? 0),
            'total_target' => (float)($stats['total_target'] ?? 0)
        ],
        'message' => count($formatted) . ' campaigns found',
        'filters' => [
            'status' => $status,
            'exclude_cancelled' => $exclude_cancelled,
            'only_active' => $only_active,
            'limit' => $limit > 0 ? $limit : 'none'
        ],
        'debug' => [
            'query_used' => $query,
            'params' => $params
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