<?php
namespace SeoPlatform\Models\Events;

class CategoryChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'CategoryChangedEvent'; }
}
