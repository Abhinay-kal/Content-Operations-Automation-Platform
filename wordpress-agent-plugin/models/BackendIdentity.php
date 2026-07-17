<?php
namespace SeoOptAgent\Models;

class BackendIdentity {
    private $backendInstanceId;
    private $backendVersion;
    private $apiVersion;
    private $protocolVersion;
    private $capabilities;
    private $registeredSiteId;
    private $registeredAt;
    private $lastHandshake;

    public function __construct(array $data = []) {
        $this->backendInstanceId = $data['backendInstanceId'] ?? '';
        $this->backendVersion = $data['backendVersion'] ?? '';
        $this->apiVersion = $data['apiVersion'] ?? '';
        $this->protocolVersion = $data['protocolVersion'] ?? '';
        $this->capabilities = $data['capabilities'] ?? [];
        $this->registeredSiteId = $data['registeredSiteId'] ?? '';
        $this->registeredAt = $data['registeredAt'] ?? 0;
        $this->lastHandshake = $data['lastHandshake'] ?? 0;
    }

    public function toArray(): array {
        return [
            'backendInstanceId' => $this->backendInstanceId,
            'backendVersion' => $this->backendVersion,
            'apiVersion' => $this->apiVersion,
            'protocolVersion' => $this->protocolVersion,
            'capabilities' => $this->capabilities,
            'registeredSiteId' => $this->registeredSiteId,
            'registeredAt' => $this->registeredAt,
            'lastHandshake' => $this->lastHandshake,
        ];
    }
    
    public function getBackendVersion() { return $this->backendVersion; }
    public function getApiVersion() { return $this->apiVersion; }
    public function getProtocolVersion() { return $this->protocolVersion; }
    public function getCapabilities() { return $this->capabilities; }
    public function getRegisteredSiteId() { return $this->registeredSiteId; }
}