class PostEventHandler {
    constructor({ projectRepository, workflowOrchestrator, logger }) {
        this.workflowOrchestrator = workflowOrchestrator;
        this.projectRepository = projectRepository;
        this.logger = logger;
    }

    async handle(event, installation) {
        const payload = JSON.parse(event.payload);
        const action = payload.metadata?.action;
        const siteId = installation.site_id;
        const wpPostId = payload.entityId;
        const eventTime = payload.timestamp;
        
        let project = this.projectRepository.findByWpPostId(siteId, wpPostId);
        
        // Idempotency / ordering check based on event id and timestamp
        if (project && project.metadata) {
            let meta = {};
            try { meta = JSON.parse(project.metadata); } catch(e) {}
            // Extremely basic timestamp check, in a real system we'd parse ISO 8601 properly
            if (meta.last_event_time && new Date(meta.last_event_time) >= new Date(eventTime)) {
                this.logger.info('Ignoring stale event', { eventId: event.event_id, wpPostId });
                return;
            }
            if (meta.last_event_id === event.event_id) {
                return; // duplicate
            }
        }
        
        let newStatus = 'NEW';
        if (action === 'delete' || action === 'trash') {
            newStatus = 'ARCHIVED';
        } else if (action === 'save' || action === 'transition' || action === 'untrash') {
            newStatus = project ? 'STALE' : 'NEW';
        } else {
            return; // unknown action
        }

        const metadata = {
            ...(project ? JSON.parse(project.metadata || '{}') : {}),
            last_synced_at: new Date().toISOString(),
            last_event_id: event.event_id,
            last_event_time: eventTime,
            source_installation: installation.installation_uuid,
            sync_version: (project ? (JSON.parse(project.metadata || '{}').sync_version || 0) + 1 : 1)
        };

        if (!project && newStatus !== 'ARCHIVED') {
            this.projectRepository.create({
                site_id: siteId,
                wp_post_id: wpPostId,
                status: newStatus,
                metadata: JSON.stringify(metadata)
            });
            this.logger.info('Created new project from event', { siteId, wpPostId });
            if (this.workflowOrchestrator) {
                const newProj = this.projectRepository.findByWpPostId(siteId, wpPostId);
                this.workflowOrchestrator.evaluateProject(newProj, newStatus);
            }
        } else if (project) {
            this.projectRepository.update(project.id, {
                status: newStatus,
                metadata: JSON.stringify(metadata)
            });
            this.logger.info('Updated project from event', { projectId: project.id, newStatus });
            if (this.workflowOrchestrator) {
                const updatedProj = this.projectRepository.findByWpPostId(siteId, wpPostId);
                this.workflowOrchestrator.evaluateProject(updatedProj, newStatus);
            }
        }
    }
}

module.exports = { PostEventHandler };
