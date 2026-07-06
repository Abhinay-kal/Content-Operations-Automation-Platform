<?php
namespace SeoOptAgent\Models;

class ConnectionStatus {
    const NOT_CONFIGURED = 'NOT_CONFIGURED';
    const CONFIGURED = 'CONFIGURED';
    const CONNECTING = 'CONNECTING';
    const HANDSHAKING = 'HANDSHAKING';
    const REGISTERING = 'REGISTERING';
    const CONNECTED = 'CONNECTED';
    const AUTH_FAILED = 'AUTH_FAILED';
    const VERSION_MISMATCH = 'VERSION_MISMATCH';
    const SERVER_UNREACHABLE = 'SERVER_UNREACHABLE';
    const TIMEOUT = 'TIMEOUT';
    const DISCONNECTED = 'DISCONNECTED';

    private $status;

    public function __construct(string $status = self::NOT_CONFIGURED) {
        $this->status = $status;
    }

    public function getValue(): string {
        return $this->status;
    }

    public function getLabel(): string {
        $map = [
            self::NOT_CONFIGURED => 'Not Configured',
            self::CONFIGURED => 'Configured',
            self::CONNECTING => 'Connecting',
            self::HANDSHAKING => 'Handshaking',
            self::REGISTERING => 'Registering',
            self::CONNECTED => 'Connected',
            self::AUTH_FAILED => 'Authentication Failed',
            self::VERSION_MISMATCH => 'Version Mismatch',
            self::SERVER_UNREACHABLE => 'Backend Unreachable',
            self::TIMEOUT => 'Timeout',
            self::DISCONNECTED => 'Disconnected',
        ];
        return $map[$this->status] ?? 'Unknown';
    }
}