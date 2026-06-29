class AuthorEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Author event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { AuthorEventHandler };
