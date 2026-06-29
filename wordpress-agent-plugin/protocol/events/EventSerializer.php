<?php
namespace SeoPlatform\Protocol\Events;

class EventSerializer {
    public function serialize($event) {
        return json_encode([
            'eventId' => $event->eventId,
            'eventType' => $event->eventType,
            'siteId' => $event->siteId,
            'installationUuid' => $event->installationUuid,
            'entityType' => $event->entityType,
            'entityId' => $event->entityId,
            'timestamp' => $event->timestamp,
            'version' => $event->version,
            'metadata' => $event->metadata
        ]);
    }

    public function deserialize($json) {
        return json_decode($json, true);
    }
}
