<?php
/**
 * Plugin Name: SEO Optimization Platform Agent
 * Plugin URI: https://seo-optimization-platform.com/
 * Description: Connects WordPress securely to the SEO Optimization Platform backend for AI-driven content audits and rewrites.
 * Version: 1.0.2
 * Author: SEO Optimization Team
 * Author URI: https://seo-optimization-platform.com/
 * Text Domain: seo-opt-agent
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if ( ! defined( 'WPINC' ) ) {
    die;
}

spl_autoload_register(function ($class) {
    $prefix = 'SeoOptAgent\\';
    $base_dir = plugin_dir_path(__FILE__);
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

function run_seo_opt_agent() {
    $plugin = new SeoOptAgent\Bootstrap\Plugin(__FILE__);
    $plugin->run();
}

run_seo_opt_agent();