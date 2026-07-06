<?php
namespace SeoOptAgent\Models;

class HandshakeResult {
    private $success;
    private $message;
    private $connectionStatus;
    private $registrationStatus;
    private $timestamp;
    private $metadata;
    private $errorCode;

    public function __construct(bool $success, string $message, ConnectionStatus $connectionStatus, RegistrationStatus $registrationStatus, array $metadata = [], string $errorCode = '') {
        $this->success = $success;
        $this->message = $message;
        $this->connectionStatus = $connectionStatus;
        $this->registrationStatus = $registrationStatus;
        $this->timestamp = time();
        $this->metadata = $metadata;
        $this->errorCode = $errorCode;
    }

    public function isSuccess(): bool { return $this->success; }
    public function getMessage(): string { return $this->message; }
    public function getConnectionStatus(): ConnectionStatus { return $this->connectionStatus; }
    public function getRegistrationStatus(): RegistrationStatus { return $this->registrationStatus; }
    public function getMetadata(): array { return $this->metadata; }
    public function getErrorCode(): string { return $this->errorCode; }
}