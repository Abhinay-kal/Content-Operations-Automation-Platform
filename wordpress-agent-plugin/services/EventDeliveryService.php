<?php
namespace SeoPlatform\Services;

use SeoPlatform\Repository\EventQueueRepository;

class EventDeliveryService {
    private $queueRepo;
    private $backendUrl;
    private $token;
    private $installationUuid;

    public function __construct(EventQueueRepository $queueRepo, $backendUrl, $token, $installationUuid) {
        $this->queueRepo = $queueRepo;
        $this->backendUrl = rtrim($backendUrl, '/');
        $this->token = $token;
        $this->installationUuid = $installationUuid;
    }

    public function deliverEvents() {
        $events = $this->queueRepo->getPending(50);
        if (empty($events)) return;

        $eventIds = array_column($events, 'event_id');
        $this->queueRepo->updateStatuses($eventIds, 'PROCESSING');

        $payload = [
            'installationUuid' => $this->installationUuid,
            'events' => array_column($events, 'payload')
        ];

        $args = [
            'body' => json_encode($payload),
            'headers' => [
                'Content-Type' => 'application/json',
                'x-plugin-token' => $this->token
            ],
            'timeout' => 15
        ];

        $response = wp_remote_post($this->backendUrl . '/plugin/events', $args);

        if (is_wp_error($response)) {
            $this->queueRepo->updateStatuses($eventIds, 'FAILED', 'NETWORK_ERROR');
            return;
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code >= 200 && $code < 300) {
            $this->queueRepo->updateStatuses($eventIds, 'DELIVERED');
        } else {
            $reason = 'SERVER_ERROR';
            if ($code === 401 || $code === 403) $reason = 'AUTH_ERROR';
            if ($code === 408 || $code === 504) $reason = 'TIMEOUT';
            $this->queueRepo->updateStatuses($eventIds, 'FAILED', $reason);
        }
    }
}
