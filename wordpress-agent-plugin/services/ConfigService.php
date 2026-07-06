<?php
namespace SeoOptAgent\Services;

use SeoOptAgent\Repository\SettingsRepository;
use SeoOptAgent\Security\SecretStoreInterface;
use SeoOptAgent\Models\ConnectionStatus;
use SeoOptAgent\Models\RegistrationStatus;
use SeoOptAgent\Models\PresenceStatus;
use SeoOptAgent\Models\PluginIdentity;
use SeoOptAgent\Models\BackendIdentity;

class ConfigService {
    private $repo;
    private $secretStore;
    private $cache;

    public function __construct(SettingsRepository $repo, SecretStoreInterface $secretStore) {
        $this->repo = $repo;
        $this->secretStore = $secretStore;
        $this->cache = $this->repo->getSettings();
    }

    public function getAll(): array {
        return $this->cache;
    }

    public function save(string $key, $value): void {
        $this->cache[$key] = $value;
        $this->repo->saveSettings($this->cache);
    }

    public function getBackendUrl(): string {
        return rtrim($this->cache['backend_url'] ?? '', '/');
    }

    public function getApiKey(): string {
        return $this->secretStore->getSecret('api_key');
    }

    public function setApiKey(string $key): void {
        $this->secretStore->setSecret('api_key', $key);
    }
    
    public function getRegistrationToken(): string {
        return $this->secretStore->getSecret('registration_token');
    }

    public function setRegistrationToken(string $token): void {
        $this->secretStore->setSecret('registration_token', $token);
    }

    public function clearRegistrationToken(): void {
        $this->secretStore->deleteSecret('registration_token');
    }

    public function getConnectionStatus(): ConnectionStatus {
        return new ConnectionStatus($this->cache['connection_status'] ?? ConnectionStatus::NOT_CONFIGURED);
    }

    public function setConnectionStatus(ConnectionStatus $status): void {
        $this->save('connection_status', $status->getValue());
    }

    public function getRegistrationStatus(): RegistrationStatus {
        return new RegistrationStatus($this->cache['registration_status'] ?? RegistrationStatus::UNREGISTERED);
    }

    public function setRegistrationStatus(RegistrationStatus $status): void {
        $this->save('registration_status', $status->getValue());
    }

    public function getPresenceStatus(): PresenceStatus {
        return new PresenceStatus($this->cache['presence_status'] ?? PresenceStatus::UNKNOWN);
    }

    public function setPresenceStatus(PresenceStatus $status): void {
        $this->save('presence_status', $status->getValue());
    }

    public function getLastHeartbeatTime(): int {
        return (int)($this->cache['last_heartbeat_time'] ?? 0);
    }

    public function setLastHeartbeatTime(int $time): void {
        $this->save('last_heartbeat_time', $time);
    }

    public function getLastHeartbeatLatency(): int {
        return (int)($this->cache['last_heartbeat_latency'] ?? 0);
    }

    public function setLastHeartbeatLatency(int $latency): void {
        $this->save('last_heartbeat_latency', $latency);
    }

    public function getConsecutiveHeartbeatFailures(): int {
        return (int)($this->cache['consecutive_hb_failures'] ?? 0);
    }

    public function setConsecutiveHeartbeatFailures(int $failures): void {
        $this->save('consecutive_hb_failures', $failures);
    }

    public function getLastConnectionError(): string {
        return $this->cache['last_error'] ?? '';
    }

    public function setLastConnectionError(string $error): void {
        $this->save('last_error', $error);
    }

    public function getIdentity(): PluginIdentity {
        return new PluginIdentity($this->cache['identity'] ?? []);
    }

    public function updateIdentity(PluginIdentity $identity): void {
        $existing = $this->getIdentity();
        $data = $identity->toArray();
        
        if (!empty($existing->getPluginUuid())) {
            $data['pluginUuid'] = $existing->getPluginUuid();
        }
        if (!empty($existing->getInstallationUuid())) {
            $data['installationUuid'] = $existing->getInstallationUuid();
        }
        if (!empty($existing->getGeneratedAt())) {
            $data['generatedAt'] = $existing->getGeneratedAt();
        }
        
        $this->save('identity', $data);
    }

    public function getBackendIdentity(): BackendIdentity {
        return new BackendIdentity($this->cache['backend_identity'] ?? []);
    }

    public function updateBackendIdentity(BackendIdentity $identity): void {
        $this->save('backend_identity', $identity->toArray());
    }
}