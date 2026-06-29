<?php
namespace SeoPlatform\Models\Events;

abstract class BaseEvent {
    public $eventId;
    public $eventType;
    public $siteId;
    public $installationUuid;
    public $entityType;
    public $entityId;
    public $timestamp;
    public $version;
    public $metadata;

    public function __construct($installationUuid, $entityType, $entityId, $metadata = []) {
        $this->eventId = wp_generate_uuid4();
        $this->eventType = $this->getEventTypeName();
        $this->siteId = get_current_blog_id();
        $this->installationUuid = $installationUuid;
        $this->entityType = $entityType;
        $this->entityId = $entityId;
        $this->timestamp = current_time('mysql', true);
        $this->version = '1.0.0';
        $this->metadata = $metadata;
    }

    abstract protected function getEventTypeName();
}
