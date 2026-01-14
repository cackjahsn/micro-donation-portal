<?php
$password = 'admin123'; // Your admin password
$hashed_password = password_hash($password, PASSWORD_BCRYPT);
echo "Hashed password: " . $hashed_password;
?>