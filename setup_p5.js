const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(backendDir, 'src/services/eventHandlers'));

// 1. PostEventHandler
const postEventHandlerCode = `class PostEventHandler {
    constructor({ projectRepository, logger }) {
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
        } else if (project) {
            this.projectRepository.update(project.id, {
                status: newStatus,
                metadata: JSON.stringify(metadata)
            });
            this.logger.info('Updated project from event', { projectId: project.id, newStatus });
        }
    }
}

module.exports = { PostEventHandler };
`;

// 2. TaxonomyEventHandler (Dummy/Minimal Implementation for now)
const taxonomyEventHandlerCode = `class TaxonomyEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Taxonomy event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { TaxonomyEventHandler };
`;

// 3. AuthorEventHandler (Dummy/Minimal)
const authorEventHandlerCode = `class AuthorEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Author event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { AuthorEventHandler };
`;

// 4. MediaEventHandler (Dummy/Minimal)
const mediaEventHandlerCode = `class MediaEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Media event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { MediaEventHandler };
`;

// 5. SiteEventHandler (Dummy/Minimal)
const siteEventHandlerCode = `class SiteEventHandler {
    constructor({ logger }) { this.logger = logger; }
    async handle(event, installation) {
        this.logger.info('Site event handled (no-op)', { eventId: event.event_id });
    }
}
module.exports = { SiteEventHandler };
`;

// 6. EventConsumerService
const eventConsumerServiceCode = `class EventConsumerService {
    constructor({ db, pluginRepository, projectRepository, eventHandlers, logger }) {
        this.db = db;
        this.pluginRepository = pluginRepository;
        this.projectRepository = projectRepository;
        this.handlers = eventHandlers;
        this.logger = logger;
    }

    async processPendingEvents() {
        // Fetch up to 100 unprocessed events, ordered by received_at, then id
        const events = this.db.prepare(\`
            SELECT * FROM event_ingestion 
            WHERE processed = 0 
            ORDER BY received_at ASC, id ASC 
            LIMIT 100
        \`).all();

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
`;

fs.writeFileSync(path.join(backendDir, 'src/services/eventHandlers/PostEventHandler.js'), postEventHandlerCode);
fs.writeFileSync(path.join(backendDir, 'src/services/eventHandlers/TaxonomyEventHandler.js'), taxonomyEventHandlerCode);
fs.writeFileSync(path.join(backendDir, 'src/services/eventHandlers/AuthorEventHandler.js'), authorEventHandlerCode);
fs.writeFileSync(path.join(backendDir, 'src/services/eventHandlers/MediaEventHandler.js'), mediaEventHandlerCode);
fs.writeFileSync(path.join(backendDir, 'src/services/eventHandlers/SiteEventHandler.js'), siteEventHandlerCode);
fs.writeFileSync(path.join(backendDir, 'src/services/EventConsumerService.js'), eventConsumerServiceCode);


// We also need to add 'findByInstallationId' to PluginRepository if it's missing, and update ProjectRepository to have 'findByWpPostId' 
const pluginRepoPath = path.join(backendDir, 'src/repositories/PluginRepository.js');
let pluginRepoCode = fs.readFileSync(pluginRepoPath, 'utf8');
if (!pluginRepoCode.includes('findByInstallationId')) {
    pluginRepoCode = pluginRepoCode.replace(
        "findByToken(registration_token) {",
        "findByInstallationId(id) {\n        return this.db.prepare(`SELECT * FROM plugin_installations WHERE id = ?`).get(id);\n    }\n\n    findByToken(registration_token) {"
    );
    fs.writeFileSync(pluginRepoPath, pluginRepoCode);
}

const projectRepoPath = path.join(backendDir, 'src/repositories/ProjectRepository.js');
let projectRepoCode = fs.readFileSync(projectRepoPath, 'utf8');
if (!projectRepoCode.includes('findByWpPostId')) {
    // Inject findByWpPostId method if it doesn't exist
    projectRepoCode = projectRepoCode.replace(
        "class ProjectRepository {",
        "class ProjectRepository {\n    findByWpPostId(siteId, wpPostId) {\n        return this.db.prepare(`SELECT * FROM content_projects WHERE site_id = ? AND wp_post_id = ?`).get(siteId, wpPostId);\n    }\n"
    );
    fs.writeFileSync(projectRepoPath, projectRepoCode);
}

// Update BootstrapManager.js
const bootstrapPath = path.join(backendDir, 'src/bootstrap/BootstrapManager.js');
let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
if (!bootstrap.includes('EventConsumerService')) {
    const importCode = `
const { EventConsumerService } = require('../services/EventConsumerService');
const { PostEventHandler } = require('../services/eventHandlers/PostEventHandler');
const { TaxonomyEventHandler } = require('../services/eventHandlers/TaxonomyEventHandler');
const { AuthorEventHandler } = require('../services/eventHandlers/AuthorEventHandler');
const { MediaEventHandler } = require('../services/eventHandlers/MediaEventHandler');
const { SiteEventHandler } = require('../services/eventHandlers/SiteEventHandler');
`;
    bootstrap = bootstrap.replace(
        "const { PluginService } = require('../services/PluginService');",
        "const { PluginService } = require('../services/PluginService');" + importCode
    );

    const initCode = `
            const postEventHandler = new PostEventHandler({ projectRepository, logger: this.logger.db });
            const eventHandlers = {
                'PostChangedEvent': postEventHandler,
                'CategoryChangedEvent': new TaxonomyEventHandler({ logger: this.logger.db }),
                'TagChangedEvent': new TaxonomyEventHandler({ logger: this.logger.db }),
                'AuthorChangedEvent': new AuthorEventHandler({ logger: this.logger.db }),
                'MediaChangedEvent': new MediaEventHandler({ logger: this.logger.db }),
                'SiteChangedEvent': new SiteEventHandler({ logger: this.logger.db }),
            };
            const eventConsumerService = new EventConsumerService({
                db: this.db,
                pluginRepository,
                projectRepository,
                eventHandlers,
                logger: this.logger.db
            });
`;
    bootstrap = bootstrap.replace(
        "const pluginService = new PluginService({ pluginRepository, tokenService, compatibilityService, logger: this.logger.db });",
        "const pluginService = new PluginService({ pluginRepository, tokenService, compatibilityService, logger: this.logger.db });" + initCode
    );

    bootstrap = bootstrap.replace(
        "pluginService,",
        "pluginService,\n                eventConsumerService,"
    );
    fs.writeFileSync(bootstrapPath, bootstrap);
}

console.log("Setup complete for P5");
