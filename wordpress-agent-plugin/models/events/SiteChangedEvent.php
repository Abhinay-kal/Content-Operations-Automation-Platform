<?php
namespace SeoPlatform\Models\Events;

class SiteChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'SiteChangedEvent'; }
}
