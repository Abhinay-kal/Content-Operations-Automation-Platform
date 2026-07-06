<?php
namespace SeoOptAgent\Services;

use SeoOptAgent\Api\BackendClient;
use SeoOptAgent\Models\ConnectionStatus;
use SeoOptAgent\Models\RegistrationStatus;
use SeoOptAgent\Models\BackendIdentity;
use SeoOptAgent\Models\ProtocolVersion;
use SeoOptAgent\Models\HandshakeResult;
use SeoOptAgent\Models\RegistrationResult;
use SeoOptAgent\Utils\LoggerInterface;

class RegistrationService {
    private $client;
    private $config;
    private $logger;
    private $compatibility;

    public function __construct(BackendClient $client, ConfigService $config, LoggerInterface $logger, CompatibilityService $compatibility) {
        $this->client = $client;
        $this->config = $config;
        $this->logger = $logger;
        $this->compatibility = $compatibility;
    }

    public function handshake(): HandshakeResult {
        $this->config->setConnectionStatus(new ConnectionStatus(ConnectionStatus::HANDSHAKING));
        $this->config->setRegistrationStatus(new RegistrationStatus(RegistrationStatus::HANDSHAKING));
        
        $identity = $this->config->getIdentity();
        $protocol = new ProtocolVersion();

        $payload = [
            'plugin' => [
                'uuid' => $identity->getPluginUuid(),
                'version' => $identity->getPluginVersion(),
                'installationUuid' => $identity->getInstallationUuid()
            ],
            'wordpress' => [
                'version' => $identity->getWpVersion(),
                'phpVersion' => $identity->getPhpVersion()
            ],
            'site' => [
                'url' => $identity->getSiteUrl(),
                'name' => $identity->getSiteName()
            ],
            'protocolVersion' => $protocol->getValue()
        ];

        $response = $this->client->post('/plugin/handshake', $payload);

        if (!$response['success']) {
            return $this->handleHandshakeFailure($response);
        }

        $data = $response['data'];
        
        $backendProtocol = $data['protocolVersion'] ?? '1.0';
        $minSupported = $data['minimumSupported'] ?? '1.0';
        $latestSupported = $data['latestSupported'] ?? '1.0';
        
        $compCheck = $this->compatibility->evaluateCompatibility($backendProtocol, $minSupported, $latestSupported);
        
        if (!$compCheck['compatible']) {
            $status = new ConnectionStatus(ConnectionStatus::VERSION_MISMATCH);
            $regStatus = new RegistrationStatus(RegistrationStatus::UNREGISTERED);
            $this->config->setConnectionStatus($status);
            $this->config->setRegistrationStatus($regStatus);
            $this->config->setLastConnectionError($compCheck['message']);
            return new HandshakeResult(false, $compCheck['message'], $status, $regStatus);
        }

        // Store intermediate backend identity
        $bIdentity = $this->config->getBackendIdentity();
        $bArray = $bIdentity->toArray();
        $bArray['backendVersion'] = $data['backendVersion'] ?? '';
        $bArray['apiVersion'] = $data['apiVersion'] ?? '';
        $bArray['protocolVersion'] = $backendProtocol;
        $bArray['capabilities'] = $data['capabilities'] ?? [];
        $bArray['lastHandshake'] = time();
        $this->config->updateBackendIdentity(new BackendIdentity($bArray));
        
        $this->config->setConnectionStatus(new ConnectionStatus(ConnectionStatus::CONFIGURED));
        $this->config->setRegistrationStatus(new RegistrationStatus(RegistrationStatus::UNREGISTERED));
        $this->config->setLastConnectionError('');
        
        return new HandshakeResult(true, 'Handshake successful.', new ConnectionStatus(ConnectionStatus::CONFIGURED), new RegistrationStatus(RegistrationStatus::UNREGISTERED), $data);
    }

