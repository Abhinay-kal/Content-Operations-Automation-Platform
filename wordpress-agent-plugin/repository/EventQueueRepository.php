<?php
namespace SeoPlatform\Repository;

class EventQueueRepository {
    const OPTION_NAME = 'seo_platform_event_queue';

    public function getQueue() {
        return get_option(self::OPTION_NAME, []);
    }

    public function saveQueue($queue) {
        update_option(self::OPTION_NAME, $queue);
    }

    public function push($event) {
        $queue = $this->getQueue();
        if (!is_array($queue)) $queue = [];
        
        $now = time();
        $isDuplicate = false;
        
        foreach ($queue as $item) {
            if ($item['status'] === 'PENDING' && 
                $item['event_type'] === $event->eventType &&
                $item['payload']['entityType'] === $event->entityType &&
                $item['payload']['entityId'] === $event->entityId) {
                
                $itemTime = strtotime($item['created_at']);
                if (($now - $itemTime) < 60) {
                    $isDuplicate = true;
                    break;
                }
            }
        }

        if (!$isDuplicate) {
            $queue[] = [
                'event_id' => $event->eventId,
                'event_type' => $event->eventType,
                'payload' => (array) $event,
                'created_at' => current_time('mysql', true),
                'attempt_count' => 0,
                'last_attempt' => null,
                'status' => 'PENDING'
            ];
            $this->saveQueue($queue);
        }
    }

    public function getPending($limit = 50) {
        $queue = $this->getQueue();
        if (!is_array($queue)) $queue = [];
        $pending = [];
        $now = time();
        
        foreach ($queue as $item) {
            if ($item['status'] === 'PENDING' || $item['status'] === 'PROCESSING' || $item['status'] === 'FAILED') {
                if ($item['attempt_count'] > 0) {
                    $lastAttempt = strtotime($item['last_attempt']);
                    $delay = $this->getRetryDelay($item['attempt_count']);
                    if (($now - $lastAttempt) < $delay) {
                        continue;
                    }
                }
                $pending[] = $item;
                if (count($pending) >= $limit) break;
            }
        }
        return $pending;
    }

    public function updateStatuses($eventIds, $status, $errorReason = null) {
        $queue = $this->getQueue();
        if (!is_array($queue)) return;

        foreach ($queue as &$item) {
            if (in_array($item['event_id'], $eventIds)) {
                if ($status === 'PROCESSING') {
                    $item['attempt_count']++;
                    $item['last_attempt'] = current_time('mysql', true);
                    $item['status'] = $status;
                } elseif ($status === 'FAILED') {
                    if ($item['attempt_count'] >= 6) {
                        $item['status'] = 'DEAD_LETTER';
                    } else {
                        $item['status'] = 'FAILED';
                    }
                    if ($errorReason) $item['error_reason'] = $errorReason;
                } else {
                    $item['status'] = $status;
                }
            }
        }
        
        $queue = array_filter($queue, function($item) {
            return $item['status'] !== 'DELIVERED';
        });

        $this->saveQueue($queue);
    }

    private function getRetryDelay($attempt) {
        switch ($attempt) {
            case 1: return 0;
            case 2: return 5 * 60;
            case 3: return 15 * 60;
            case 4: return 60 * 60;
            case 5: return 6 * 60 * 60;
            default: return 6 * 60 * 60;
        }
    }
}
