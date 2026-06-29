class EventConsumerService {
    constructor({ db, pluginRepository, projectRepository, eventHandlers, workflowOrchestrator, logger }) {
        this.workflowOrchestrator = workflowOrchestrator;
        this.db = db;
        this.pluginRepository = pluginRepository;
        this.projectRepository = projectRepository;
        this.handlers = eventHandlers;
        this.logger = logger;
    }

    async processPendingEvents() {
        // Fetch up to 100 unprocessed events, ordered by received_at, then id
        const events = this.db.prepare(`
            SELECT * FROM event_ingestion 
            WHERE processed = 0 
            ORDER BY received_at ASC, id ASC 
            LIMIT 100
        `).all();

        for (const event of events) {
            try {
                await this.processEvent(event);
                this.db.prepare('UPDATE event_ingestion SET processed = 1, processed_at = CURRENT_TIMESTAMP WHERE id = ?').run(event.id);
            } catch (err) {
                this.logger.error('Failed to process event', { eventId: event.event_id, error: err.message });
                this.db.prepare('UPDATE event_ingestion SET processed = -1, error = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?').run(err.message, event.id);
            }
        }
    }

    async processEvent(event) {
        const installation = this.pluginRepository.findByInstallationId(event.installation_id);
        if (!installation) {
            throw new Error('Installation not found');
        }

        const handler = this.handlers[event.event_type];
        if (handler) {
            await handler.handle(event, installation);
        } else {
            this.logger.info('No handler for event type', { eventType: event.event_type });
        }
    }
    
    // Replay Support
    async replayEvent(eventId) {
        const event = this.db.prepare('SELECT * FROM event_ingestion WHERE event_id = ?').get(eventId);
        if (event) {
            await this.processEvent(event);
        }
    }
}

module.exports = { EventConsumerService };
