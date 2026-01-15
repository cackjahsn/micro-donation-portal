<?php
require_once dirname(dirname(__FILE__)) . '/config/database.php';
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

echo json_encode(array(
    "success" => true,
    "message" => "Logged out successfully"
));
?>