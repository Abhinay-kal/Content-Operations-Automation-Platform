<?php
namespace SeoOptAgent\Services;

use SeoOptAgent\Models\ConnectionStatus;

class HealthService {
    public function determineErrorStatus(string $errorCode): ConnectionStatus {
        if ($errorCode === 'config_missing') {
            return new ConnectionStatus(ConnectionStatus::CONFIG_MISSING);
        }
        if ($errorCode === 'http_error_401' || $errorCode === 'http_error_403') {
            return new ConnectionStatus(ConnectionStatus::AUTH_FAILED);
        }
        if (strpos($errorCode, 'http_error_') !== false) {
            return new ConnectionStatus(ConnectionStatus::UNREACHABLE);
        }
        return new ConnectionStatus(ConnectionStatus::DISCONNECTED);
    }
}