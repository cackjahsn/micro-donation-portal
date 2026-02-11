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
    
    // UPDATED QUERY: Join with users table to get creator name
    $query = "SELECT c.*, 
              u.name as creator_name,
              u.email as creator_email,
              DATEDIFF(c.end_date, CURDATE()) as calculated_days_left
              FROM campaigns c
              LEFT JOIN users u ON c.created_by = u.id
              WHERE c.id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    
    $campaign = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($campaign) {
        // Calculate days left if end_date exists
        $daysLeft = $campaign['calculated_days_left'];
        if ($daysLeft === null || $daysLeft < 0) {
            $daysLeft = 0;
        }
        
        $formatted = [
            'id' => (int)$campaign['id'],
            'title' => $campaign['title'],
            'description' => $campaign['description'],
            'category' => $campaign['category'],
            'target' => (float)$campaign['target_amount'],
            'raised' => (float)$campaign['current_amount'],
            'progress' => (float)$campaign['progress_percentage'],
            'donors' => (int)$campaign['donors_count'],
            'daysLeft' => (int)$daysLeft,  // Use calculated days left
            'end_date' => $campaign['end_date'],  // Added end_date field
            'image' => $campaign['image_url'] ?: 'assets/images/default-campaign.jpg',
            'organizer' => $campaign['organizer'],
            'dateCreated' => $campaign['created_at'],
            'dateUpdated' => $campaign['updated_at'],  // Added updated_at field
            'featured' => (bool)$campaign['featured'],
            'status' => $campaign['status'],
            
            // NEW FIELDS ADDED:
            'created_by' => (int)$campaign['created_by'],  // Creator user ID
            'created_by_name' => $campaign['creator_name'] ?: $campaign['created_by_name'],  // Creator name
            'updated_by' => (int)$campaign['updated_by'],  // Last updated by user ID
            'start_date' => $campaign['start_date'],  // Added start_date field
            'target_amount' => (float)$campaign['target_amount'],  // Alias for target
            'current_amount' => (float)$campaign['current_amount'],  // Alias for raised
            'donors_count' => (int)$campaign['donors_count'],  // Alias for donors
            'image_url' => $campaign['image_url'],  // Original field name
            'progress_percentage' => (float)$campaign['progress_percentage'],  // Original field name
            'created_at' => $campaign['created_at'],  // Original field name
            'updated_at' => $campaign['updated_at']  // Original field name
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