class DashboardReadService {
    constructor({ db }) {
        this.db = db;
    }

    getOverview() {
        const totalSites = this.db.prepare('SELECT COUNT(*) as c FROM sites').get().c;
        const totalProjects = this.db.prepare('SELECT COUNT(*) as c FROM content_projects').get().c;
        
        // Group by content status
        const projStatusRows = this.db.prepare('SELECT status, COUNT(*) as c FROM content_projects GROUP BY status').all();
        const projectsByStatus = {};
        for (const row of projStatusRows) {
            projectsByStatus[row.status] = row.c;
        }

        // Group by workflow state inside metadata
        const workflowRows = this.db.prepare(`
            SELECT json_extract(metadata, '$.workflow_state') as state, COUNT(*) as c 
            FROM content_projects 
            GROUP BY json_extract(metadata, '$.workflow_state')
        `).all();
        
        const wfState = {};
        for (const row of workflowRows) {
            if (row.state) wfState[row.state] = row.c;
        }

        const jobRows = this.db.prepare('SELECT status, COUNT(*) as c FROM jobs GROUP BY status').all();
        const jobsByStatus = {};
        for (const row of jobRows) {
            jobsByStatus[row.status] = row.c;
        }

        const opsPending = this.db.prepare("SELECT COUNT(*) as c FROM wordpress_operations WHERE status = 'PENDING'").get().c;

        return {
            total_sites: totalSites,
            total_projects: totalProjects,
            projects_new: projectsByStatus['NEW'] || 0,
            projects_stale: projectsByStatus['STALE'] || 0,
            projects_review_pending: wfState['REVIEW_PENDING'] || 0,
            pending_audits: wfState['AUDIT_PENDING'] || 0,
            pending_rewrites: wfState['REWRITE_PENDING'] || 0,
            jobs_processing: jobsByStatus['PROCESSING'] || 0,
            jobs_failed: jobsByStatus['FAILED'] || 0,
            operations_pending: opsPending,
            drafts_waiting_review: wfState['REVIEW_PENDING'] || 0
        };
    }

    getSites(pagination) {
        // Implementation mock for DTO adherence
        const rows = this.db.prepare(`
            SELECT * FROM sites 
            ORDER BY ${pagination.sort} ${pagination.direction}
            LIMIT ? OFFSET ?
        `).all(pagination.limit, pagination.offset);

        const total = this.db.prepare('SELECT COUNT(*) as c FROM sites').get().c;

        const data = rows.map(r => ({
            id: r.id,
            name: r.name,
            domain: r.domain,
            active: !!r.active,
            postsCount: 0,
            projectsCount: 0,
            pendingAudits: 0,
            pendingRewrites: 0,
            pendingReviews: 0,
            lastHeartbeat: "",
            presence: "ONLINE",
            createdAt: r.created_at
        }));

        return { data, total };
    }

    getProjects(pagination) {
        const rows = this.db.prepare(`
            SELECT * FROM content_projects 
            ORDER BY ${pagination.sort} ${pagination.direction}
            LIMIT ? OFFSET ?
        `).all(pagination.limit, pagination.offset);
        
        const total = this.db.prepare('SELECT COUNT(*) as c FROM content_projects').get().c;

        const data = rows.map(r => this.mapProjectDto(r));

        return { data, total };
    }

    getProjectById(id) {
        const row = this.db.prepare('SELECT * FROM content_projects WHERE id = ?').get(id);
        if (!row) return null;
        return this.mapProjectDto(row);
    }

    getJobs(pagination) {
        const rows = this.db.prepare(`
            SELECT * FROM jobs 
            ORDER BY ${pagination.sort} ${pagination.direction}
            LIMIT ? OFFSET ?
        `).all(pagination.limit, pagination.offset);
        const total = this.db.prepare('SELECT COUNT(*) as c FROM jobs').get().c;

        const data = rows.map(r => ({
            id: r.id,
            projectId: r.project_id,
            siteId: r.site_id,
            type: r.type,
            status: r.status,
            priority: r.priority,
            attemptCount: 1, // mock
            createdAt: r.created_at,
            startedAt: r.updated_at,
            completedAt: r.status === 'COMPLETED' ? r.updated_at : null,
            runtimeMs: 0
        }));

        return { data, total };
    }

    getEvents(pagination) {
        const rows = this.db.prepare(`
            SELECT * FROM event_ingestion 
            ORDER BY ${pagination.sort} ${pagination.direction}
            LIMIT ? OFFSET ?
        `).all(pagination.limit, pagination.offset);
        const total = this.db.prepare('SELECT COUNT(*) as c FROM event_ingestion').get().c;

        return { data: rows, total };
    }

