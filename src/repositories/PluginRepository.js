class PluginRepository {
    constructor(db) {
        this.db = db;
    }

    createInstallation(data) {
        const stmt = this.db.prepare(`
            INSERT INTO plugin_installations (
                site_id, plugin_uuid, installation_uuid, registration_token,
                plugin_version, protocol_version, backend_version, capabilities,
                connection_status, registration_status, presence_status,
                last_seen, last_heartbeat, last_ip, last_user_agent, metadata,
                created_at, updated_at
            ) VALUES (
                @site_id, @plugin_uuid, @installation_uuid, @registration_token,
                @plugin_version, @protocol_version, @backend_version, @capabilities,
                @connection_status, @registration_status, @presence_status,
                @last_seen, @last_heartbeat, @last_ip, @last_user_agent, @metadata,
                @created_at, @updated_at
            )
        `);
        const info = stmt.run(data);
        return info.lastInsertRowid;
    }

    updateInstallation(id, data) {
        const updates = Object.keys(data).map(key => `${key} = @${key}`).join(', ');
        const stmt = this.db.prepare(`UPDATE plugin_installations SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
        stmt.run({ id, ...data });
    }

    findByUuid(installation_uuid) {
        return this.db.prepare(`SELECT * FROM plugin_installations WHERE installation_uuid = ?`).get(installation_uuid);
    }

    findByToken(registration_token) {
        return this.db.prepare(`SELECT * FROM plugin_installations WHERE registration_token = ?`).get(registration_token);
    }

    updateHeartbeat(id, data) {
        const stmt = this.db.prepare(`
            UPDATE plugin_installations 
            SET last_seen = @last_seen, last_heartbeat = @last_heartbeat, presence_status = @presence_status, updated_at = CURRENT_TIMESTAMP 
            WHERE id = @id
        `);
        stmt.run({ id, ...data });
    }

    updateCapabilities(id, capabilities) {
        const stmt = this.db.prepare(`UPDATE plugin_installations SET capabilities = @capabilities, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
        stmt.run({ id, capabilities });
    }

    updatePresence(id, presence_status) {
        const stmt = this.db.prepare(`UPDATE plugin_installations SET presence_status = @presence_status, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
        stmt.run({ id, presence_status });
    }
}

module.exports = { PluginRepository };
