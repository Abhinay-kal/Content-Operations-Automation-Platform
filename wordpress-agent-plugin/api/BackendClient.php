<?php
namespace SeoOptAgent\Api;

use SeoOptAgent\Services\ConfigService;

class BackendClient {
    private $httpClient;
    private $config;

    public function __construct(HttpClient $httpClient, ConfigService $config) {
        $this->httpClient = $httpClient;
        $this->config = $config;
    }

    public function get(string $endpoint): array {
        return $this->request('GET', $endpoint);
    }

    public function post(string $endpoint, array $body = []): array {
        return $this->request('POST', $endpoint, $body);
    }

    private function request(string $method, string $endpoint, array $body = []): array {
        $url = $this->config->getBackendUrl();
        if (empty($url)) {
            return [
                'success' => false,
                'error_code' => 'config_missing',
                'message' => 'Backend URL is missing.'
            ];
        }
        $fullUrl = rtrim($url, '/') . '/' . ltrim($endpoint, '/');
        $apiKey = $this->config->getApiKey();
        $token = $this->config->getRegistrationToken();

        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'ngrok-skip-browser-warning' => 'true'
        ];

        if (!empty($apiKey)) {
            $headers['x-api-key'] = $apiKey;
        }
        if (!empty($token)) {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        return $this->httpClient->request($method, $fullUrl, $headers, $body);
    }
}