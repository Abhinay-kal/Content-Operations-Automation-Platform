<?php
namespace SeoOptAgent\Utils;

interface LoggerInterface {
    public function log(string $level, string $message, array $context = []): void;
}