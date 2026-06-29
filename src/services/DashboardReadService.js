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
