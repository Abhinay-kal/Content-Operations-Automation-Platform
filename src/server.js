const express = require('express');
const { createStatusRoutes } = require('./api/statusRoutes');
const { createSiteRoutes } = require('./api/siteRoutes');
const { createProjectRoutes } = require('./api/projectRoutes');
const { createJobRoutes } = require('./api/jobRoutes'); // Import job routes
const { createAuditRoutes } = require('./api/auditRoutes'); // Import audit routes
const { createRewriteRoutes } = require('./api/rewriteRoutes'); // Import rewrite routes
const { createPublishingRoutes } = require('./api/publishingRoutes'); // Import publishing routes
const { createWordPressRoutes } = require('./api/wordpressRoutes'); // Import WordPress routes\nconst { createPluginRoutes } = require('./api/pluginRoutes');
const createQueueRouter = require('./routes/queue');
const { loadSecurityConfig } = require('./config/security');
const { createAuthMiddleware } = require('./middleware/auth');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { validateRewriteRequest } = require('./middleware/validation');
const { secureHeaders } = require('./middleware/secureHeaders');

/**
 * Creates and configures the Express application.
 * @param {Object} services - Initialized services from BootstrapManager
 * @returns {express.Application}
 */
function createApp(services) {
    const app = express();
    const { logger } = services;
    
    // Load Security Config
    const securityConfig = loadSecurityConfig();

    app.disable('x-powered-by');
    
    // Trust reverse proxy for accurate rate limiting and client IPs
    // 1 trusts the first hop (e.g. Nginx or HAProxy)
    app.set('trust proxy', 1);
    
    // Apply secure headers middleware
    app.use(secureHeaders);

    // Apply strict body limits
    app.use(express.json({ limit: securityConfig.payloadLimits.rewrite }));

    // Request Logging
    app.use((req, res, next) => {
        logger.server.info('request', { method: req.method, path: req.path });
        next();
    });

    // Rate Limiters
    const rewriteLimiter = createRateLimiter(securityConfig.rateLimits.rewrite);
    const statusLimiter = createRateLimiter(securityConfig.rateLimits.status);
    const healthLimiter = createRateLimiter(securityConfig.rateLimits.health);

    // Authentication Middleware
    const authMiddleware = createAuthMiddleware(securityConfig.apiKeys, logger.server);

    // Routes
    app.use('/', statusLimiter, createStatusRoutes({
        sessionMonitor: services.sessionMonitor,
        queueService: services.queueService,
        metricsService: services.metricsService,
        logger: logger.status || logger.server,
        stateMachine: services.stateMachine,
        browserManager: services.browserManager,
        claudeManager: services.claudeManager,
        recoveryManager: services.recoveryManager
    }));

    // Site Routes (Requires Auth)
    app.use('/', authMiddleware, rewriteLimiter, createSiteRoutes({
        siteService: services.siteService,
        jobService: services.jobService,
        logger: logger.server
    }));

    // Project Routes (Requires Auth)
    app.use('/', authMiddleware, statusLimiter, createProjectRoutes({
        projectService: services.projectService,
        logger: logger.server
    }));

    // Job Routes (Requires Auth)
    app.use('/', authMiddleware, statusLimiter, createJobRoutes({
        jobService: services.jobService,
        logRepository: services.logRepository,
        logger: logger.server
    }));

    // Audit Routes (Requires Auth)
    app.use('/', authMiddleware, statusLimiter, createAuditRoutes({
        projectService: services.projectService,
        jobService: services.jobService,
        logger: logger.server
    }));

    // Rewrite Routes (Requires Auth)
    app.use('/', authMiddleware, statusLimiter, createRewriteRoutes({
        projectService: services.projectService,
        jobService: services.jobService,
        logger: logger.server
    }));

    // Publishing Routes (Requires Auth)
    app.use('/', authMiddleware, statusLimiter, createPublishingRoutes({
        publishingService: services.publishingService,
        logger: logger.server
    }));

    // Queue Routes (Requires Auth)
    app.use('/', authMiddleware, statusLimiter, createQueueRouter({
        jobService: services.jobService,
        logger: logger.server
    }));

    // Plugin Routes\n    app.use('/', statusLimiter, createPluginRoutes({\n        pluginService: services.pluginService,\n        logger: logger.server\n    }));\n\n    // WordPress & Content Routes (Requires Auth)
    app.use('/', authMiddleware, rewriteLimiter, createWordPressRoutes({
        syncService: services.syncService,
        wordpressRepository: services.wordpressRepository,
        logger: logger.server
    }));

    app.get('/health', healthLimiter, async (req, res) => {
        try {
            const status = services.sessionMonitor.getStatus();
            const state = status.state;
            
            // In Phase 4, we define "healthy" as READY, HEALTHY, or BUSY.
            // Any other state (STARTING, DEGRADED, BROKEN, RECOVERING) is considered unhealthy for traffic.
            if (state === 'HEALTHY' || state === 'READY' || state === 'BUSY') {
                return res.json({ 
                    status: 'healthy', 
                    state: state,
                    ready: true 
                });
            }

            logger.health.warn('health degraded', { state: state });
            return res.status(503).json({ 
                status: 'unhealthy', 
                state: state,
                ready: false 
            });
        } catch (error) {
            logger.health.error('health check failed', { error: error.message });
            return res.status(503).json({ 
                status: 'broken',
                ready: false 
            });
        }
    });

    app.get('/metrics', statusLimiter, async (req, res) => {
        try {
            const metrics = services.metricsService.getSnapshot();
            return res.json(metrics);
        } catch (error) {
            logger.status.error('metrics fetch failed', { error: error.message });
            return res.status(500).json({ error: 'internal_error' });
        }
    });

    app.post('/rewrite', 
        authMiddleware,
        rewriteLimiter,
        validateRewriteRequest,
        async (req, res) => {
        logger.rewrite.info('request start');

        try {
            const prompt = req.body.prompt;
            const wpPostId = req.body.wp_post_id;
            
            // Legacy endpoint always maps to Default Site (ID 1)
            const siteId = req.body.site_id || 1;

            const response = await services.worker.rewrite(prompt, wpPostId, siteId);

            logger.rewrite.info('request finish', { success: true });
            return res.json({
                success: true,
                response
            });
        } catch (error) {
            logger.rewrite.error('request error', { error: error.message });

            if (error.message === 'Authentication required') {
                return res.status(401).json({
                    success: false,
                    error: error.message
                });
            }

            if (error.message === 'worker_unavailable') {
                return res.status(503).json({
                    success: false,
                    error: 'worker_unavailable'
                });
            }

            if (error.message === 'response_timeout') {
                return res.status(504).json({
                    success: false,
                    error: 'response_timeout'
                });
            }

            return res.status(500).json({
                success: false,
                error: error.message || 'unknown_error'
            });
        }
    });

    // Global Error Handler
    app.use((error, req, res, next) => {
        // Express body-parser errors (like limit exceeded)
        if (error.type === 'entity.too.large') {
            logger.server.error('payload too large', { limit: error.limit });
            return res.status(413).json({ success: false, error: 'Payload Too Large' });
        }
        
        logger.server.error('unhandled error', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'internal_error'
        });
    });

    return app;
}

module.exports = {
    createApp
};
