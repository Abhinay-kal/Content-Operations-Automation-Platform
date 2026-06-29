class MediaEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Media event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { MediaEventHandler };
