<?php
class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $email;
    public $password;
    public $name;
    public $role;
    public $avatar;
    public $date_joined;
    public $total_donated;
    public $status;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Register new user
    public function register() {
        $query = "INSERT INTO " . $this->table_name . "
                SET email = :email,
                    password = :password,
                    name = :name,
                    role = :role,
                    avatar = :avatar,
                    date_joined = NOW()";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize inputs
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->role = htmlspecialchars(strip_tags($this->role));
        
        // Hash password
        $this->password = password_hash($this->password, PASSWORD_BCRYPT);
        
        // Default avatar
        $this->avatar = 'assets/images/default-avatar.png';
        
        // Bind values
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password", $this->password);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":role", $this->role);
        $stmt->bindParam(":avatar", $this->avatar);
        
        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    // Check if email exists
    public function emailExists() {
        $query = "SELECT id, email, password, name, role, avatar, 
                         total_donated, date_joined, status
                  FROM " . $this->table_name . "
                  WHERE email = :email
                  LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $this->email);
        $stmt->execute();
        
        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->id = $row['id'];
            $this->email = $row['email'];
            $this->password = $row['password'];
            $this->name = $row['name'];
            $this->role = $row['role'];
            $this->avatar = $row['avatar'];
            $this->total_donated = $row['total_donated'];
            $this->date_joined = $row['date_joined'];
            $this->status = $row['status'];
            
            return true;
        }
        return false;
    }

        // In User.php - update the getUserById method
        public function getUserById($id) {
            try {
                $query = "SELECT id, name, email, role, avatar, date_joined, 
                                COALESCE(total_donated, 0) as total_donated, 
                                status 
                        FROM users 
                        WHERE id = :id";
                
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(":id", $id, PDO::PARAM_INT);
                $stmt->execute();
                
                if ($stmt->rowCount() > 0) {
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    // Ensure all fields have values
                    $row['total_donated'] = floatval($row['total_donated'] ?? 0);
                    $row['role'] = $row['role'] ?? 'user';
                    $row['avatar'] = $row['avatar'] ?? 'assets/images/default-avatar.png';
                    $row['status'] = $row['status'] ?? 'active';
                    
                    return $row;
                }
                
                return false;
                
            } catch(PDOException $e) {
                error_log("User::getUserById error: " . $e->getMessage());
                return false;
            }
        }

    // Verify password
    public function verifyPassword($password) {
        return password_verify($password, $this->password);
    }

    // Get user info for frontend
    public function getUserInfo() {
        return array(
            "id" => $this->id,
            "email" => $this->email,
            "name" => $this->name,
            "role" => $this->role,
            "avatar" => $this->avatar,
            "total_donated" => $this->total_donated,
            "date_joined" => $this->date_joined,
            "status" => $this->status
        );
    }
}
?>