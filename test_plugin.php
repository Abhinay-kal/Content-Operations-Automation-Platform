<?php
define('WPINC', 'wp-includes');
define('ABSPATH', __DIR__ . '/');

function plugin_dir_path($file) {
    return __DIR__ . '/wordpress-agent-plugin/';
}

require 'wordpress-agent-plugin/seo-optimization-platform.php';
