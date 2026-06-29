const fs = require('fs');
const path = require('path');

const pluginDir = '/Users/abhinaykalkhanday/Desktop/n8n/wordpress-agent-plugin';
const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

const baseEvent = `<?php
namespace SeoPlatform\\Models\\Events;

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
`;

const postChangedEvent = `<?php
namespace SeoPlatform\\Models\\Events;

class PostChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'PostChangedEvent'; }
}
`;

const categoryChangedEvent = `<?php
namespace SeoPlatform\\Models\\Events;

class CategoryChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'CategoryChangedEvent'; }
}
`;

const tagChangedEvent = `<?php
namespace SeoPlatform\\Models\\Events;

class TagChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'TagChangedEvent'; }
}
`;

const authorChangedEvent = `<?php
namespace SeoPlatform\\Models\\Events;

class AuthorChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'AuthorChangedEvent'; }
}
`;

const mediaChangedEvent = `<?php
namespace SeoPlatform\\Models\\Events;

class MediaChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'MediaChangedEvent'; }
}
`;

const siteChangedEvent = `<?php
namespace SeoPlatform\\Models\\Events;

class SiteChangedEvent extends BaseEvent {
    protected function getEventTypeName() { return 'SiteChangedEvent'; }
}
`;

const eventSerializer = `<?php
namespace SeoPlatform\\Protocol\\Events;

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
`;

const eventQueueRepository = `<?php
namespace SeoPlatform\\Repository;

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
`;

const eventListenerService = `<?php
namespace SeoPlatform\\Services;

use SeoPlatform\\Models\\Events\\PostChangedEvent;
use SeoPlatform\\Models\\Events\\CategoryChangedEvent;
use SeoPlatform\\Models\\Events\\TagChangedEvent;
use SeoPlatform\\Models\\Events\\AuthorChangedEvent;
use SeoPlatform\\Models\\Events\\MediaChangedEvent;
use SeoPlatform\\Models\\Events\\SiteChangedEvent;
use SeoPlatform\\Repository\\EventQueueRepository;

class EventListenerService {
    private $queueRepo;
    private $installationUuid;

    public function __construct(EventQueueRepository $queueRepo, $installationUuid) {
        $this->queueRepo = $queueRepo;
        $this->installationUuid = $installationUuid;
    }

    public function registerHooks() {
        add_action('save_post', [$this, 'onSavePost'], 10, 3);
        add_action('transition_post_status', [$this, 'onTransitionPostStatus'], 10, 3);
        add_action('before_delete_post', [$this, 'onBeforeDeletePost']);
        add_action('trashed_post', [$this, 'onTrashedPost']);
        add_action('untrashed_post', [$this, 'onUntrashedPost']);

        add_action('created_term', [$this, 'onTermChanged'], 10, 3);
        add_action('edited_term', [$this, 'onTermChanged'], 10, 3);
        add_action('delete_term', [$this, 'onTermDeleted'], 10, 4);

        add_action('profile_update', [$this, 'onUserChanged'], 10, 2);
        add_action('user_register', [$this, 'onUserChanged'], 10, 1);
        add_action('deleted_user', [$this, 'onUserDeleted']);

        add_action('add_attachment', [$this, 'onMediaChanged']);
        add_action('edit_attachment', [$this, 'onMediaChanged']);
        add_action('delete_attachment', [$this, 'onMediaDeleted']);

        add_action('update_option_blogname', [$this, 'onSiteChanged']);
        add_action('update_option_home', [$this, 'onSiteChanged']);
        add_action('update_option_siteurl', [$this, 'onSiteChanged']);
    }

    public function onSavePost($postId, $post, $update) {
        if (wp_is_post_revision($postId) || wp_is_post_autosave($postId)) return;
        $this->queueRepo->push(new PostChangedEvent($this->installationUuid, 'post', $postId, ['action' => 'save']));
    }

    public function onTransitionPostStatus($newStatus, $oldStatus, $post) {
        if ($newStatus === $oldStatus) return;
        $this->queueRepo->push(new PostChangedEvent($this->installationUuid, 'post', $post->ID, ['action' => 'transition', 'old_status' => $oldStatus, 'new_status' => $newStatus]));
    }

    public function onBeforeDeletePost($postId) {
        $this->queueRepo->push(new PostChangedEvent($this->installationUuid, 'post', $postId, ['action' => 'delete']));
    }

    public function onTrashedPost($postId) {
        $this->queueRepo->push(new PostChangedEvent($this->installationUuid, 'post', $postId, ['action' => 'trash']));
    }

    public function onUntrashedPost($postId) {
        $this->queueRepo->push(new PostChangedEvent($this->installationUuid, 'post', $postId, ['action' => 'untrash']));
    }

    public function onTermChanged($termId, $ttId, $taxonomy) {
        if ($taxonomy === 'category') {
            $this->queueRepo->push(new CategoryChangedEvent($this->installationUuid, 'category', $termId, ['action' => 'change']));
        } elseif ($taxonomy === 'post_tag') {
            $this->queueRepo->push(new TagChangedEvent($this->installationUuid, 'tag', $termId, ['action' => 'change']));
        }
    }

    public function onTermDeleted($termId, $ttId, $taxonomy, $deletedTerm) {
        if ($taxonomy === 'category') {
            $this->queueRepo->push(new CategoryChangedEvent($this->installationUuid, 'category', $termId, ['action' => 'delete']));
        } elseif ($taxonomy === 'post_tag') {
            $this->queueRepo->push(new TagChangedEvent($this->installationUuid, 'tag', $termId, ['action' => 'delete']));
        }
    }

    public function onUserChanged($userId, $oldUserData = null) {
        $this->queueRepo->push(new AuthorChangedEvent($this->installationUuid, 'user', $userId, ['action' => 'change']));
    }

    public function onUserDeleted($userId) {
        $this->queueRepo->push(new AuthorChangedEvent($this->installationUuid, 'user', $userId, ['action' => 'delete']));
    }

    public function onMediaChanged($attachmentId) {
        $this->queueRepo->push(new MediaChangedEvent($this->installationUuid, 'media', $attachmentId, ['action' => 'change']));
    }

    public function onMediaDeleted($attachmentId) {
        $this->queueRepo->push(new MediaChangedEvent($this->installationUuid, 'media', $attachmentId, ['action' => 'delete']));
    }

    public function onSiteChanged($oldValue, $newValue) {
        $this->queueRepo->push(new SiteChangedEvent($this->installationUuid, 'site', 0, ['action' => 'change']));
    }
}
`;

