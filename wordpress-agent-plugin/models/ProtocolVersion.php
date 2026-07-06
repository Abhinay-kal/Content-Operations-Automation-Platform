<?php
namespace SeoOptAgent\Models;

class ProtocolVersion {
    const CURRENT = '1.0';
    
    private $version;
    
    public function __construct(string $version = self::CURRENT) {
        $this->version = $version;
    }
    
    public function getValue(): string {
        return $this->version;
    }
}