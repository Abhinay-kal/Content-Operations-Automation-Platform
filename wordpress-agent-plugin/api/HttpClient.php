<?php
namespace SeoOptAgent\Api;

class HttpClient {
    public function request(string $method, string $url, array $headers = [], array $body = []): array {
        // Prevent insecure HTTP unless localhost (developer mode)
        if (strpos($url, 'http://') === 0 && strpos($url, 'http://localhost') === false && strpos($url, 'http://127.0.0.1') === false) {
            return [
                'success' => false,
                'error_code' => 'insecure_connection',
                'message' => 'Insecure HTTP connections are not allowed.',
                'status' => 0
            ];
        }

        $args = [
            'method'      => $method,
            'timeout'     => 15,
            'redirection' => 5,
            'httpversion' => '1.0',
            'blocking'    => true,
            'headers'     => $headers,
            'sslverify'   => true,
        ];

        if ($method === 'POST' && !empty($body)) {
            $args['body'] = wp_json_encode($body);
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            $errorCode = $response->get_error_code();
            if (strpos($errorCode, 'timeout') !== false) {
                $errorCode = 'timeout';
            }
            return [
                'success' => false,
                'error_code' => $errorCode,
                'message' => $response->get_error_message(),
                'status' => 0
            ];
        }

        $statusCode = wp_remote_retrieve_response_code($response);
        $bodyRaw = wp_remote_retrieve_body($response);
        $data = json_decode($bodyRaw, true) ?: [];

        if ($statusCode >= 400) {
            $defaultMessages = [
                400 => 'Bad Request',
                401 => 'Unauthorized - Check API Key',
                403 => 'Forbidden',
                404 => 'Not Found - Check your Backend URL',
                405 => 'Method Not Allowed',
                500 => 'Internal Server Error',
                502 => 'Bad Gateway - Is n8n running?',
                503 => 'Service Unavailable',
                504 => 'Gateway Timeout'
            ];
            $message = $data['error'] ?? ($defaultMessages[$statusCode] ?? 'Unknown HTTP Error (Status: ' . $statusCode . ')');
            return [
                'success' => false,
                'error_code' => 'http_error_' . $statusCode,
                'message' => $message,
                'status' => $statusCode
            ];
        }

        return [
            'success' => true,
            'data' => $data,
            'status' => $statusCode
        ];
    }
}