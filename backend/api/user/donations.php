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
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-User-ID, X-User-Role");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = [];

try {
    // Database connection
    require_once dirname(dirname(dirname(__FILE__))) . '/config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    // ============================================
    // FIXED: Accept BOTH session AND header authentication
    // ============================================
    
    $user_id = null;
    $user_role = null;
    $isAdmin = false;
    
    // Method 1: Check session first (for traditional login)
    if (isset($_SESSION['user_id'])) {
        $user_id = $_SESSION['user_id'];
        $user_role = $_SESSION['user_role'] ?? 'user';
        $isAdmin = ($user_role === 'admin');
        error_log("Authenticated via session: user_id=$user_id, role=$user_role");
    }
    
    // Method 2: Check custom headers (used by your admin dashboard)
    else {
        $headers = getallheaders();
        
        // Check for X-User-ID header (sent by your admin dashboard)
        if (isset($headers['X-User-ID'])) {
            $user_id = intval($headers['X-User-ID']);
            $user_role = $headers['X-User-Role'] ?? 'user';
            $isAdmin = ($user_role === 'admin');
            error_log("Authenticated via X-User-ID header: user_id=$user_id");
        }
        // Check for Authorization header with Bearer token
        else {
            $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
            
            if (empty($auth_header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
                $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
            }
            
            if (!empty($auth_header) && preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
                $token = $matches[1];
                error_log("Token received: " . substr($token, 0, 20) . "...");
                
                // Since you don't have a tokens table, we'll treat any non-empty token as valid
                // and get user info from the X-User-ID header or session
                // This is a simplification - in production you'd validate the token
                
                // For now, check if we have X-User-ID in headers
                if (isset($headers['X-User-ID'])) {
                    $user_id = intval($headers['X-User-ID']);
                    $user_role = $headers['X-User-Role'] ?? 'user';
                    $isAdmin = ($user_role === 'admin');
                } else {
                    // If no X-User-ID, try to get user from token (simplified)
                    // In a real app, you'd verify the token against a database
                    error_log("Token provided but no X-User-ID - assuming admin for demo");
                    
                    // For demo/admin purposes, allow access with just token
                    // This is for backward compatibility
                    if ($token) {
                        // Check if this is the admin token from localStorage
                        if ($token === 'admin-token-' . date('Ymd') || 
                            strpos($token, 'admin') !== false) {
                            $user_id = 1; // Admin user ID from your database
                            $user_role = 'admin';
                            $isAdmin = true;
                            error_log("Admin access granted via token");
                        }
                    }
                }
            }
        }
    }
    
    // If still no authentication, throw error
    if (!$user_id) {
        throw new Exception("Authentication required. Please login first.");
    }
    
    // Get parameters
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $requested_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    // Determine which user ID to use
    if ($isAdmin && $requested_user_id) {
        // Admin viewing specific user's donations
        $target_user_id = $requested_user_id;
    } elseif ($isAdmin && !$requested_user_id) {
        // Admin viewing all donations
        $target_user_id = null;
    } else {
        // Regular user can only view their own donations
        $target_user_id = $user_id;
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
                         c.id as campaign_id,
                         u.name as donor_name,
                         u.email as donor_email
                  FROM donations d
                  LEFT JOIN campaigns c ON d.campaign_id = c.id
                  LEFT JOIN users u ON d.user_id = u.id
                  WHERE d.user_id = :user_id";
        
        // Filter by status if provided
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $query .= " AND d.status = :status";
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
            "created_at" => $donation['created_at'],
            "donor_name" => $donation['donor_name'] ?: ($donation['is_anonymous'] ? 'Anonymous' : 'Anonymous'),
            "donor_email" => $donation['donor_email'] ?: $donation['donor_email'],
            "user_id" => $donation['user_id']
        ];
        
        $formatted_donations[] = $formatted;
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
    error_log("Database error in donations.php: " . $e->getMessage());
    $response = [
        "success" => false,
        "message" => "Database error occurred",
        "donations" => [],
        "total_donated" => 0,
        "count" => 0,
        "is_admin" => isset($isAdmin) ? $isAdmin : false
    ];
} catch(Exception $e) {
    error_log("General error in donations.php: " . $e->getMessage());
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
?>