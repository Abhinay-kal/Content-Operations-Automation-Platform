<?php
namespace SeoPlatform\Models\Events;

class MediaChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'MediaChangedEvent'; }
}
