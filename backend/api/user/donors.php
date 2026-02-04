<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once dirname(__FILE__) . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Get donors (users who have made donations)
    $query = "SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                u.total_donated,
                u.donation_count,
                u.last_donation_date as last_donation,
                u.status,
                u.city,
                u.state
              FROM users u
              WHERE u.total_donated > 0 OR u.id IN (SELECT DISTINCT user_id FROM donations)
              ORDER BY u.total_donated DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $donors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get donor statistics
    $statsQuery = "SELECT 
                     COUNT(DISTINCT d.user_id) as total_donors,
                     COALESCE(SUM(d.amount), 0) as total_donated,
                     AVG(d.amount) as avg_donation
                   FROM donations d
                   WHERE d.status = 'completed'";
    
    $statsStmt = $db->prepare($statsQuery);
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get recurring donors count (donated more than once)
    $recurringQuery = "SELECT COUNT(*) as recurring_donors
                       FROM (
                           SELECT user_id 
                           FROM donations 
                           WHERE user_id > 0 
                           GROUP BY user_id 
                           HAVING COUNT(*) > 1
                       ) as recurring";
    
    $recurringStmt = $db->prepare($recurringQuery);
    $recurringStmt->execute();
    $recurringStats = $recurringStmt->fetch(PDO::FETCH_ASSOC);
    
    $stats['recurring_donors'] = $recurringStats['recurring_donors'] || 0;
    
    echo json_encode([
        'success' => true,
        'donors' => $donors,
        'stats' => $stats,
        'count' => count($donors),
        'message' => 'Donors loaded successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Donors API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load donors: ' . $e->getMessage(),
        'donors' => []
    ]);
}
?>