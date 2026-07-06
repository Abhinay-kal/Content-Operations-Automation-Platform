<?php
namespace SeoOptAgent\Repository;

class SettingsRepository {
    public function getSettings(): array {
        return get_option(SEO_OPT_AGENT_SETTINGS_KEY, []);
    }

    public function saveSettings(array $settings): void {
        update_option(SEO_OPT_AGENT_SETTINGS_KEY, $settings);
    }
    
    public function deleteSettings(): void {
        delete_option(SEO_OPT_AGENT_SETTINGS_KEY);
    }
}