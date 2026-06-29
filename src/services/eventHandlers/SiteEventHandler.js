class SiteEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Site event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { SiteEventHandler };
