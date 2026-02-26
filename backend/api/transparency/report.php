<?php
// Enable error display for debugging (remove in production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Start output buffering to catch any unexpected output
ob_start();

try {
    // Include database config
    $configPath = dirname(__FILE__) . '/../../config/database.php';
    if (!file_exists($configPath)) {
        throw new Exception("Database config not found at: " . $configPath);
    }
    require_once $configPath;

    $type = $_GET['type'] ?? 'monthly';

    $database = new Database();
    $db = $database->getConnection();

    // Fetch stats
    $query = "SELECT COALESCE(SUM(amount), 0) as total_donations FROM donations WHERE status = 'completed'";
    $stmt = $db->query($query);
    $total_donations = $stmt->fetch(PDO::FETCH_ASSOC)['total_donations'];

    $query = "SELECT COUNT(DISTINCT donor_email) as total_donors FROM donations WHERE status = 'completed'";
    $stmt = $db->query($query);
    $total_donors = $stmt->fetch(PDO::FETCH_ASSOC)['total_donors'];

    $query = "SELECT COUNT(DISTINCT campaign_id) as campaigns_funded FROM donations WHERE status = 'completed'";
    $stmt = $db->query($query);
    $campaigns_funded = $stmt->fetch(PDO::FETCH_ASSOC)['campaigns_funded'];

    // Recent donations
    $query = "SELECT d.*, c.title as campaign_title FROM donations d 
              LEFT JOIN campaigns c ON d.campaign_id = c.id 
              WHERE d.status = 'completed' 
              ORDER BY d.created_at DESC LIMIT 10";
    $stmt = $db->query($query);
    $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $platform_fee = 2.5;

    // Clear output buffer and send HTML
    ob_end_clean();
    header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>CommunityGive – <?php echo ucfirst($type); ?> Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #4e73df; }
        .stats { display: flex; justify-content: space-between; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; flex: 1; margin: 0 10px; }
        .stat-number { font-size: 2em; font-weight: bold; color: #4e73df; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4e73df; color: white; }
        .footer { margin-top: 30px; font-size: 0.9em; color: #666; text-align: center; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom:20px;">
        <button onclick="window.print()">Print / Save as PDF</button>
        <button onclick="window.close()">Close</button>
    </div>

    <h1>CommunityGive – <?php echo ucfirst($type); ?> Report</h1>
    <p>Generated on <?php echo date('F j, Y'); ?></p>

    <div class="stats">
        <div class="stat-card">
            <div>Total Donations</div>
            <div class="stat-number">RM <?php echo number_format($total_donations, 2); ?></div>
        </div>
        <div class="stat-card">
            <div>Total Donors</div>
            <div class="stat-number"><?php echo $total_donors; ?></div>
        </div>
        <div class="stat-card">
            <div>Campaigns Funded</div>
            <div class="stat-number"><?php echo $campaigns_funded; ?></div>
        </div>
        <div class="stat-card">
            <div>Platform Fee</div>
            <div class="stat-number"><?php echo $platform_fee; ?>%</div>
        </div>
    </div>

    <h3>Recent Donations (last 10)</h3>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Donor</th>
                <th>Campaign</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($recent as $d): ?>
            <tr>
                <td><?php echo date('Y-m-d', strtotime($d['created_at'])); ?></td>
                <td><?php echo $d['is_anonymous'] ? 'Anonymous' : ($d['donor_name'] ?? 'Anonymous'); ?></td>
                <td><?php echo htmlspecialchars($d['campaign_title'] ?? 'Unknown'); ?></td>
                <td>RM <?php echo number_format($d['amount'], 2); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <div class="footer">
        <p>This report is generated automatically from the CommunityGive database. For verification, contact support.</p>
    </div>
</body>
</html>
<?php
} catch (Exception $e) {
    ob_end_clean();
    header('Content-Type: text/plain');
    echo "Error: " . $e->getMessage();
}
?>