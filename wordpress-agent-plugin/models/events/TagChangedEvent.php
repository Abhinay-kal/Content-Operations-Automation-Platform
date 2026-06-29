<?php
namespace SeoPlatform\Models\Events;

class TagChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'TagChangedEvent'; }
}
