<?php
namespace SeoPlatform\Operations;

class FetchPostOperation {
    public function execute($payload) {
        $postId = $payload['post_id'] ?? 0;
        if (!$postId) throw new \Exception("Missing post_id");

        $post = get_post($postId);
        if (!$post) throw new \Exception("Post not found");

        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'status' => $post->post_status,
            'type' => $post->post_type
        ];
    }
}
