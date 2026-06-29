<?php
namespace SeoPlatform\Operations;

class PingOperation {
    public function execute($payload) {
        return ['status' => 'pong', 'time' => time()];
    }
}