    getOperations(pagination) {
        const rows = this.db.prepare(`
            SELECT * FROM wordpress_operations 
            ORDER BY ${pagination.sort} ${pagination.direction}
            LIMIT ? OFFSET ?
        `).all(pagination.limit, pagination.offset);
        const total = this.db.prepare('SELECT COUNT(*) as c FROM wordpress_operations').get().c;

        return { data: rows, total };
    }

    
    getSiteById(id) {
        const r = this.db.prepare('SELECT * FROM sites WHERE id = ?').get(id);
        if (!r) return null;
        return {
            id: r.id,
            name: r.name,
            domain: r.domain,
            active: !!r.active,
            postsCount: 0,
            projectsCount: 0,
            pendingAudits: 0,
            pendingRewrites: 0,
            pendingReviews: 0,
            lastHeartbeat: "",
            presence: "ONLINE",
            createdAt: r.created_at
        };
    }

    getSitePlugin(siteId) {
        // mock for UI unblocking, real implementation would join plugin_installations
        return {
            version: '1.0.0',
            protocol: 'v1',
            backendVersion: '1.0.0',
            registrationStatus: 'REGISTERED',
            tokenStatus: 'VALID',
            lastHeartbeat: new Date().toISOString(),
            consecutiveFailures: 0,
            presence: 'ONLINE'
        };
    }

    getSiteSettings(siteId) {
        let settings = this.db.prepare('SELECT * FROM site_workflow_settings WHERE site_id = ?').get(siteId);
        if (!settings) {
            settings = {
                site_id: siteId,
                audit_threshold: 75,
                rewrite_threshold: 70,
                auto_reaudit_days: 30,
                auto_rewrite_enabled: 0,
                auto_publish_enabled: 0
            };
        }
        return {
            auditThreshold: settings.audit_threshold,
            rewriteThreshold: settings.rewrite_threshold,
            autoReauditDays: settings.auto_reaudit_days,
            autoRewriteEnabled: !!settings.auto_rewrite_enabled,
            autoPublishEnabled: !!settings.auto_publish_enabled
        };
    }

    updateSiteSettings(siteId, data) {
        const current = this.db.prepare('SELECT * FROM site_workflow_settings WHERE site_id = ?').get(siteId);
        if (current) {
            this.db.prepare(`
                UPDATE site_workflow_settings SET
                    audit_threshold = ?,
                    rewrite_threshold = ?,
                    auto_reaudit_days = ?,
                    auto_rewrite_enabled = ?,
                    auto_publish_enabled = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE site_id = ?
            `).run(
                data.auditThreshold, data.rewriteThreshold, data.autoReauditDays, 
                data.autoRewriteEnabled ? 1 : 0, data.autoPublishEnabled ? 1 : 0, siteId
            );
        } else {
            this.db.prepare(`
                INSERT INTO site_workflow_settings (site_id, audit_threshold, rewrite_threshold, auto_reaudit_days, auto_rewrite_enabled, auto_publish_enabled)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                siteId, data.auditThreshold, data.rewriteThreshold, data.autoReauditDays, 
                data.autoRewriteEnabled ? 1 : 0, data.autoPublishEnabled ? 1 : 0
            );
        }
    }

    getSiteOperations(siteId, pagination) {
        const rows = this.db.prepare(`
            SELECT * FROM wordpress_operations WHERE site_id = ?
            ORDER BY ${pagination.sort} ${pagination.direction}
            LIMIT ? OFFSET ?
        `).all(siteId, pagination.limit, pagination.offset);
        const total = this.db.prepare('SELECT COUNT(*) as c FROM wordpress_operations WHERE site_id = ?').get(siteId).c;
        return { data: rows, total };
    }

    getSiteEvents(siteId, pagination) {
        // mock site events using project events or ingestion
        // Since we don't have a site_id in event_ingestion cleanly mapped in this mock phase, we'll return empty for now
        return { data: [], total: 0 };
    }

    mapProjectDto(row) {
        let meta = {};
        try { meta = JSON.parse(row.metadata || '{}'); } catch(e) {}
        
        return {
            id: row.id,
            siteId: row.site_id,
            wpPostId: row.wp_post_id,
            title: "Project " + row.id,
            slug: "project-" + row.id,
            contentState: row.status,
            workflowState: meta.workflow_state || "IDLE",
            auditScore: meta.audit_score || null,
            intentScore: null,
            eeatScore: null,
            latestAuditId: null,
            latestRewriteId: null,
            lastSyncAt: meta.last_synced_at || "",
            lastAuditAt: "",
            lastRewriteAt: "",
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
module.exports = { DashboardReadService };
