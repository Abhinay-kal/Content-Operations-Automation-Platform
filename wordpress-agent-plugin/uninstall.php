<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Ensure the constant is defined for uninstallation
if (!defined('SEO_OPT_AGENT_SETTINGS_KEY')) {
    define('SEO_OPT_AGENT_SETTINGS_KEY', 'seo_opt_agent_settings');
}

delete_option( SEO_OPT_AGENT_SETTINGS_KEY );

// Cleanup legacy options from Phase P1
delete_option( 'seo_opt_backend_url' );
delete_option( 'seo_opt_api_key' );
delete_option( 'seo_opt_plugin_uuid' );
delete_option( 'seo_opt_plugin_version' );
delete_option( 'seo_opt_connection_status' );
delete_option( 'seo_opt_last_success' );
delete_option( 'seo_opt_last_error' );
delete_option( 'seo_opt_installed_at' );