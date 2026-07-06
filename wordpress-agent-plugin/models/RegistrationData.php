<?php
namespace SeoOptAgent\Models;

class RegistrationData {
    private $registrationId;
    private $registrationToken;
    private $siteId;
    private $expiresAt;
    private $backendVersion;
    private $apiVersion;
    private $capabilities;

    public function __construct(array $data = []) {
        $this->registrationId = $data['registrationId'] ?? '';
        $this->registrationToken = $data['registrationToken'] ?? '';
        $this->siteId = $data['siteId'] ?? '';
        $this->expiresAt = $data['expiresAt'] ?? 0;
        $this->backendVersion = $data['backendVersion'] ?? '';
        $this->apiVersion = $data['apiVersion'] ?? '';
        $this->capabilities = $data['capabilities'] ?? [];
    }

    public function toArray(): array {
        return [
            'registrationId' => $this->registrationId,
            'registrationToken' => $this->registrationToken,
            'siteId' => $this->siteId,
            'expiresAt' => $this->expiresAt,
            'backendVersion' => $this->backendVersion,
            'apiVersion' => $this->apiVersion,
            'capabilities' => $this->capabilities,
        ];
    }
    
    public function getRegistrationToken() { return $this->registrationToken; }
    public function getSiteId() { return $this->siteId; }
    public function getBackendVersion() { return $this->backendVersion; }
    public function getApiVersion() { return $this->apiVersion; }
    public function getCapabilities() { return $this->capabilities; }
}