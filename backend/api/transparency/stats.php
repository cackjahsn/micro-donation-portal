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
    // --- Total donations (sum of all completed payments) ---
    $query = "SELECT COALESCE(SUM(amount), 0) as total_donations 
              FROM donations 
              WHERE status = 'completed'";
    $stmt = $db->query($query);
    $total_donations = $stmt->fetch(PDO::FETCH_ASSOC)['total_donations'];

    // --- Total donors (unique donor emails) ---
    $query = "SELECT COUNT(DISTINCT donor_email) as total_donors 
              FROM donations 
              WHERE status = 'completed' AND donor_email IS NOT NULL AND donor_email != ''";
    $stmt = $db->query($query);
    $total_donors = $stmt->fetch(PDO::FETCH_ASSOC)['total_donors'];

    // --- Campaigns funded (campaigns with at least one completed donation) ---
    $query = "SELECT COUNT(DISTINCT campaign_id) as campaigns_funded 
              FROM donations 
              WHERE status = 'completed'";
    $stmt = $db->query($query);
    $campaigns_funded = $stmt->fetch(PDO::FETCH_ASSOC)['campaigns_funded'];

    // --- Platform fee (hardcoded – adjust if you have a dynamic setting) ---
    $platform_fee = 2.5;

    // --- Recent donations (latest 5 completed, with campaign title) ---
    $query = "SELECT d.id, d.amount, d.status, d.created_at, 
                     d.donor_name, d.donor_email, d.is_anonymous,
                     c.title as campaign_title
              FROM donations d
              LEFT JOIN campaigns c ON d.campaign_id = c.id
              WHERE d.status = 'completed'
              ORDER BY d.created_at DESC
              LIMIT 5";
    $stmt = $db->query($query);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $recent_donations = [];
    foreach ($rows as $row) {
        // Determine donor display name
        if ($row['is_anonymous'] == 1) {
            $donor_name = 'Anonymous';
        } else {
            $donor_name = $row['donor_name'] ?? $row['donor_email'] ?? 'Anonymous';
        }

        $recent_donations[] = [
            'date' => $row['created_at'],
            'donor_name' => $donor_name,
            'campaign_title' => $row['campaign_title'] ?? 'Unknown Campaign',
            'amount' => floatval($row['amount']),
            'status' => $row['status'],
            'receipt_id' => $row['id']   // using donation ID as receipt identifier
        ];
    }

    // Return all stats
    echo json_encode([
        'success' => true,
        'total_donations' => floatval($total_donations),
        'total_donors' => intval($total_donors),
        'campaigns_funded' => intval($campaigns_funded),
        'platform_fee' => $platform_fee,
        'recent_donations' => $recent_donations
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>