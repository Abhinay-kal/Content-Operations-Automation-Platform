const express = require('express');

function createPluginRoutes({ pluginService, logger }) {
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

    router.post('/plugin/register', (req, res) => {
        try {
            if (!req.body.site_id || !req.body.plugin_uuid || !req.body.installation_uuid) {
                return res.status(400).json({ success: false, error: 'Missing required parameters' });
            }
            const result = pluginService.register({ ...req.body, ip: req.ip, user_agent: req.headers['user-agent'] });
            res.json({ success: true, data: result });
        } catch (err) {
            logger.error('Register error', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    });

    router.post('/plugin/heartbeat', authenticate, (req, res) => {
        try {
            const result = pluginService.heartbeat(req.pluginToken, req.body);
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
\n    return router;
}

module.exports = { createPluginRoutes };
