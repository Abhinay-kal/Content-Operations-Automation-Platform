const express = require('express');

function createPluginRoutes({ pluginService, wpOpService, jobService, logger }) {
    const router = express.Router();

    const authenticate = (req, res, next) => {
        const token = req.headers['x-plugin-token'] || req.body.token;
        if (!token || !pluginService.validate(token)) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        req.pluginToken = token;
        next();
    };

    router.post('/plugin/handshake', (req, res) => {
        try {
            const result = pluginService.handshake(req.body);
            res.json({ success: true, data: result });
        } catch (err) {
            logger.error('Handshake error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/register', async (req, res) => {
        try {
            if (!req.body.site_url || !req.body.plugin_uuid || !req.body.installation_uuid) {
                return res.status(400).json({ success: false, error: 'Missing required parameters (need site_url, plugin_uuid, installation_uuid)' });
            }
            const result = await pluginService.register({ ...req.body, ip: req.ip, user_agent: req.headers['user-agent'] });
            res.json({ success: true, data: result });
        } catch (err) {
            logger.error('Register error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/heartbeat', authenticate, (req, res) => {
        try {
            const result = pluginService.heartbeat(req.pluginToken, req.body);
            const installation = pluginService.pluginRepository.findByToken(req.pluginToken);
            if (wpOpService && installation) {
                const ops = wpOpService.getPendingOperations(installation.id, 10);
                if (ops.length > 0) {
                    wpOpService.markDelivered(ops.map(o => o.id));
                    result.operations = ops.map(o => ({
                        uuid: o.operation_uuid,
                        type: o.operation_type,
                        payload: JSON.parse(o.payload || '{}'),
                        priority: o.priority
                    }));
                } else {
                    result.operations = [];
                }
            }
            res.json({ success: true, data: result });
        } catch (err) {
            logger.error('Heartbeat error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/disconnect', authenticate, (req, res) => {
        try {
            pluginService.disconnect(req.pluginToken);
            res.json({ success: true });
        } catch (err) {
            logger.error('Disconnect error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/renew', authenticate, (req, res) => {
        try {
            const result = pluginService.renew(req.pluginToken);
            res.json({ success: true, data: result });
        } catch (err) {
            logger.error('Renew error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.get('/plugin/capabilities', authenticate, (req, res) => {
        res.json({ success: true, data: { capabilities: ['basic'] } });
    });

    
    router.post('/plugin/events', authenticate, (req, res) => {
        try {
            const events = req.body.events;
            if (!events || !Array.isArray(events)) {
                return res.status(400).json({ success: false, error: 'Invalid payload schema' });
            }
            
            if (pluginService.pluginRepository) {
                const stmt = pluginService.pluginRepository.db.prepare(`
                    INSERT INTO event_ingestion (
                        installation_id, event_id, event_type, entity_type, entity_id, payload, received_at
                    ) VALUES (
                        @installation_id, @event_id, @event_type, @entity_type, @entity_id, @payload, CURRENT_TIMESTAMP
                    )
                `);
                
                const installation = pluginService.pluginRepository.findByToken(req.pluginToken);
                
                for (const event of events) {
                    try {
                        stmt.run({
                            installation_id: installation.id,
                            event_id: event.eventId || '',
                            event_type: event.eventType || '',
                            entity_type: event.entityType || '',
                            entity_id: String(event.entityId || ''),
                            payload: JSON.stringify(event)
                        });
                    } catch(e) {
                        if(logger) logger.error('Error inserting event', { error: e.message });
                    }
                }
            }

            res.json({ success: true, processed: events.length });
        } catch (err) {
            if(logger) logger.error('Event ingestion error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.get('/plugin/operations', authenticate, (req, res) => {
        try {
            const installation = pluginService.pluginRepository.findByToken(req.pluginToken);
            const ops = wpOpService.getPendingOperations(installation.id, 20);
            
            if (ops.length > 0) {
                wpOpService.markDelivered(ops.map(o => o.id));
            }
            
            res.json({ success: true, operations: ops.map(o => ({
                uuid: o.operation_uuid,
                type: o.operation_type,
                payload: JSON.parse(o.payload || '{}'),
                priority: o.priority
            }))});
        } catch (err) {
            if(logger) logger.error('Get operations error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/operations/ack', authenticate, (req, res) => {
        try {
            const { operations } = req.body;
            if (operations && Array.isArray(operations)) {
                for (const op of operations) {
                    wpOpService.acknowledge(op.uuid, op.status, op.error);
                }
            }
            res.json({ success: true });
        } catch (err) {
            if(logger) logger.error('Ack operations error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.get('/plugin/stats', authenticate, async (req, res) => {
        try {
            const installation = pluginService.pluginRepository.findByToken(req.pluginToken);
            if (!installation) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            
            let processing = 0;
            let queued = 0;
            let completed = 0;
            let failed = 0;
            
            if (jobService) {
                const queue = await jobService.getSiteQueue(installation.site_id);
                processing = queue.processing.length;
                queued = queue.pending.length;
                completed = queue.completed.length;
            }
            
            res.json({ 
                success: true, 
                data: {
                    processing,
                    queued,
                    completed,
                    failed
                }
            });
        } catch (err) {
            if(logger) logger.error('Get stats error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/jobs/create', authenticate, async (req, res) => {
        try {
            const installation = pluginService.pluginRepository.findByToken(req.pluginToken);
            if (!installation) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }

            if (!jobService) {
                return res.status(500).json({ success: false, error: 'Job service not available' });
            }

            const { wp_post_id, type, priority, prompt } = req.body;
            if (!wp_post_id) {
                return res.status(400).json({ success: false, error: 'Missing wp_post_id' });
            }

            const job = await jobService.createJob({
                siteId: installation.site_id,
                wpPostId: wp_post_id,
                prompt: prompt || null,
                type: type || 'REWRITE',
                priority: priority || 'NORMAL'
            });

            res.json({ success: true, data: job });
        } catch (err) {
            if(logger) logger.error('Create job error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    return router;
}

module.exports = { createPluginRoutes };
