<?php
// /backend/api/user/donations.php

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session for authentication
session_start();

// Set headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$response = [];

try {
    // Database connection
    require_once dirname(dirname(dirname(__FILE__))) . '/config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("Authentication required. Please login first.");
    }
    
    // Check if user is admin
    $isAdmin = isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
    
    // Get parameters
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    // Determine which user ID to use
    if ($isAdmin && $user_id) {
        // Admin viewing specific user's donations
        $target_user_id = $user_id;
    } elseif ($isAdmin && !$user_id) {
        // Admin viewing all donations
        $target_user_id = null;
    } else {
        // Regular user can only view their own donations
        $target_user_id = $_SESSION['user_id'];
    }
    
    // Check if donations table exists
    $checkTable = $db->query("SHOW TABLES LIKE 'donations'");
    if(!$checkTable || $checkTable->rowCount() == 0) {
        $response = [
            "success" => true,
            "donations" => [],
            "total_donated" => 0,
            "count" => 0,
            "is_admin" => $isAdmin,
            "message" => "Donations table is empty or doesn't exist"
        ];
        
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit();
    }
    
    // Build query based on user role and parameters
    if ($isAdmin && $target_user_id === null) {
        // Admin: Get all donations with donor info
        $query = "SELECT d.*, 
                         c.title as campaign_title,
                         c.id as campaign_id,
                         u.name as donor_name,
                         u.email as donor_email
                  FROM donations d
                  LEFT JOIN campaigns c ON d.campaign_id = c.id
                  LEFT JOIN users u ON d.user_id = u.id
                  WHERE 1=1";
        
        // Filter by status if provided
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $query .= " AND d.status = :status";
        } else {
            $query .= " AND d.status = 'completed'";
        }
        
        $query .= " ORDER BY d.created_at DESC";
        
        if ($limit > 0) {
            $query .= " LIMIT :limit";
        }
        
        $stmt = $db->prepare($query);
        
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $status = htmlspecialchars(strip_tags($_GET['status']));
            $stmt->bindParam(":status", $status);
        }
        
        if ($limit > 0) {
            $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        }
        
    } else {
        // User-specific donations (both admin viewing specific user and regular user)
        $query = "SELECT d.*, 
                         c.title as campaign_title,
                         c.id as campaign_id
                  FROM donations d
                  LEFT JOIN campaigns c ON d.campaign_id = c.id
                  WHERE d.user_id = :user_id";
        
        // Filter by status if provided
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $query .= " AND d.status = :status";
        } else {
            $query .= " AND d.status = 'completed'";
        }
        
        $query .= " ORDER BY d.created_at DESC";
        
        if ($limit > 0) {
            $query .= " LIMIT :limit";
        }
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $target_user_id, PDO::PARAM_INT);
        
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $status = htmlspecialchars(strip_tags($_GET['status']));
            $stmt->bindParam(":status", $status);
        }
        
        if ($limit > 0) {
            $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        }
    }
    
    $stmt->execute();
    $donations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate total donated
    if ($isAdmin && $target_user_id === null) {
        // Admin: total of all completed donations
        $total_query = "SELECT SUM(amount) as total 
                        FROM donations 
                        WHERE status = 'completed'";
        $total_stmt = $db->prepare($total_query);
        $total_stmt->execute();
    } else {
        // User-specific total
        $total_query = "SELECT SUM(amount) as total 
                        FROM donations 
                        WHERE user_id = :user_id AND status = 'completed'";
        $total_stmt = $db->prepare($total_query);
        $total_stmt->bindParam(":user_id", $target_user_id, PDO::PARAM_INT);
        $total_stmt->execute();
    }
    
    $total_result = $total_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Format donations data
    $formatted_donations = [];
    foreach ($donations as $donation) {
        $formatted = [
            "id" => $donation['id'],
            "transaction_id" => $donation['transaction_id'] ?: 'DON-' . str_pad($donation['id'], 6, '0', STR_PAD_LEFT),
            "campaign_id" => $donation['campaign_id'],
            "campaign_title" => $donation['campaign_title'] ?: "Unknown Campaign",
            "amount" => (float)$donation['amount'],
            "payment_method" => $donation['payment_method'] ?: "QR Payment",
            "status" => $donation['status'],
            "created_at" => $donation['created_at']
        ];
        
        // Add donor info for admin view
        if ($isAdmin && $target_user_id === null) {
            $formatted["donor_name"] = $donation['donor_name'] ?: "Anonymous";
            $formatted["donor_email"] = $donation['donor_email'];
            $formatted["user_id"] = $donation['user_id'];
        }
        
        $formatted_donations[] = $formatted;
    }
    
    // If no donations found and user is admin, provide sample data for demo
    if (empty($formatted_donations) && $isAdmin && $target_user_id === null) {
        $formatted_donations = $this->getSampleDonations();
    }
    
    $response = [
        "success" => true,
        "donations" => $formatted_donations,
        "total_donated" => $total_result['total'] ? (float)$total_result['total'] : 0,
        "count" => count($formatted_donations),
        "is_admin" => $isAdmin,
        "viewing_user_id" => $target_user_id,
        "message" => "Donations retrieved successfully"
    ];
    
} catch(PDOException $e) {
    $response = [
        "success" => false,
        "message" => "Database error: " . $e->getMessage(),
        "donations" => [],
        "total_donated" => 0,
        "count" => 0,
        "is_admin" => isset($isAdmin) ? $isAdmin : false
    ];
} catch(Exception $e) {
    $response = [
        "success" => false,
        "message" => $e->getMessage(),
        "donations" => [],
        "total_donated" => 0,
        "count" => 0,
        "is_admin" => isset($isAdmin) ? $isAdmin : false
    ];
}

