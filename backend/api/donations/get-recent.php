<?php
/**
 * API Endpoint: Get Recent Donations
 * Returns recent completed donations for the live feed
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in output

try {
    // Load database configuration
    require_once dirname(__FILE__) . '/../../config/database.php';
    
    $db = new Database();
    $pdo = $db->getConnection();
    
    // Get query parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : null;
    
    // Build SQL query
    $sql = "
        SELECT 
            d.id,
            d.amount,
            d.payment_date,
            d.created_at,
            d.donor_name,
            d.donor_email,
            d.is_anonymous,
            d.campaign_id,
            c.title as campaign_title,
            u.name as user_name,
            u.email as user_email
        FROM donations d
        LEFT JOIN campaigns c ON d.campaign_id = c.id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.status = 'completed'
    ";
    
    $params = [];
    
    // Filter by campaign if specified
    if ($campaignId) {
        $sql .= " AND d.campaign_id = :campaign_id";
        $params[':campaign_id'] = $campaignId;
    }
    
    $sql .= " ORDER BY d.payment_date DESC LIMIT :limit";
    
    // Prepare statement
    $stmt = $pdo->prepare($sql);
    
    // Bind parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    
    // Execute query
    $stmt->execute();
    $donations = $stmt->fetchAll();
    
    // Format donations for frontend
    $formattedDonations = [];
    foreach ($donations as $donation) {
        // Determine donor name
        if ($donation['is_anonymous']) {
            $displayName = 'Anonymous';
        } elseif (!empty($donation['donor_name'])) {
            $displayName = $donation['donor_name'];
        } elseif (!empty($donation['user_name'])) {
            $displayName = $donation['user_name'];
        } else {
            $displayName = 'A Donor';
        }
        
        // Calculate time ago
        $paymentDate = new DateTime($donation['payment_date']);
        $now = new DateTime();
        $interval = $now->diff($paymentDate);
        
        if ($interval->i < 1 && $interval->h < 1) {
            $timeAgo = 'just now';
        } elseif ($interval->h < 1) {
            $timeAgo = $interval->i . ' min ago';
        } elseif ($interval->h < 24) {
            $timeAgo = $interval->h . ' hour' . ($interval->h > 1 ? 's' : '') . ' ago';
        } elseif ($interval->d < 7) {
            $timeAgo = $interval->d . ' day' . ($interval->d > 1 ? 's' : '') . ' ago';
        } else {
            $timeAgo = $paymentDate->format('M j');
        }
        
        $formattedDonations[] = [
            'id' => (int)$donation['id'],
            'amount' => (float)$donation['amount'],
            'donor_name' => $displayName,
            'is_anonymous' => (bool)$donation['is_anonymous'],
            'campaign_id' => (int)$donation['campaign_id'],
            'campaign_title' => $donation['campaign_title'] ?? 'Unknown Campaign',
            'payment_date' => $donation['payment_date'],
            'time_ago' => $timeAgo,
            'initial' => strtoupper(substr($displayName, 0, 1))
        ];
    }
    
    // Return success response
    echo json_encode([
        'success' => true,
        'donations' => $formattedDonations,
        'count' => count($formattedDonations)
    ]);
    
} catch (PDOException $e) {
    // Log error
    error_log("Database error in get-recent.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred',
        'error' => defined('APP_ENV') && APP_ENV === 'development' ? $e->getMessage() : null
    ]);
    
} catch (Exception $e) {
    // Log error
    error_log("Error in get-recent.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred',
        'error' => defined('APP_ENV') && APP_ENV === 'development' ? $e->getMessage() : null
    ]);
}
?>
