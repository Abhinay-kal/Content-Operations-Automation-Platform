<?php
namespace SeoOptAgent\Services;

use SeoOptAgent\Api\BackendClient;
use SeoOptAgent\Models\PresenceStatus;
use SeoOptAgent\Models\ProtocolVersion;
use SeoOptAgent\Models\RegistrationStatus;
use SeoOptAgent\Models\HeartbeatResult;
use SeoOptAgent\Utils\LoggerInterface;

class HeartbeatService {
    private $client;
    private $config;
    private $diagnostics;
    private $registrationService;
    private $logger;

    public function __construct(BackendClient $client, ConfigService $config, DiagnosticsService $diagnostics, RegistrationService $registrationService, LoggerInterface $logger) {
        $this->client = $client;
        $this->config = $config;
        $this->diagnostics = $diagnostics;
        $this->registrationService = $registrationService;
        $this->logger = $logger;
    }

    public function runHeartbeat(): HeartbeatResult {
        $this->config->setPresenceStatus(new PresenceStatus(PresenceStatus::HEARTBEATING));
        $startTime = microtime(true);
        
        $result = $this->sendPayload();

        // Handle auto-renewal if token expired (401/403)
        if (!$result['success'] && in_array($result['error_code'], ['http_error_401', 'http_error_403'])) {
            $this->logger->log('info', 'Token expired. Attempting silent renewal.');
            $regResult = $this->registrationService->register(); // silent renewal
            if ($regResult->isSuccess()) {
                // Retry heartbeat once
                $result = $this->sendPayload();
            } else {
                $this->config->setRegistrationStatus(new RegistrationStatus(RegistrationStatus::TOKEN_EXPIRED));
            }
        }

        $latency = round((microtime(true) - $startTime) * 1000);
        
        if ($result['success']) {
            $data = $result['data'];
            // Process response
            if (isset($data['tokenStatus']) && $data['tokenStatus'] === 'REVOKED') {
                $this->config->setRegistrationStatus(new RegistrationStatus(RegistrationStatus::REVOKED));
            }
            
            $this->config->setConsecutiveHeartbeatFailures(0);
            $this->config->setLastHeartbeatTime(time());
            $this->config->setLastHeartbeatLatency($latency);
            
            $newStatus = new PresenceStatus(PresenceStatus::ONLINE);
            $this->config->setPresenceStatus($newStatus);
            
            return new HeartbeatResult(true, 'Heartbeat successful', $newStatus, $latency);
        } else {
            $failures = $this->config->getConsecutiveHeartbeatFailures() + 1;
            $this->config->setConsecutiveHeartbeatFailures($failures);
            
            $statusVal = ($failures >= 3) ? PresenceStatus::DEGRADED : PresenceStatus::UNKNOWN;
            $newStatus = new PresenceStatus($statusVal);
            $this->config->setPresenceStatus($newStatus);
            $this->logger->log('error', 'Heartbeat failed', ['error' => $result['message'], 'failures' => $failures]);
            
            return new HeartbeatResult(false, $result['message'], $newStatus, $latency);
        }
    }

    private function sendPayload(): array {
        $identity = $this->config->getIdentity();
        $bIdentity = $this->config->getBackendIdentity();
        $protocol = new ProtocolVersion();
        
        $payload = [
            'pluginIdentity' => $identity->toArray(),
            'registrationId' => $bIdentity->getRegisteredSiteId(), // Using siteId as regId for now
            'installationUuid' => $identity->getInstallationUuid(),
            'pluginVersion' => $identity->getPluginVersion(),
            'protocolVersion' => $protocol->getValue(),
            'backendVersion' => $bIdentity->getBackendVersion(),
            'wordpressVersion' => $identity->getWpVersion(),
            'phpVersion' => $identity->getPhpVersion(),
            'siteUrl' => $identity->getSiteUrl(),
            'timestamp' => time(),
            'diagnostics' => $this->diagnostics->collect(),
            'capabilities' => $bIdentity->getCapabilities(),
            'connectionStatus' => $this->config->getConnectionStatus()->getValue(),
            'registrationStatus' => $this->config->getRegistrationStatus()->getValue()
        ];
        
        return $this->client->post('/plugin/heartbeat', $payload);
    }
}