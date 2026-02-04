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

// Check if it's an admin request (all donors) or user-specific request
$is_admin_request = isset($_GET['admin']) && $_GET['admin'] == 'true';

if ($is_admin_request) {
    // Admin request - get all donors
    try {
        $query = "SELECT 
                    DISTINCT donor_email as email,
                    MAX(donor_name) as name,
                    MAX(donor_phone) as phone,
                    SUM(amount) as total_donations,
                    COUNT(*) as donations_count,
                    MAX(created_at) as last_donation,
                    CASE 
                        WHEN COUNT(*) > 3 THEN 'recurring'
                        WHEN MAX(created_at) > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'new'
                        WHEN MAX(created_at) < DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'inactive'
                        ELSE 'active'
                    END as status
                  FROM donations 
                  WHERE donor_email != '' AND donor_name != 'Anonymous'
                  GROUP BY donor_email
                  ORDER BY total_donations DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $donors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formatted_donors = array_map(function($donor) {
            return [
                'id' => crc32($donor['email']),
                'name' => $donor['name'] ?: 'Unknown',
                'email' => $donor['email'],
                'phone' => $donor['phone'] ?: 'Not provided',
                'totalDonations' => floatval($donor['total_donations']),
                'donationsCount' => intval($donor['donations_count']),
                'lastDonation' => $donor['last_donation'],
                'status' => $donor['status']
            ];
        }, $donors);
        
        echo json_encode([
            'success' => true,
            'donors' => $formatted_donors,
            'count' => count($formatted_donors),
            'message' => count($formatted_donors) . ' donors found'
        ]);
        
    } catch (Exception $e) {
        error_log('Admin Donors API Error: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch donors: ' . $e->getMessage(),
            'donors' => []
        ]);
    }
} else {
    // Original user-specific donors logic
    // ... keep existing code here ...
}
?><?php
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
    // Query to get all donors from donations table
    $query = "SELECT 
                DISTINCT donor_email as email,
                MAX(donor_name) as name,
                MAX(donor_phone) as phone,
                SUM(amount) as total_donations,
                COUNT(*) as donations_count,
                MAX(created_at) as last_donation,
                CASE 
                    WHEN COUNT(*) > 3 THEN 'recurring'
                    WHEN MAX(created_at) > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'new'
                    WHEN MAX(created_at) < DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'inactive'
                    ELSE 'active'
                END as status
              FROM donations 
              WHERE donor_email != '' AND donor_name != 'Anonymous'
              GROUP BY donor_email
              ORDER BY total_donations DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $donors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $formatted_donors = array_map(function($donor) {
        return [
            'id' => crc32($donor['email']), // Generate a simple ID
            'name' => $donor['name'] ?: 'Unknown',
            'email' => $donor['email'],
            'phone' => $donor['phone'] ?: 'Not provided',
            'totalDonations' => floatval($donor['total_donations']),
            'donationsCount' => intval($donor['donations_count']),
            'lastDonation' => $donor['last_donation'],
            'status' => $donor['status']
        ];
    }, $donors);
    
    echo json_encode([
        'success' => true,
        'donors' => $formatted_donors,
        'count' => count($formatted_donors),
        'message' => count($formatted_donors) . ' donors found'
    ]);
    
} catch (Exception $e) {
    error_log('Donors API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch donors: ' . $e->getMessage(),
        'donors' => []
    ]);
}
?>