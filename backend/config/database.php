<?php
class Database {
    private $host = "localhost";
    private $db_name = "micro_donation_db";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            echo json_encode(array(
                "success" => false,
                "message" => "Database connection failed. Please check your configuration."
            ));
            exit;
        }
        
        return $this->conn;
    }
}
?>