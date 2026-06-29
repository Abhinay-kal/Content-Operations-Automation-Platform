<?php
namespace SeoOptAgent\Config;

class Constants {
    public function __construct($pluginFile) {
        if (!defined('SEO_OPT_AGENT_VERSION')) {
            define('SEO_OPT_AGENT_VERSION', '1.0.3');
        }
        if (!defined('SEO_OPT_AGENT_PATH')) {
            define('SEO_OPT_AGENT_PATH', plugin_dir_path($pluginFile));
        }
        if (!defined('SEO_OPT_AGENT_URL')) {
            define('SEO_OPT_AGENT_URL', plugin_dir_url($pluginFile));
        }
        if (!defined('SEO_OPT_AGENT_SETTINGS_KEY')) {
            define('SEO_OPT_AGENT_SETTINGS_KEY', 'seo_opt_agent_settings');
        }
    }
}