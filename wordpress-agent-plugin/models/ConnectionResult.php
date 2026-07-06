<?php
namespace SeoOptAgent\Models;

class ConnectionResult {
    private $success;
    private $message;
    private $status;

    public function __construct(bool $success, string $message, ConnectionStatus $status) {
        $this->success = $success;
        $this->message = $message;
        $this->status = $status;
    }

    public function isSuccess(): bool {
        return $this->success;
    }

    public function getMessage(): string {
        return $this->message;
    }

    public function getStatus(): ConnectionStatus {
        return $this->status;
    }
}