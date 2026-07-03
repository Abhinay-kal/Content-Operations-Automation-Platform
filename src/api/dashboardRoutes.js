const express = require('express');
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
            const filters = { siteId: req.query.siteId, contentState: req.query.contentState, workflowState: req.query.workflowState, search: req.query.search };
            const { data, total } = dashboardReadService.getProjects(p, filters);
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

    
    
    router.get('/dashboard/audits/:id', (req, res) => {
        try {
            const data = dashboardReadService.getAuditById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Audit not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    
    router.get('/dashboard/rewrites/:id', (req, res) => {
        try {
            const data = dashboardReadService.getRewriteById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Rewrite not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id/rewrites', (req, res) => {
        try {
            const data = dashboardReadService.getProjectRewrites(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    
    router.get('/dashboard/reviews', (req, res) => {
        try {
            const p = parsePagination(req);
            const filters = { 
                siteId: req.query.siteId, 
                status: req.query.status, 
                changeSeverity: req.query.changeSeverity,
                assignment: req.query.assignment,
                userId: req.query.userId
            };
            const { data, total } = dashboardReadService.getReviews(p, filters);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            // fallback for missing schema in fresh run
            return sendSuccess(res, [], { ...p, total: 0, pages: 0 });
        }
    });

    router.get('/dashboard/reviews/:id', (req, res) => {
        try {
            const data = dashboardReadService.getReviewById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Review not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/approve', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'APPROVED');
            return sendSuccess(res, { status: 'APPROVED' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/reject', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'REJECTED');
            return sendSuccess(res, { status: 'REJECTED' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/request-changes', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'NEEDS_REVISION');
            return sendSuccess(res, { status: 'NEEDS_REVISION' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/publish', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'PUBLISHED');
            // publish workflow hook would go here
            return sendSuccess(res, { status: 'PUBLISHED' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/assign', express.json(), (req, res) => {
        try {
            dashboardReadService.assignReviewer(req.params.id, req.body.reviewerId);
            return sendSuccess(res, dashboardReadService.getReviewById(req.params.id));
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/versions/:id', (req, res) => {
        try {
            const data = dashboardReadService.getVersionById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Version not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id/versions', (req, res) => {
        try {
            const data = dashboardReadService.getProjectVersions(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id/audits', (req, res) => {
        try {
            const data = dashboardReadService.getProjectAudits(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id/history', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getProjectHistory(req.params.id, p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
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

    
    router.get('/dashboard/sites/:id', (req, res) => {
        try {
            const data = dashboardReadService.getSiteById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.SITE_NOT_FOUND, 'Site not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/plugin', (req, res) => {
        try {
            const data = dashboardReadService.getSitePlugin(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/settings', (req, res) => {
        try {
            const data = dashboardReadService.getSiteSettings(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.put('/dashboard/sites/:id/settings', express.json(), (req, res) => {
        try {
            dashboardReadService.updateSiteSettings(req.params.id, req.body);
            return sendSuccess(res, dashboardReadService.getSiteSettings(req.params.id));
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/operations', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getSiteOperations(req.params.id, p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/events', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getSiteEvents(req.params.id, p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    return router;
}

module.exports = { createDashboardRoutes };
