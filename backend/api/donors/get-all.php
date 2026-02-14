<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once dirname(__FILE__) . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Check if it's an admin request (all donors) or user-specific request
    $is_admin_request = isset($_GET['admin']) && $_GET['admin'] == 'true';
    
    if ($is_admin_request) {
        // Admin request - get all donors with their donation statistics
        $query = "SELECT 
                    donor_email as email,
                    MAX(donor_name) as name,
                    MAX(donor_phone) as phone,
                    SUM(amount) as total_donations,
                    COUNT(*) as donations_count,
                    MAX(created_at) as last_donation,
                    CASE 
                        WHEN COUNT(*) > 3 THEN 'recurring'
                        WHEN MAX(created_at) > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'new'
                        WHEN MAX(created_at) > DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'active'
                        ELSE 'inactive'
                    END as status
                  FROM donations 
                  WHERE donor_email IS NOT NULL 
                    AND donor_email != '' 
                    AND donor_name != 'Anonymous'
                    AND status = 'completed'
                  GROUP BY donor_email
                  ORDER BY total_donations DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $donors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the response
        $formatted_donors = array_map(function($donor) {
            // Generate a consistent ID from email
            $id = abs(crc32($donor['email']));
            
            return [
                'id' => $id,
                'name' => $donor['name'] ?: 'Unknown',
                'email' => $donor['email'],
                'phone' => $donor['phone'] ?: 'Not provided',
                'totalDonations' => floatval($donor['total_donations']),
                'donationsCount' => intval($donor['donations_count']),
                'lastDonation' => $donor['last_donation'],
                'status' => $donor['status'] ?: 'active'
            ];
        }, $donors);
        
        // Get statistics
        $stats_query = "SELECT 
                            COUNT(DISTINCT donor_email) as total_donors,
                            COUNT(DISTINCT CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status = 'completed' THEN donor_email END) as active_donors,
                            COUNT(DISTINCT CASE WHEN DATE(created_at) = CURDATE() AND status = 'completed' THEN donor_email END) as new_donors,
                            COALESCE(AVG(amount), 0) as avg_donation
                        FROM donations 
                        WHERE donor_email IS NOT NULL 
                            AND donor_email != '' 
                            AND donor_name != 'Anonymous'
                            AND status = 'completed'";
        
        $stats_stmt = $db->prepare($stats_query);
        $stats_stmt->execute();
        $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'donors' => $formatted_donors,
            'stats' => [
                'total_donors' => intval($stats['total_donors']),
                'active_donors' => intval($stats['active_donors']),
                'new_donors' => intval($stats['new_donors']),
                'avg_donation' => floatval($stats['avg_donation'])
            ],
            'count' => count($formatted_donors),
            'message' => count($formatted_donors) . ' donors found'
        ]);
    } else {
        // Original user-specific donors logic (if any)
        echo json_encode([
            'success' => true,
            'donors' => [],
            'message' => 'User-specific donors endpoint'
        ]);
    }
    
} catch (Exception $e) {
    error_log('Donors API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch donors: ' . $e->getMessage(),
        'donors' => []
    ]);
}
?>