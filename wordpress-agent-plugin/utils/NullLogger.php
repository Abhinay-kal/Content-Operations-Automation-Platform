<?php
namespace SeoOptAgent\Utils;

class NullLogger implements LoggerInterface {
    public function log(string $level, string $message, array $context = []): void {
        // Discard logs
    }
}