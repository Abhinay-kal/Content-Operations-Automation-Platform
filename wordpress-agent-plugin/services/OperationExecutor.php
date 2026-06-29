<?php
namespace SeoPlatform\Services;

class OperationExecutor {
    private $backendUrl;
    private $token;

    public function __construct($backendUrl, $token) {
        $this->backendUrl = rtrim($backendUrl, '/');
        $this->token = $token;
    }

    public function processOperations($operations) {
        if (empty($operations)) return;

        $acks = [];

        foreach ($operations as $op) {
            $uuid = $op['uuid'] ?? '';
            $type = $op['type'] ?? '';
            $payload = $op['payload'] ?? [];

            // Acknowledge STARTED
            $acks[] = ['uuid' => $uuid, 'status' => 'STARTED'];

            try {
                $handlerClass = "SeoPlatform\\Operations\\" . str_replace('_', '', ucwords(strtolower($type), '_')) . "Operation";
                if (class_exists($handlerClass)) {
                    $handler = new $handlerClass();
                    $result = $handler->execute($payload);
                    $acks[] = ['uuid' => $uuid, 'status' => 'COMPLETED', 'result' => $result];
                } else {
                    $acks[] = ['uuid' => $uuid, 'status' => 'FAILED', 'error' => 'Unknown operation type: ' . $type];
                }
            } catch (\Exception $e) {
                $acks[] = ['uuid' => $uuid, 'status' => 'FAILED', 'error' => $e->getMessage()];
            }
        }

        $this->sendAcknowledgements($acks);
    }

    private function sendAcknowledgements($acks) {
        $args = [
            'body' => json_encode(['operations' => $acks]),
            'headers' => [
                'Content-Type' => 'application/json',
                'x-plugin-token' => $this->token
            ],
            'timeout' => 15
        ];
        wp_remote_post($this->backendUrl . '/plugin/operations/ack', $args);
    }
}
