<?php
namespace SeoOptAgent\Models;

class PluginIdentity {
    private $pluginUuid;
    private $installationUuid;
    private $pluginVersion;
    private $wpVersion;
    private $phpVersion;
    private $siteUrl;
    private $homeUrl;
    private $siteName;
    private $timezone;
    private $language;
    private $environment;
    private $generatedAt;

    public function __construct(array $data = []) {
        $this->pluginUuid = $data['pluginUuid'] ?? '';
        $this->installationUuid = $data['installationUuid'] ?? '';
        $this->pluginVersion = $data['pluginVersion'] ?? '';
        $this->wpVersion = $data['wpVersion'] ?? '';
        $this->phpVersion = $data['phpVersion'] ?? '';
        $this->siteUrl = $data['siteUrl'] ?? '';
        $this->homeUrl = $data['homeUrl'] ?? '';
        $this->siteName = $data['siteName'] ?? '';
        $this->timezone = $data['timezone'] ?? '';
        $this->language = $data['language'] ?? '';
        $this->environment = $data['environment'] ?? 'production';
        $this->generatedAt = $data['generatedAt'] ?? 0;
    }

    public function toArray(): array {
        return [
            'pluginUuid' => $this->pluginUuid,
            'installationUuid' => $this->installationUuid,
            'pluginVersion' => $this->pluginVersion,
            'wpVersion' => $this->wpVersion,
            'phpVersion' => $this->phpVersion,
            'siteUrl' => $this->siteUrl,
            'homeUrl' => $this->homeUrl,
            'siteName' => $this->siteName,
            'timezone' => $this->timezone,
            'language' => $this->language,
            'environment' => $this->environment,
            'generatedAt' => $this->generatedAt,
        ];
    }
    
    // Getters and Setters omitted for brevity but used directly or via toArray
    public function getPluginUuid() { return $this->pluginUuid; }
    public function getInstallationUuid() { return $this->installationUuid; }
    public function getPluginVersion() { return $this->pluginVersion; }
    public function getWpVersion() { return $this->wpVersion; }
    public function getPhpVersion() { return $this->phpVersion; }
    public function getSiteUrl() { return $this->siteUrl; }
    public function getHomeUrl() { return $this->homeUrl; }
    public function getSiteName() { return $this->siteName; }
    public function getGeneratedAt() { return $this->generatedAt; }
    
    public function setInstallationUuid($v) { $this->installationUuid = $v; }
    public function setPluginUuid($v) { $this->pluginUuid = $v; }
    public function setPluginVersion($v) { $this->pluginVersion = $v; }
    public function setWpVersion($v) { $this->wpVersion = $v; }
    public function setPhpVersion($v) { $this->phpVersion = $v; }
    public function setSiteUrl($v) { $this->siteUrl = $v; }
    public function setHomeUrl($v) { $this->homeUrl = $v; }
    public function setSiteName($v) { $this->siteName = $v; }
    public function setTimezone($v) { $this->timezone = $v; }
    public function setLanguage($v) { $this->language = $v; }
    public function setEnvironment($v) { $this->environment = $v; }
    public function setGeneratedAt($v) { $this->generatedAt = $v; }
}