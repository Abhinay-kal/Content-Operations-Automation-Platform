<?php
namespace SeoOptAgent\Security;

use SeoOptAgent\Repository\SettingsRepository;

class WordPressSecretStore implements SecretStoreInterface {
    private $repo;

    public function __construct(SettingsRepository $repo) {
        $this->repo = $repo;
    }

    public function getSecret(string $key): string {
        $settings = $this->repo->getSettings();
        return $settings['secrets'][$key] ?? '';
    }

    public function setSecret(string $key, string $value): void {
        $settings = $this->repo->getSettings();
        if (!isset($settings['secrets'])) {
            $settings['secrets'] = [];
        }
        $settings['secrets'][$key] = $value;
        $this->repo->saveSettings($settings);
    }

    public function deleteSecret(string $key): void {
        $settings = $this->repo->getSettings();
        if (isset($settings['secrets'][$key])) {
            unset($settings['secrets'][$key]);
            $this->repo->saveSettings($settings);
        }
    }
}