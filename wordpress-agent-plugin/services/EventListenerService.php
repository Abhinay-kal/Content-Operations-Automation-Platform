<?php
namespace SeoPlatform\Services;

use SeoPlatform\Models\Events\PostChangedEvent;
use SeoPlatform\Models\Events\CategoryChangedEvent;
use SeoPlatform\Models\Events\TagChangedEvent;
use SeoPlatform\Models\Events\AuthorChangedEvent;
use SeoPlatform\Models\Events\MediaChangedEvent;
use SeoPlatform\Models\Events\SiteChangedEvent;
use SeoPlatform\Repository\EventQueueRepository;

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
