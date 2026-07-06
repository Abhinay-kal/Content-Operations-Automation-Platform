<?php
namespace SeoOptAgent\Services;

use SeoOptAgent\Api\BackendClient;
use SeoOptAgent\Models\ConnectionResult;
use SeoOptAgent\Models\ConnectionStatus;
use SeoOptAgent\Utils\LoggerInterface;

class ConnectionService {
    private $client;
    private $config;
    private $health;
    private $logger;

    public function __construct(BackendClient $client, ConfigService $config, HealthService $health, LoggerInterface $logger) {
        $this->client = $client;
        $this->config = $config;
        $this->health = $health;
        $this->logger = $logger;
    }

    public function testConnection(): ConnectionResult {
        $response = $this->client->get('/status');

        if (!$response['success']) {
            $errorCode = $response['error_code'];
            $errorMessage = $response['message'];
            
            $status = $this->health->determineErrorStatus($errorCode);
            
            $this->config->setConnectionStatus($status);
            $this->config->setLastConnectionError($errorMessage);
            $this->logger->log('error', "Connection test failed", ['code' => $errorCode, 'message' => $errorMessage]);
            
            return new ConnectionResult(false, $errorMessage, $status);
        }

        $data = $response['data'];
        if (isset($data['success']) && $data['success'] === true) {
            $status = new ConnectionStatus(ConnectionStatus::CONNECTED);
            $this->config->setConnectionStatus($status);
            $this->config->setLastSuccessfulConnection(time());
            $this->config->setLastConnectionError('');
            $this->logger->log('info', "Connection test succeeded");
            
            return new ConnectionResult(true, 'Connection successful', $status);
        }

        $status = new ConnectionStatus(ConnectionStatus::UNREACHABLE);
        $this->config->setConnectionStatus($status);
        $this->config->setLastConnectionError('Invalid response format');
        $this->logger->log('error', "Connection test failed: Invalid response format");
        
        return new ConnectionResult(false, 'Invalid response format from backend', $status);
    }
}