echo json_encode($response, JSON_PRETTY_PRINT);
exit();

/**
 * Get sample donations for demo purposes (admin only)
 */
function getSampleDonations() {
    return [
        [
            "id" => 1,
            "transaction_id" => "DON-001234",
            "campaign_id" => 1,
            "campaign_title" => "Flood Relief Fund",
            "donor_name" => "Ahmad Rahim",
            "donor_email" => "ahmad@example.com",
            "user_id" => 1,
            "amount" => 150.00,
            "payment_method" => "QR Payment",
            "status" => "completed",
            "created_at" => date('Y-m-d H:i:s', strtotime('-2 days'))
        ],
        [
            "id" => 2,
            "transaction_id" => "DON-001233",
            "campaign_id" => 2,
            "campaign_title" => "Student Scholarship",
            "donor_name" => "Siti Aminah",
            "donor_email" => "siti@example.com",
            "user_id" => 2,
            "amount" => 50.00,
            "payment_method" => "Online Banking",
            "status" => "completed",
            "created_at" => date('Y-m-d H:i:s', strtotime('-3 days'))
        ],
        [
            "id" => 3,
            "transaction_id" => "DON-001232",
            "campaign_id" => 3,
            "campaign_title" => "Health Center",
            "donor_name" => "Anonymous",
            "donor_email" => null,
            "user_id" => 3,
            "amount" => 25.00,
            "payment_method" => "QR Payment",
            "status" => "completed",
            "created_at" => date('Y-m-d H:i:s', strtotime('-4 days'))
        ],
        [
            "id" => 4,
            "transaction_id" => "DON-001231",
            "campaign_id" => 1,
            "campaign_title" => "Flood Relief Fund",
            "donor_name" => "John Lee",
            "donor_email" => "john@example.com",
            "user_id" => 4,
            "amount" => 100.00,
            "payment_method" => "Credit Card",
            "status" => "completed",
            "created_at" => date('Y-m-d H:i:s', strtotime('-5 days'))
        ],
        [
            "id" => 5,
            "transaction_id" => "DON-001230",
            "campaign_id" => 2,
            "campaign_title" => "Student Scholarship",
            "donor_name" => "Maria Tan",
            "donor_email" => "maria@example.com",
            "user_id" => 5,
            "amount" => 30.00,
            "payment_method" => "QR Payment",
            "status" => "completed",
            "created_at" => date('Y-m-d H:i:s', strtotime('-6 days'))
        ]
    ];
}
?>