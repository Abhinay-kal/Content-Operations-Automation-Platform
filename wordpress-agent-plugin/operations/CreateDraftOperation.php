<?php
namespace SeoPlatform\Operations;

class CreateDraftOperation {
    public function execute($payload) {
        $title = $payload['title'] ?? 'Draft';
        $content = $payload['content'] ?? '';
        
        // Idempotency check via metadata
        $idempotencyKey = $payload['idempotency_key'] ?? '';
        if ($idempotencyKey) {
            $args = [
                'meta_key' => '_seo_platform_idem_key',
                'meta_value' => $idempotencyKey,
                'post_type' => 'post',
                'post_status' => 'any',
                'numberposts' => 1
            ];
            $existing = get_posts($args);
            if (!empty($existing)) {
                return ['id' => $existing[0]->ID, 'status' => 'ALREADY_EXISTS'];
            }
        }

        $postId = wp_insert_post([
            'post_title' => $title,
            'post_content' => $content,
            'post_status' => 'draft',
            'meta_input' => [
                '_seo_platform_idem_key' => $idempotencyKey
            ]
        ]);

        if (is_wp_error($postId)) {
            throw new \Exception($postId->get_error_message());
        }

        return ['id' => $postId];
    }
}
