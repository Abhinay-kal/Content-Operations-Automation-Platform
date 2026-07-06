<?php
namespace SeoOptAgent\Services;

use SeoOptAgent\Models\ProtocolVersion;

class CompatibilityService {
    public function evaluateCompatibility(string $backendProtocolStr, string $minSupportedStr, string $latestSupportedStr): array {
        $pluginProtocol = new ProtocolVersion();
        $current = floatval($pluginProtocol->getValue());
        $min = floatval($minSupportedStr);
        $latest = floatval($latestSupportedStr);
        
        if ($current < $min) {
            return [
                'status' => 'UNSUPPORTED',
                'compatible' => false,
                'message' => 'Plugin protocol version is too old. Please update the plugin.'
            ];
        }
        if ($current > $latest) {
            return [
                'status' => 'WARNING',
                'compatible' => true,
                'message' => 'Plugin is newer than the backend. Some features may not work.'
            ];
        }
        return [
            'status' => 'COMPATIBLE',
            'compatible' => true,
            'message' => 'Fully compatible.'
        ];
    }
}