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
    $prefixes = ['SeoOptAgent\\', 'SeoPlatform\\'];
    $base_dir = plugin_dir_path(__FILE__);
    
    foreach ($prefixes as $prefix) {
        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) === 0) {
            $relative_class = substr($class, $len);
            
            // Convert namespace to path: Lowercase the directory parts, keep filename as is.
            $parts = explode('\\', $relative_class);
            $file_name = array_pop($parts);
            $dir = '';
            if (count($parts) > 0) {
                $dir = strtolower(implode('/', $parts)) . '/';
            }
            
            $file = $base_dir . $dir . $file_name . '.php';
            if (file_exists($file)) {
                require $file;
                return;
            }
        }
    }
});

function run_seo_opt_agent() {
    $plugin = new SeoOptAgent\Bootstrap\Plugin(__FILE__);
    $plugin->run();
}

run_seo_opt_agent();