    public function register(): RegistrationResult {
        $this->config->setConnectionStatus(new ConnectionStatus(ConnectionStatus::REGISTERING));
        $this->config->setRegistrationStatus(new RegistrationStatus(RegistrationStatus::REGISTERING));
        
        $identity = $this->config->getIdentity();
        $response = $this->client->post('/plugin/register', [
            'installationUuid' => $identity->getInstallationUuid()
        ]);

        if (!$response['success']) {
            return $this->handleRegistrationFailure($response);
        }

        $data = $response['data'];
        
        if (isset($data['registrationToken'])) {
            $this->config->setRegistrationToken($data['registrationToken']);
        }

        $bIdentity = $this->config->getBackendIdentity();
        $bArray = $bIdentity->toArray();
        $bArray['backendInstanceId'] = $data['backendInstanceId'] ?? '';
        $bArray['registeredSiteId'] = $data['siteId'] ?? '';
        $bArray['registeredAt'] = time();
        if (isset($data['capabilities'])) {
            $bArray['capabilities'] = $data['capabilities'];
        }

        $this->config->updateBackendIdentity(new BackendIdentity($bArray));
        $this->config->setConnectionStatus(new ConnectionStatus(ConnectionStatus::CONNECTED));
        $this->config->setRegistrationStatus(new RegistrationStatus(RegistrationStatus::REGISTERED));
        $this->config->setLastConnectionError('');

        return new RegistrationResult(true, 'Registration successful.', new ConnectionStatus(ConnectionStatus::CONNECTED), new RegistrationStatus(RegistrationStatus::REGISTERED), $data);
    }

    public function disconnect(): RegistrationResult {
        $response = $this->client->post('/plugin/disconnect');
        
        $this->config->clearRegistrationToken();
        
        // Clear backend registration metadata but keep history of last connect
        $bIdentity = $this->config->getBackendIdentity();
        $bArray = $bIdentity->toArray();
        $bArray['registeredSiteId'] = '';
        $this->config->updateBackendIdentity(new BackendIdentity($bArray));
        
        $this->config->setConnectionStatus(new ConnectionStatus(ConnectionStatus::DISCONNECTED));
        $this->config->setRegistrationStatus(new RegistrationStatus(RegistrationStatus::UNREGISTERED));
        $this->config->setLastConnectionError('');
        
        return new RegistrationResult(true, 'Disconnected.', new ConnectionStatus(ConnectionStatus::DISCONNECTED), new RegistrationStatus(RegistrationStatus::UNREGISTERED));
    }

    private function handleHandshakeFailure(array $response): HandshakeResult {
        $result = $this->determineFailureState($response);
        return new HandshakeResult(false, $result['message'], $result['connStatus'], $result['regStatus'], [], $result['errorCode']);
    }

    private function handleRegistrationFailure(array $response): RegistrationResult {
        $result = $this->determineFailureState($response);
        return new RegistrationResult(false, $result['message'], $result['connStatus'], $result['regStatus'], [], $result['errorCode']);
    }

    private function determineFailureState(array $response): array {
        $errorCode = $response['error_code'];
        $errorMessage = $response['message'];
        
        if ($errorCode === 'timeout') {
            $connStatus = new ConnectionStatus(ConnectionStatus::TIMEOUT);
            $regStatus = $this->config->getRegistrationStatus();
        } elseif ($errorCode === 'http_error_401' || $errorCode === 'http_error_403') {
            $connStatus = new ConnectionStatus(ConnectionStatus::AUTH_FAILED);
            $regStatus = new RegistrationStatus(RegistrationStatus::UNREGISTERED);
        } elseif (strpos($errorCode, 'http_error_') !== false) {
            $connStatus = new ConnectionStatus(ConnectionStatus::SERVER_UNREACHABLE);
            $regStatus = $this->config->getRegistrationStatus();
        } else {
            $connStatus = new ConnectionStatus(ConnectionStatus::DISCONNECTED);
            $regStatus = $this->config->getRegistrationStatus();
        }
        
        $this->config->setConnectionStatus($connStatus);
        $this->config->setRegistrationStatus($regStatus);
        $this->config->setLastConnectionError($errorMessage);
        $this->logger->log('error', "API Call Failed", ['code' => $errorCode, 'message' => $errorMessage]);
        
        return [
            'connStatus' => $connStatus,
            'regStatus' => $regStatus,
            'message' => $errorMessage,
            'errorCode' => $errorCode
        ];
    }
}