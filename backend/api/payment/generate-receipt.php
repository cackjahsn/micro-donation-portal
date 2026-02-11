<?php
// generate-receipt.php - JSON API endpoint
require_once dirname(__FILE__) . '/../../config/database.php';

// Set headers for API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Get donation ID from query parameter
$donation_id = $_GET['donation_id'] ?? 0;

if (!$donation_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Donation ID is required',
        'code' => 400
    ]);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Check session first
    session_start();
    
    $user_id = $_SESSION['user_id'] ?? null;
    $isAdmin = isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
    
    // Build query based on user role
    if ($isAdmin) {
        // Admin can view any receipt
        $query = "SELECT d.*, u.name as user_name, u.email, 
                         c.title as campaign_title, c.organizer,
                         d.created_at as donation_date
                  FROM donations d
                  LEFT JOIN users u ON d.user_id = u.id
                  JOIN campaigns c ON d.campaign_id = c.id
                  WHERE d.id = :donation_id AND d.status = 'completed'";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':donation_id', $donation_id);
    } elseif ($user_id) {
        // Regular user can only view their own receipts
        $query = "SELECT d.*, u.name as user_name, u.email, 
                         c.title as campaign_title, c.organizer,
                         d.created_at as donation_date
                  FROM donations d
                  LEFT JOIN users u ON d.user_id = u.id
                  JOIN campaigns c ON d.campaign_id = c.id
                  WHERE d.id = :donation_id 
                    AND d.user_id = :user_id 
                    AND d.status = 'completed'";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':donation_id', $donation_id);
        $stmt->bindParam(':user_id', $user_id);
    } else {
        // Not authenticated
        echo json_encode([
            'success' => false,
            'message' => 'Authentication required',
            'code' => 401
        ]);
        exit;
    }
    
    $stmt->execute();
    $donation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$donation) {
        echo json_encode([
            'success' => false,
            'message' => 'Donation not found or not completed',
            'code' => 404
        ]);
        exit;
    }
    
    // Return JSON data
    echo json_encode([
        'success' => true,
        'donation' => [
            'id' => $donation['id'],
            'transaction_id' => $donation['transaction_id'] ?: 'DON-' . str_pad($donation['id'], 6, '0', STR_PAD_LEFT),
            'amount' => $donation['amount'],
            'campaign_title' => $donation['campaign_title'],
            'user_name' => $donation['user_name'],
            'donation_date' => $donation['donation_date']
        ],
        'receipt_url' => 'download-receipt.php?donation_id=' . $donation_id,
        'print_url' => 'download-receipt.php?donation_id=' . $donation_id . '&print=true'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'code' => 500
    ]);
}
?>