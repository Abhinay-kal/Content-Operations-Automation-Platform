const crypto = require('crypto');

class WordPressOperationService {
    constructor({ db, logger }) {
        this.db = db;
        this.logger = logger;
    }

    createOperation({ siteId, installationId, operationType, payload = {}, priority = 'NORMAL', maxAttempts = 5 }) {
        const uuid = crypto.randomUUID();
        const stmt = this.db.prepare(`
            INSERT INTO wordpress_operations (
                site_id, installation_id, operation_uuid, operation_type, payload, priority, status, max_attempts
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
        `);
        stmt.run(siteId, installationId, uuid, operationType, JSON.stringify(payload), priority, maxAttempts);
        this.logger.info('Created operation', { operationType, uuid });
        return uuid;
    }

    getPendingOperations(installationId, limit = 10) {
        return this.db.prepare(`
            SELECT * FROM wordpress_operations 
            WHERE installation_id = ? AND status = 'PENDING'
            ORDER BY 
                CASE priority WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 WHEN 'BULK' THEN 3 ELSE 4 END,
                created_at ASC
            LIMIT ?
        `).all(installationId, limit);
    }

    markDelivered(operationIds) {
        if (!operationIds || operationIds.length === 0) return;
        const placeholders = operationIds.map(() => '?').join(',');
        this.db.prepare(`
            UPDATE wordpress_operations 
            SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP
            WHERE id IN (${placeholders})
        `).run(...operationIds);
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
