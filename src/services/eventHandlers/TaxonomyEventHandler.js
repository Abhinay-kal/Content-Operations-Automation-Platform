class TaxonomyEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Taxonomy event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { TaxonomyEventHandler };
