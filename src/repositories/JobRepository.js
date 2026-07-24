const VALID_STATUSES = [
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED"
];

class JobRepository {
    constructor(db) {
        this.db = db;
    }

    _validateStatus(status) {
        if (!VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of ${VALID_STATUSES.join(', ')}`);
        }
    }

    async createJob({ siteId, projectId, type = 'REWRITE', priority = 'NORMAL', prompt = null, auditPromptSnapshot = null, rewritePromptSnapshot = null }) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO jobs (site_id, project_id, type, status, priority, prompt, audit_prompt_snapshot, rewrite_prompt_snapshot, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(siteId, projectId, type, 'PENDING', priority, prompt, auditPromptSnapshot, rewritePromptSnapshot, now, now);
        return this.getJobById(info.lastInsertRowid);
    }

    async getJobById(id) {
        const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
        return stmt.get(id);
    }

    async getJobsBySiteId(siteId) {
        const stmt = this.db.prepare('SELECT * FROM jobs WHERE site_id = ? ORDER BY created_at DESC');
        return stmt.all(siteId);
    }

    async getJobsByProjectId(projectId) {
        const stmt = this.db.prepare('SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at DESC');
        return stmt.all(projectId);
    }

    async getPendingJobs() {
        const stmt = this.db.prepare(`
            WITH RankedJobs AS (
                SELECT *,
                       ROW_NUMBER() OVER (
                           PARTITION BY priority, site_id 
                           ORDER BY created_at ASC
                       ) as site_rank
                FROM jobs
                WHERE status = 'PENDING'
            )
            SELECT * FROM RankedJobs
            ORDER BY 
                CASE priority 
                    WHEN 'HIGH' THEN 1 
                    WHEN 'NORMAL' THEN 2 
                    WHEN 'BULK' THEN 3 
                    ELSE 4 
                END ASC,
                site_rank ASC,
                site_id ASC
        `);
        return stmt.all();
    }

    async getQueueSummary() {
        const stmt = this.db.prepare(`
            SELECT status, COUNT(*) as count 
            FROM jobs 
            GROUP BY status
        `);
        const rows = stmt.all();
        
        const summary = {
            PENDING: 0,
            PROCESSING: 0,
            COMPLETED: 0,
            FAILED: 0
        };
        
        rows.forEach(row => {
            if (summary.hasOwnProperty(row.status)) {
                summary[row.status] = row.count;
            }
        });
        
        return summary;
    }

    async getQueueStats() {
        const stmt = this.db.prepare(`
            SELECT 
                AVG(strftime('%s', updated_at) - strftime('%s', created_at)) as avg_runtime,
                site_id,
                COUNT(*) as job_count
            FROM jobs
            WHERE status = 'COMPLETED'
            GROUP BY site_id
        `);
        const rows = stmt.all();
        
        const jobsPerSite = {};
        let totalRuntime = 0;
        let completedJobs = 0;
        
        rows.forEach(row => {
            jobsPerSite[row.site_id] = row.job_count;
            totalRuntime += (row.avg_runtime || 0) * row.job_count;
            completedJobs += row.job_count;
        });

        // Calculate success rate
        const totalJobs = this.db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status IN ('COMPLETED', 'FAILED')").get().count;
        const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 100;

        return {
            averageRuntime: completedJobs > 0 ? Math.round(totalRuntime / completedJobs) : 0,
            jobsPerSite,
            successRate: Math.round(successRate * 100) / 100
        };
    }

    async getSiteQueue(siteId) {
        const stmt = this.db.prepare(`
            SELECT jobs.*, cp.wp_post_id, p.title as post_title 
            FROM jobs 
            LEFT JOIN content_projects cp ON jobs.project_id = cp.id
            LEFT JOIN posts p ON cp.wp_post_id = p.wp_post_id AND p.site_id = jobs.site_id
            WHERE jobs.site_id = ? 
            AND jobs.status IN ('PENDING', 'PROCESSING', 'COMPLETED')
            ORDER BY jobs.updated_at DESC
        `);
        const rows = stmt.all(siteId);
        
        return {
            pending: rows.filter(r => r.status === 'PENDING'),
            processing: rows.filter(r => r.status === 'PROCESSING'),
            completed: rows.filter(r => r.status === 'COMPLETED')
        };
    }

    async markProcessing(id) {
        return this._updateStatus(id, 'PROCESSING');
    }

    async markCompleted(id) {
        return this._updateStatus(id, 'COMPLETED');
    }

    async markFailed(id, error) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE jobs 
            SET status = ?, error = ?, updated_at = ?
            WHERE id = ?
        `);
        stmt.run('FAILED', error, now, id);
        return this.getJobById(id);
    }

    async _updateStatus(id, status) {
        this._validateStatus(status);
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE jobs 
            SET status = ?, updated_at = ?
            WHERE id = ?
        `);
        stmt.run(status, now, id);
        return this.getJobById(id);
    }

    async updateTimestamp(id) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE jobs 
            SET updated_at = ?
            WHERE id = ?
        `);
        stmt.run(now, id);
        return this.getJobById(id);
    }

    async deleteJob(id) {
        const stmt = this.db.prepare('DELETE FROM jobs WHERE id = ?');
        const info = stmt.run(id);
        return info.changes > 0;
    }

    async recoverProcessingJobs() {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE jobs 
            SET status = 'PENDING', updated_at = ?
            WHERE status = 'PROCESSING'
        `);
        const info = stmt.run(now);
        return info.changes;
    }
}

module.exports = {
    JobRepository,
    VALID_STATUSES
};
