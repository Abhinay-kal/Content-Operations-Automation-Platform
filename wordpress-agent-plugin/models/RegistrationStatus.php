<?php
namespace SeoOptAgent\Models;

class RegistrationStatus {
    const UNREGISTERED = 'UNREGISTERED';
    const HANDSHAKING = 'HANDSHAKING';
    const REGISTERING = 'REGISTERING';
    const REGISTERED = 'REGISTERED';
    const TOKEN_EXPIRED = 'TOKEN_EXPIRED';
    const REVOKED = 'REVOKED';
    const RECONNECT_REQUIRED = 'RECONNECT_REQUIRED';

    private $status;

    public function __construct(string $status = self::UNREGISTERED) {
        $this->status = $status;
    }

    public function getValue(): string {
        return $this->status;
    }

    public function getLabel(): string {
        $map = [
            self::UNREGISTERED => 'Unregistered',
            self::HANDSHAKING => 'Handshaking',
            self::REGISTERING => 'Registering',
            self::REGISTERED => 'Registered',
            self::TOKEN_EXPIRED => 'Token Expired',
            self::REVOKED => 'Revoked',
            self::RECONNECT_REQUIRED => 'Reconnect Required',
        ];
        return $map[$this->status] ?? 'Unknown';
    }
}