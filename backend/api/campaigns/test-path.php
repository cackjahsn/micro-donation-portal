<?php
echo "<h1>Path Test</h1>";

echo "<h2>Current file: " . __FILE__ . "</h2>";
echo "<h2>dirname(__FILE__): " . dirname(__FILE__) . "</h2>";
echo "<h2>dirname(dirname(__FILE__)): " . dirname(dirname(__FILE__)) . "</h2>";

$path1 = dirname(dirname(__FILE__)) . '/config/database.php';
$path2 = dirname(__FILE__) . '/../../config/database.php';

echo "<h2>Path 1: " . $path1 . "</h2>";
echo "Exists: " . (file_exists($path1) ? 'YES' : 'NO') . "<br>";

echo "<h2>Path 2: " . $path2 . "</h2>";
echo "Exists: " . (file_exists($path2) ? 'YES' : 'NO') . "<br>";

// Test absolute path
$absolutePath = 'C:/xampp/htdocs/micro-donation-portal/backend/config/database.php';
echo "<h2>Absolute Path: " . $absolutePath . "</h2>";
echo "Exists: " . (file_exists($absolutePath) ? 'YES' : 'NO') . "<br>";
?>