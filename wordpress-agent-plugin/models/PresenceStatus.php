<?php
namespace SeoOptAgent\Models;

class PresenceStatus {
    const ONLINE = 'ONLINE';
    const OFFLINE = 'OFFLINE';
    const UNKNOWN = 'UNKNOWN';
    const HEARTBEATING = 'HEARTBEATING';
    const DEGRADED = 'DEGRADED';

    private $status;

    public function __construct(string $status = self::UNKNOWN) {
        $this->status = $status;
    }

    public function getValue(): string {
        return $this->status;
    }

    public function getLabel(): string {
        $map = [
            self::ONLINE => 'Online',
            self::OFFLINE => 'Offline',
            self::UNKNOWN => 'Unknown',
            self::HEARTBEATING => 'Heartbeating...',
            self::DEGRADED => 'Degraded',
        ];
        return $map[$this->status] ?? 'Unknown';
    }
}