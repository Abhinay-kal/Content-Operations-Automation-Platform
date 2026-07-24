<?php
$bodyRaw = '{"success":true,"data":{"installation_id":15,"token":"abc","registrationToken":"abc","status":"REGISTERED"}}';
$data = json_decode($bodyRaw, true);
$response = [
    'success' => true,
    'data' => $data,
    'status' => 200
];
$responseData = $response['data']['data'] ?? $response['data'];
var_dump($responseData['registrationToken']);
