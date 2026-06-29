const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 1. Error Registry
const errorsJs = `const ErrorCodes = {
    PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
    SITE_NOT_FOUND: 'SITE_NOT_FOUND',
    JOB_NOT_FOUND: 'JOB_NOT_FOUND',
    PLUGIN_OFFLINE: 'PLUGIN_OFFLINE',
    AUTH_FAILED: 'AUTH_FAILED',
    INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
    WORDPRESS_UNREACHABLE: 'WORDPRESS_UNREACHABLE',
    CLAUDE_TIMEOUT: 'CLAUDE_TIMEOUT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

class ApiError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

module.exports = { ErrorCodes, ApiError };
`;
fs.writeFileSync(path.join(backendDir, 'src/utils/errors.js'), errorsJs);

// 2. Response Standardizer
const responseJs = `function sendSuccess(res, data = {}, pagination = null) {
    const payload = {
        success: true,
        data,
        meta: {},
        errors: []
    };
    if (pagination) {
        payload.pagination = pagination;
    }
    return res.json(payload);
}

function sendError(res, errorObj) {
    const code = errorObj.code || 'INTERNAL_ERROR';
    const message = errorObj.message || 'An unexpected error occurred';
    const statusCode = errorObj.statusCode || 500;

    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message
        }
    });
}

function parsePagination(req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const sort = req.query.sort || 'created_at';
    const direction = (req.query.direction || 'desc').toUpperCase();
    
    return {
        page,
        limit,
        sort,
        direction: direction === 'ASC' ? 'ASC' : 'DESC',
        offset: (page - 1) * limit
    };
}

module.exports = { sendSuccess, sendError, parsePagination };
`;
fs.writeFileSync(path.join(backendDir, 'src/utils/response.js'), responseJs);

// 3. Dashboard Read Service (Aggregator)
const readServiceJs = `class DashboardReadService {
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
        const workflowRows = this.db.prepare(\`
            SELECT json_extract(metadata, '$.workflow_state') as state, COUNT(*) as c 
            FROM content_projects 
            GROUP BY json_extract(metadata, '$.workflow_state')
        \`).all();
        
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
        const rows = this.db.prepare(\`
            SELECT * FROM sites 
            ORDER BY \${pagination.sort} \${pagination.direction}
            LIMIT ? OFFSET ?
        \`).all(pagination.limit, pagination.offset);

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
        const rows = this.db.prepare(\`
            SELECT * FROM content_projects 
            ORDER BY \${pagination.sort} \${pagination.direction}
            LIMIT ? OFFSET ?
        \`).all(pagination.limit, pagination.offset);
        
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
        const rows = this.db.prepare(\`
            SELECT * FROM jobs 
            ORDER BY \${pagination.sort} \${pagination.direction}
            LIMIT ? OFFSET ?
        \`).all(pagination.limit, pagination.offset);
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
        const rows = this.db.prepare(\`
            SELECT * FROM event_ingestion 
            ORDER BY \${pagination.sort} \${pagination.direction}
            LIMIT ? OFFSET ?
        \`).all(pagination.limit, pagination.offset);
        const total = this.db.prepare('SELECT COUNT(*) as c FROM event_ingestion').get().c;

        return { data: rows, total };
    }

    getOperations(pagination) {
        const rows = this.db.prepare(\`
            SELECT * FROM wordpress_operations 
            ORDER BY \${pagination.sort} \${pagination.direction}
            LIMIT ? OFFSET ?
        \`).all(pagination.limit, pagination.offset);
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
`;
fs.writeFileSync(path.join(backendDir, 'src/services/DashboardReadService.js'), readServiceJs);

// 4. Dashboard Routes
const routesJs = `const express = require('express');
const { sendSuccess, sendError, parsePagination } = require('../utils/response');
const { ApiError, ErrorCodes } = require('../utils/errors');

function createDashboardRoutes({ dashboardReadService, logger }) {
    const router = express.Router();

    router.get('/dashboard/overview', (req, res) => {
        try {
            const data = dashboardReadService.getOverview();
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getSites(p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getProjects(p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id', (req, res) => {
        try {
            const data = dashboardReadService.getProjectById(req.params.id);
            if (!data) {
                return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Project does not exist.', 404));
            }
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/jobs', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getJobs(p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/events', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getEvents(p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/operations', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getOperations(p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });
    
    router.get('/dashboard/reviews', (req, res) => {
        try {
            const p = parsePagination(req);
            // reviews mock to unblock UI
            return sendSuccess(res, [], { ...p, total: 0, pages: 0 });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    return router;
}

module.exports = { createDashboardRoutes };
`;
fs.writeFileSync(path.join(backendDir, 'src/api/dashboardRoutes.js'), routesJs);

// 5. Update server.js
const serverPath = path.join(backendDir, 'src/server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');
if (!serverContent.includes('createDashboardRoutes')) {
    serverContent = serverContent.replace(
        "const { createPluginRoutes } = require('./api/pluginRoutes');",
        "const { createPluginRoutes } = require('./api/pluginRoutes');\nconst { createDashboardRoutes } = require('./api/dashboardRoutes');"
    );

    const useDashboard = `
    // Dashboard Read APIs (Requires Auth but mounted under dashboard space)
    app.use('/', authMiddleware, statusLimiter, createDashboardRoutes({
        dashboardReadService: services.dashboardReadService,
        logger: logger.server
    }));
`;
    serverContent = serverContent.replace(
        "// Queue Routes (Requires Auth)",
        useDashboard + "\n    // Queue Routes (Requires Auth)"
    );
    fs.writeFileSync(serverPath, serverContent);
}

// 6. Update BootstrapManager.js
const bootstrapPath = path.join(backendDir, 'src/bootstrap/BootstrapManager.js');
let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
if (!bootstrap.includes('DashboardReadService')) {
    bootstrap = bootstrap.replace(
        "const { WordPressOperationService } = require('../services/WordPressOperationService');",
        "const { WordPressOperationService } = require('../services/WordPressOperationService');\nconst { DashboardReadService } = require('../services/DashboardReadService');"
    );

    bootstrap = bootstrap.replace(
        "const wpOpService = new WordPressOperationService({ db: this.db, logger: this.logger.db });",
        "const dashboardReadService = new DashboardReadService({ db: this.db });\n            const wpOpService = new WordPressOperationService({ db: this.db, logger: this.logger.db });"
    );

    bootstrap = bootstrap.replace(
        "wpOpService,",
        "wpOpService,\n                dashboardReadService,"
    );
    fs.writeFileSync(bootstrapPath, bootstrap);
}

console.log("Setup complete for Phase 16.0");
