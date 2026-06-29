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
