<?php
namespace SeoOptAgent\Services;

class DiagnosticsService {
    public function collect(): array {
        global $wp_version, $wpdb;
        return [
            'wpVersion' => $wp_version,
            'phpVersion' => phpversion(),
            'memoryUsage' => memory_get_usage(true),
            'memoryLimit' => ini_get('memory_limit'),
            'dbVersion' => $wpdb->db_version(),
            'pluginVersion' => SEO_OPT_AGENT_VERSION,
            'restAvailable' => function_exists('rest_get_url_prefix'),
            'cronAvailable' => !defined('DISABLE_WP_CRON') || !DISABLE_WP_CRON,
            'fsWritable' => wp_is_writable(WP_CONTENT_DIR),
            'sslEnabled' => is_ssl()
        ];
    }
}