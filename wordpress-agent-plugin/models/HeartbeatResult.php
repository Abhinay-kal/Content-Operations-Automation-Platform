<?php
namespace SeoOptAgent\Models;

class HeartbeatResult {
    private $success;
    private $message;
    private $presenceStatus;
    private $latencyMs;

    public function __construct(bool $success, string $message, PresenceStatus $presenceStatus, int $latencyMs = 0) {
        $this->success = $success;
        $this->message = $message;
        $this->presenceStatus = $presenceStatus;
        $this->latencyMs = $latencyMs;
    }

    public function isSuccess(): bool { return $this->success; }
    public function getMessage(): string { return $this->message; }
    public function getPresenceStatus(): PresenceStatus { return $this->presenceStatus; }
    public function getLatencyMs(): int { return $this->latencyMs; }
}