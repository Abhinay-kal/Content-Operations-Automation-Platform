<?php
namespace SeoPlatform\Models\Events;

class AuthorChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'AuthorChangedEvent'; }
}
