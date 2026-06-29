<?php
namespace SeoPlatform\Models\Events;

class PostChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'PostChangedEvent'; }
}
