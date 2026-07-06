<?php
namespace SeoOptAgent\Models;

class PluginMetadata {
    private $uuid;
    private $pluginVersion;
    private $wpVersion;
    private $phpVersion;
    private $installedAt;

    public function __construct(array $data = []) {
        $this->uuid = $data['uuid'] ?? '';
        $this->pluginVersion = $data['plugin_version'] ?? '';
        $this->wpVersion = $data['wp_version'] ?? '';
        $this->phpVersion = $data['php_version'] ?? '';
        $this->installedAt = $data['installed_at'] ?? 0;
    }

    public function toArray(): array {
        return [
            'uuid' => $this->uuid,
            'plugin_version' => $this->pluginVersion,
            'wp_version' => $this->wpVersion,
            'php_version' => $this->phpVersion,
            'installed_at' => $this->installedAt,
        ];
    }
    
    // Getters
    public function getUuid() { return $this->uuid; }
    public function getPluginVersion() { return $this->pluginVersion; }
    public function getWpVersion() { return $this->wpVersion; }
    public function getPhpVersion() { return $this->phpVersion; }
    public function getInstalledAt() { return $this->installedAt; }

    // Setters
    public function setUuid($v) { $this->uuid = $v; }
    public function setPluginVersion($v) { $this->pluginVersion = $v; }
    public function setWpVersion($v) { $this->wpVersion = $v; }
    public function setPhpVersion($v) { $this->phpVersion = $v; }
    public function setInstalledAt($v) { $this->installedAt = $v; }
}