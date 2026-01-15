<?php
// server-info.php
echo "<h1>Server Information</h1>";
echo "<strong>PHP Version:</strong> " . phpversion() . "<br>";
echo "<strong>Server Software:</strong> " . $_SERVER['SERVER_SOFTWARE'] . "<br>";
echo "<strong>Document Root:</strong> " . $_SERVER['DOCUMENT_ROOT'] . "<br>";
echo "<strong>Request URI:</strong> " . $_SERVER['REQUEST_URI'] . "<br>";
echo "<strong>Script Name:</strong> " . $_SERVER['SCRIPT_NAME'] . "<br>";

// Check if file exists
$api_file = $_SERVER['DOCUMENT_ROOT'] . '/micro-donation-portal/api/campaigns/get-all.php';
echo "<strong>API File Path:</strong> " . $api_file . "<br>";
echo "<strong>File Exists:</strong> " . (file_exists($api_file) ? '✅ Yes' : '❌ No') . "<br>";
echo "<strong>Is Readable:</strong> " . (is_readable($api_file) ? '✅ Yes' : '❌ No') . "<br>";

// List files in api/campaigns directory
$campaigns_dir = $_SERVER['DOCUMENT_ROOT'] . '/micro-donation-portal/api/campaigns/';
echo "<h2>Files in api/campaigns/:</h2>";
if (is_dir($campaigns_dir)) {
    $files = scandir($campaigns_dir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo "- " . $file . "<br>";
        }
    }
} else {
    echo "Directory not found!";
}
?>