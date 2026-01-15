<?php
// config/database.php
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
                    PDO::ATTR_AUTOCOMMIT => true, // ADD THIS LINE
                    PDO::ATTR_PERSISTENT => false
                ]
            );
            
            // Explicitly set autocommit
            $this->conn->setAttribute(PDO::ATTR_AUTOCOMMIT, true);
            
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed");
        }

        return $this->conn;
    }
}
?>