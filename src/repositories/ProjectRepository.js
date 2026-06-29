const { ContentProject, PROJECT_STATUSES } = require('../models/ContentProject');

class ProjectRepository {
    findByWpPostId(siteId, wpPostId) {
        return this.db.prepare(`SELECT * FROM content_projects WHERE site_id = ? AND wp_post_id = ?`).get(siteId, wpPostId);
    }

    constructor(db) {
        this.db = db;
    }

    async getProjectsByStatus(status) {
        const rows = this.db.prepare('SELECT * FROM content_projects WHERE status = ?').all(status);
        return rows.map(row => new ContentProject(row));
    }

    async createProject(siteId, wpPostId) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO content_projects (site_id, wp_post_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        try {
            const info = stmt.run(siteId, wpPostId, PROJECT_STATUSES.CREATED, now, now);
            return this.getProjectById(info.lastInsertRowid);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return this.getProjectByWpPostId(siteId, wpPostId);
            }
            throw error;
        }
    }

    async getProjectById(id) {
        const row = this.db.prepare('SELECT * FROM content_projects WHERE id = ?').get(id);
        return row ? new ContentProject(row) : null;
    }

    async getProjectByWpPostId(siteId, wpPostId) {
        const row = this.db.prepare('SELECT * FROM content_projects WHERE site_id = ? AND wp_post_id = ?').get(siteId, wpPostId);
        return row ? new ContentProject(row) : null;
    }

    async createVersion(projectId, siteId, versionNumber, contentType, content) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO content_versions (project_id, site_id, version_number, content_type, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(projectId, siteId, versionNumber, contentType, content, now);
        return info.lastInsertRowid;
    }

    async getLatestVersion(projectId, contentType) {
        const stmt = this.db.prepare(`
            SELECT * FROM content_versions 
            WHERE project_id = ? AND content_type = ? 
            ORDER BY version_number DESC LIMIT 1
        `);
        return stmt.get(projectId, contentType);
    }

    async getVersionsByProjectId(projectId) {
        const stmt = this.db.prepare('SELECT * FROM content_versions WHERE project_id = ? ORDER BY version_number ASC');
        return stmt.all(projectId);
    }

    async getAuditsByProjectId(projectId) {
        const stmt = this.db.prepare('SELECT * FROM audits WHERE project_id = ? ORDER BY created_at DESC');
        const rows = stmt.all(projectId);
        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {}
            }
            return row;
        });
    }

    async createAudit({ siteId, projectId, result, score, metadata }) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO audits (site_id, project_id, result, score, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(siteId, projectId, result, score, JSON.stringify(metadata), now);
        return this.getAuditById(info.lastInsertRowid);
    }

    async getAuditById(id) {
        const row = this.db.prepare('SELECT * FROM audits WHERE id = ?').get(id);
        if (row && row.metadata) {
            try {
                row.metadata = JSON.parse(row.metadata);
            } catch (e) {}
        }
        return row;
    }

    async getRewritesByProjectId(projectId) {
        const stmt = this.db.prepare('SELECT * FROM rewrites WHERE project_id = ? ORDER BY created_at DESC');
        const rows = stmt.all(projectId);
        return rows.map(row => {
            if (row.metadata) {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {}
            }
            return row;
        });
    }

    async createRewrite({ siteId, projectId, auditId, optimizedContent, metadata }) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO rewrites (site_id, project_id, audit_id, optimized_content, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(siteId, projectId, auditId, optimizedContent, JSON.stringify(metadata), now);
        return this.getRewriteById(info.lastInsertRowid);
    }

    async getRewriteById(id) {
        const row = this.db.prepare('SELECT * FROM rewrites WHERE id = ?').get(id);
        if (row && row.metadata) {
            try {
                row.metadata = JSON.parse(row.metadata);
            } catch (e) {}
        }
        return row;
    }

    async updateStatus(id, status) {
        const currentProject = await this.getProjectById(id);
        if (!currentProject) {
            throw new Error(`Project ${id} not found`);
        }

        if (currentProject.status === status) return currentProject;

        if (!ContentProject.isValidTransition(currentProject.status, status)) {
            throw new Error(`Invalid project transition: ${currentProject.status} -> ${status}`);
        }

        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            UPDATE content_projects 
            SET status = ?, updated_at = ?
            WHERE id = ?
        `);
        stmt.run(status, now, id);
        return this.getProjectById(id);
    }
}

module.exports = { ProjectRepository };
