<?php
// config/database.php

// Enable error reporting at the top
error_reporting(E_ALL);
ini_set('display_errors', 1);

class Database {
    private $host = "localhost";
    private $db_name = "micro_donation_db";
    private $username = "root"; // Change to your MySQL username
    private $password = ""; // Change to your MySQL password
    private $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
            
            // Test connection
            $this->conn->query("SELECT 1");
            
        } catch(PDOException $exception) {
            // Log error
            error_log("Database connection error: " . $exception->getMessage());
            
            // Return JSON error if called via API
            if (php_sapi_name() !== 'cli') {
                header('Content-Type: application/json');
                echo json_encode([
                    "success" => false,
                    "message" => "Database connection failed: " . $exception->getMessage()
                ]);
                exit();
            }
            
            throw new Exception("Database connection failed");
        }

        return $this->conn;
    }
}
?>