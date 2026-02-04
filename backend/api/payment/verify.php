<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once dirname(__FILE__) . '/../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->donation_id)) {
    echo json_encode([
        'success' => false,
        'message' => 'Donation ID is required'
    ]);
    exit;
}

try {
    // Start transaction
    $db->beginTransaction();
    
    // Get donation details
    $query = "SELECT d.*, c.title as campaign_title, c.target_amount, c.current_amount 
              FROM donations d 
              JOIN campaigns c ON d.campaign_id = c.id 
              WHERE d.id = :donation_id AND d.status = 'pending'";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':donation_id', $data->donation_id, PDO::PARAM_INT);
    $stmt->execute();
    $donation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$donation) {
        throw new Exception('Donation not found or already processed');
    }
    
    // Simulate payment verification (fake 3-second delay)
    sleep(3);
    
    // Update donation status to completed
    $update_donation = "UPDATE donations 
                        SET status = 'completed', 
                            payment_date = NOW(),
                            updated_at = NOW()
                        WHERE id = :donation_id";
    
    $stmt = $db->prepare($update_donation);
    $stmt->bindParam(':donation_id', $data->donation_id, PDO::PARAM_INT);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to update donation status');
    }
    
    // Update campaign current amount and donor count
    // FIX: Calculate new current amount first, then update with single amount parameter
    $new_current_amount = $donation['current_amount'] + $donation['amount'];
    $new_progress_percentage = ($new_current_amount / $donation['target_amount']) * 100;
    
    $update_campaign = "UPDATE campaigns 
                        SET current_amount = :new_current_amount,
                            donors_count = donors_count + 1,
                            progress_percentage = :progress_percentage,
                            updated_at = NOW()
                        WHERE id = :campaign_id";
    
    $stmt = $db->prepare($update_campaign);
    $stmt->bindParam(':new_current_amount', $new_current_amount);
    $stmt->bindParam(':progress_percentage', $new_progress_percentage);
    $stmt->bindParam(':campaign_id', $donation['campaign_id'], PDO::PARAM_INT);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to update campaign');
    }
    
    // Update user's total donated if it's not a guest donation
    if ($donation['user_id'] > 0) {
        $update_user = "UPDATE users 
                       SET total_donated = total_donated + :amount,
                           updated_at = NOW()
                       WHERE id = :user_id";
        
        $stmt = $db->prepare($update_user);
        $stmt->bindParam(':amount', $donation['amount']);
        $stmt->bindParam(':user_id', $donation['user_id'], PDO::PARAM_INT);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to update user donation total');
        }
    }
    
    $db->commit();
    
    // Generate receipt data
    $receipt_data = [
        'receipt_id' => 'RCP-' . time() . '-' . rand(1000, 9999),
        'transaction_id' => $donation['transaction_id'],
        'date' => date('Y-m-d H:i:s'),
        'donor_name' => $donation['donor_name'] ?? 'Anonymous',
        'donor_email' => $donation['donor_email'] ?? '',
        'amount' => $donation['amount'],
        'payment_method' => $donation['payment_method'] ?? 'online_banking',
        'campaign_title' => $donation['campaign_title'],
        'status' => 'completed'
    ];
    
    echo json_encode([
        'success' => true,
        'message' => 'Payment verified successfully',
        'donation_id' => $data->donation_id,
        'transaction_id' => $donation['transaction_id'],
        'amount' => $donation['amount'],
        'campaign_title' => $donation['campaign_title'],
        'donor_name' => $donation['donor_name'] ?? 'Anonymous',
        'receipt_data' => $receipt_data
    ]);
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log('Payment Verification Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Payment verification failed: ' . $e->getMessage()
    ]);
}
?>