const eventDeliveryService = `<?php
namespace SeoPlatform\\Services;

use SeoPlatform\\Repository\\EventQueueRepository;

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
`;


mkdirp(path.join(pluginDir, 'models/events'));
mkdirp(path.join(pluginDir, 'protocol/events'));
mkdirp(path.join(pluginDir, 'services'));
mkdirp(path.join(pluginDir, 'repository'));

fs.writeFileSync(path.join(pluginDir, 'models/events/BaseEvent.php'), baseEvent);
fs.writeFileSync(path.join(pluginDir, 'models/events/PostChangedEvent.php'), postChangedEvent);
fs.writeFileSync(path.join(pluginDir, 'models/events/CategoryChangedEvent.php'), categoryChangedEvent);
fs.writeFileSync(path.join(pluginDir, 'models/events/TagChangedEvent.php'), tagChangedEvent);
fs.writeFileSync(path.join(pluginDir, 'models/events/AuthorChangedEvent.php'), authorChangedEvent);
fs.writeFileSync(path.join(pluginDir, 'models/events/MediaChangedEvent.php'), mediaChangedEvent);
fs.writeFileSync(path.join(pluginDir, 'models/events/SiteChangedEvent.php'), siteChangedEvent);
fs.writeFileSync(path.join(pluginDir, 'protocol/events/EventSerializer.php'), eventSerializer);
fs.writeFileSync(path.join(pluginDir, 'services/EventListenerService.php'), eventListenerService);
fs.writeFileSync(path.join(pluginDir, 'repository/EventQueueRepository.php'), eventQueueRepository);
fs.writeFileSync(path.join(pluginDir, 'services/EventDeliveryService.php'), eventDeliveryService);

// 2. Backend updates
const schemaPath = path.join(backendDir, 'schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
if (!schemaContent.includes('event_ingestion')) {
    schemaContent += "\nCREATE TABLE event_ingestion (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    installation_id INTEGER,\n    event_id TEXT NOT NULL,\n    event_type TEXT NOT NULL,\n    entity_type TEXT NOT NULL,\n    entity_id TEXT NOT NULL,\n    payload TEXT,\n    received_at DATETIME NOT NULL,\n    processed INTEGER DEFAULT 0,\n    processed_at DATETIME,\n    error TEXT\n);\n";
    fs.writeFileSync(schemaPath, schemaContent);
}

const pluginRoutesPath = path.join(backendDir, 'src/api/pluginRoutes.js');
let pluginRoutesContent = fs.readFileSync(pluginRoutesPath, 'utf8');
if (!pluginRoutesContent.includes('/plugin/events')) {
    const eventsEndpoint = "\n    router.post('/plugin/events', authenticate, (req, res) => {\n        try {\n            const events = req.body.events;\n            if (!events || !Array.isArray(events)) {\n                return res.status(400).json({ success: false, error: 'Invalid payload schema' });\n            }\n            \n            if (pluginService.pluginRepository) {\n                const stmt = pluginService.pluginRepository.db.prepare(`\n                    INSERT INTO event_ingestion (\n                        installation_id, event_id, event_type, entity_type, entity_id, payload, received_at\n                    ) VALUES (\n                        @installation_id, @event_id, @event_type, @entity_type, @entity_id, @payload, CURRENT_TIMESTAMP\n                    )\n                `);\n                \n                const installation = pluginService.pluginRepository.findByToken(req.pluginToken);\n                \n                for (const event of events) {\n                    try {\n                        stmt.run({\n                            installation_id: installation.id,\n                            event_id: event.eventId || '',\n                            event_type: event.eventType || '',\n                            entity_type: event.entityType || '',\n                            entity_id: String(event.entityId || ''),\n                            payload: JSON.stringify(event)\n                        });\n                    } catch(e) {\n                        if(logger) logger.error('Error inserting event', { error: e.message });\n                    }\n                }\n            }\n\n            res.json({ success: true, processed: events.length });\n        } catch (err) {\n            if(logger) logger.error('Event ingestion error', { error: err.message });\n            res.status(400).json({ success: false, error: err.message });\n        }\n    });\n";
    pluginRoutesContent = pluginRoutesContent.replace(
        "return router;",
        eventsEndpoint + "\\n    return router;"
    );
    fs.writeFileSync(pluginRoutesPath, pluginRoutesContent);
}

console.log("Setup complete!");
