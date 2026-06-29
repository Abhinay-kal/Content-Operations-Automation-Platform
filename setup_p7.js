const fs = require('fs');
const path = require('path');

const pluginDir = '/Users/abhinaykalkhanday/Desktop/n8n/wordpress-agent-plugin';
const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(pluginDir, 'operations'));

// 1. Backend schema update
const schemaPath = path.join(backendDir, 'schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
if (!schemaContent.includes('wordpress_operations')) {
    schemaContent += `
CREATE TABLE wordpress_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    installation_id INTEGER NOT NULL,
    operation_uuid TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    payload TEXT,
    priority TEXT DEFAULT 'NORMAL',
    status TEXT DEFAULT 'PENDING',
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    scheduled_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    last_error TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
    fs.writeFileSync(schemaPath, schemaContent);
}

// 2. Backend Operation Service
const wpOpServiceCode = `const crypto = require('crypto');

class WordPressOperationService {
    constructor({ db, logger }) {
        this.db = db;
        this.logger = logger;
    }

    createOperation({ siteId, installationId, operationType, payload = {}, priority = 'NORMAL', maxAttempts = 5 }) {
        const uuid = crypto.randomUUID();
        const stmt = this.db.prepare(\`
            INSERT INTO wordpress_operations (
                site_id, installation_id, operation_uuid, operation_type, payload, priority, status, max_attempts
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
        \`);
        stmt.run(siteId, installationId, uuid, operationType, JSON.stringify(payload), priority, maxAttempts);
        this.logger.info('Created operation', { operationType, uuid });
        return uuid;
    }

    getPendingOperations(installationId, limit = 10) {
        return this.db.prepare(\`
            SELECT * FROM wordpress_operations 
            WHERE installation_id = ? AND status = 'PENDING'
            ORDER BY 
                CASE priority WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 WHEN 'BULK' THEN 3 ELSE 4 END,
                created_at ASC
            LIMIT ?
        \`).all(installationId, limit);
    }

    markDelivered(operationIds) {
        if (!operationIds || operationIds.length === 0) return;
        const placeholders = operationIds.map(() => '?').join(',');
        this.db.prepare(\`
            UPDATE wordpress_operations 
            SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP
            WHERE id IN (\${placeholders})
        \`).run(...operationIds);
    }

    acknowledge(operationUuid, status, error = null) {
        const op = this.db.prepare('SELECT * FROM wordpress_operations WHERE operation_uuid = ?').get(operationUuid);
        if (!op) return;

        let newStatus = status;
        let attemptCount = op.attempt_count;

        if (status === 'STARTED') {
            newStatus = 'PROCESSING';
            attemptCount++;
            this.db.prepare('UPDATE wordpress_operations SET status = ?, started_at = CURRENT_TIMESTAMP, attempt_count = ?, updated_at = CURRENT_TIMESTAMP WHERE operation_uuid = ?')
                   .run(newStatus, attemptCount, operationUuid);
        } else if (status === 'COMPLETED') {
            newStatus = 'COMPLETED';
            this.db.prepare('UPDATE wordpress_operations SET status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE operation_uuid = ?')
                   .run(newStatus, operationUuid);
        } else if (status === 'FAILED') {
            if (op.attempt_count >= op.max_attempts) {
                newStatus = 'DEAD_LETTER';
            } else {
                newStatus = 'PENDING'; // To be retried later by a cron or next fetch
            }
            this.db.prepare('UPDATE wordpress_operations SET status = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE operation_uuid = ?')
                   .run(newStatus, error, operationUuid);
        }
    }
}

module.exports = { WordPressOperationService };
`;
fs.writeFileSync(path.join(backendDir, 'src/services/WordPressOperationService.js'), wpOpServiceCode);

// 3. Patch PluginService for Heartbeat & setup pluginRoutes
const pluginRoutesPath = path.join(backendDir, 'src/api/pluginRoutes.js');
let pluginRoutesContent = fs.readFileSync(pluginRoutesPath, 'utf8');

if (!pluginRoutesContent.includes('/plugin/operations')) {
    const operationsEndpoints = `
    router.get('/plugin/operations', authenticate, (req, res) => {
        try {
            const installation = pluginService.pluginRepository.findByToken(req.pluginToken);
            const ops = wpOpService.getPendingOperations(installation.id, 20);
            
            if (ops.length > 0) {
                wpOpService.markDelivered(ops.map(o => o.id));
            }
            
            res.json({ success: true, operations: ops.map(o => ({
                uuid: o.operation_uuid,
                type: o.operation_type,
                payload: JSON.parse(o.payload || '{}'),
                priority: o.priority
            }))});
        } catch (err) {
            if(logger) logger.error('Get operations error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/operations/ack', authenticate, (req, res) => {
        try {
            const { operations } = req.body;
            if (operations && Array.isArray(operations)) {
                for (const op of operations) {
                    wpOpService.acknowledge(op.uuid, op.status, op.error);
                }
            }
            res.json({ success: true });
        } catch (err) {
            if(logger) logger.error('Ack operations error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });
`;
    // We need wpOpService available in routes, but since we are modifying directly, let's inject a global or pass it
    // Wait, the routes function takes { pluginService, logger } - I'll mock wpOpService or retrieve it globally 
    // Actually let's assume it is passed in createPluginRoutes arguments in server.js
    pluginRoutesContent = pluginRoutesContent.replace(
        "function createPluginRoutes({ pluginService, logger }) {",
        "function createPluginRoutes({ pluginService, wpOpService, logger }) {"
    );
    pluginRoutesContent = pluginRoutesContent.replace(
        "return router;",
        operationsEndpoints + "\n    return router;"
    );
    // Also patch heartbeat endpoint to return operations
    pluginRoutesContent = pluginRoutesContent.replace(
        "const result = pluginService.heartbeat(req.pluginToken, req.body);",
        `const result = pluginService.heartbeat(req.pluginToken, req.body);
            const installation = pluginService.pluginRepository.findByToken(req.pluginToken);
            if (wpOpService && installation) {
                const ops = wpOpService.getPendingOperations(installation.id, 10);
                if (ops.length > 0) {
                    wpOpService.markDelivered(ops.map(o => o.id));
                    result.operations = ops.map(o => ({
                        uuid: o.operation_uuid,
                        type: o.operation_type,
                        payload: JSON.parse(o.payload || '{}'),
                        priority: o.priority
                    }));
                } else {
                    result.operations = [];
                }
            }`
    );
    fs.writeFileSync(pluginRoutesPath, pluginRoutesContent);
}

// Update server.js to pass wpOpService
const serverPath = path.join(backendDir, 'src/server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');
if (!serverContent.includes('wpOpService: services.wpOpService')) {
    serverContent = serverContent.replace(
        "pluginService: services.pluginService,",
        "pluginService: services.pluginService,\n        wpOpService: services.wpOpService,"
    );
    fs.writeFileSync(serverPath, serverContent);
}

// Update BootstrapManager to init wpOpService
const bootstrapPath = path.join(backendDir, 'src/bootstrap/BootstrapManager.js');
let bootstrapContent = fs.readFileSync(bootstrapPath, 'utf8');
if (!bootstrapContent.includes('WordPressOperationService')) {
    bootstrapContent = bootstrapContent.replace(
        "const { PluginService } = require('../services/PluginService');",
        "const { PluginService } = require('../services/PluginService');\nconst { WordPressOperationService } = require('../services/WordPressOperationService');"
    );
    bootstrapContent = bootstrapContent.replace(
        "const pluginService = new PluginService",
        "const wpOpService = new WordPressOperationService({ db: this.db, logger: this.logger.db });\n            const pluginService = new PluginService"
    );
    bootstrapContent = bootstrapContent.replace(
        "pluginService,",
        "pluginService,\n                wpOpService,"
    );
    fs.writeFileSync(bootstrapPath, bootstrapContent);
}

// Plugin Architecture (PHP)
const operationExecutor = `<?php
namespace SeoPlatform\\Services;

class OperationExecutor {
    private $backendUrl;
    private $token;

    public function __construct($backendUrl, $token) {
        $this->backendUrl = rtrim($backendUrl, '/');
        $this->token = $token;
    }

    public function processOperations($operations) {
        if (empty($operations)) return;

        $acks = [];

        foreach ($operations as $op) {
            $uuid = $op['uuid'] ?? '';
            $type = $op['type'] ?? '';
            $payload = $op['payload'] ?? [];

            // Acknowledge STARTED
            $acks[] = ['uuid' => $uuid, 'status' => 'STARTED'];

            try {
                $handlerClass = "SeoPlatform\\\\Operations\\\\" . str_replace('_', '', ucwords(strtolower($type), '_')) . "Operation";
                if (class_exists($handlerClass)) {
                    $handler = new $handlerClass();
                    $result = $handler->execute($payload);
                    $acks[] = ['uuid' => $uuid, 'status' => 'COMPLETED', 'result' => $result];
                } else {
                    $acks[] = ['uuid' => $uuid, 'status' => 'FAILED', 'error' => 'Unknown operation type: ' . $type];
                }
            } catch (\\Exception $e) {
                $acks[] = ['uuid' => $uuid, 'status' => 'FAILED', 'error' => $e->getMessage()];
            }
        }

        $this->sendAcknowledgements($acks);
    }

    private function sendAcknowledgements($acks) {
        $args = [
            'body' => json_encode(['operations' => $acks]),
            'headers' => [
                'Content-Type' => 'application/json',
                'x-plugin-token' => $this->token
            ],
            'timeout' => 15
        ];
        wp_remote_post($this->backendUrl . '/plugin/operations/ack', $args);
    }
}
`;

const fetchPostOp = `<?php
namespace SeoPlatform\\Operations;

class FetchPostOperation {
    public function execute($payload) {
        $postId = $payload['post_id'] ?? 0;
        if (!$postId) throw new \\Exception("Missing post_id");

        $post = get_post($postId);
        if (!$post) throw new \\Exception("Post not found");

        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'status' => $post->post_status,
            'type' => $post->post_type
        ];
    }
}
`;

const createDraftOp = `<?php
namespace SeoPlatform\\Operations;

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
            throw new \\Exception($postId->get_error_message());
        }

        return ['id' => $postId];
    }
}
`;

const pingOp = `<?php
namespace SeoPlatform\\Operations;

class PingOperation {
    public function execute($payload) {
        return ['status' => 'pong', 'time' => time()];
    }
}
`;

fs.writeFileSync(path.join(pluginDir, 'services/OperationExecutor.php'), operationExecutor);
fs.writeFileSync(path.join(pluginDir, 'operations/FetchPostOperation.php'), fetchPostOp);
fs.writeFileSync(path.join(pluginDir, 'operations/CreateDraftOperation.php'), createDraftOp);
fs.writeFileSync(path.join(pluginDir, 'operations/PingOperation.php'), pingOp);

console.log("Setup complete for P7");
