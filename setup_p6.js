const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(backendDir, 'src/services/workflow'));

// 1. WorkflowRules.js
const workflowRulesCode = `const WorkflowRules = {
    NEW: ['CREATE_AUDIT'],
    STALE: ['CREATE_AUDIT'],
    AUDIT_COMPLETE: ['EVALUATE_REWRITE'],
    REWRITE_COMPLETE: ['MOVE_TO_REVIEW']
};

module.exports = { WorkflowRules };
`;

// 2. WorkflowPolicyEngine.js
const workflowPolicyEngineCode = `class WorkflowPolicyEngine {
    constructor({ db, logger }) {
        this.db = db;
        this.logger = logger;
    }

    getSiteSettings(siteId) {
        let settings = this.db.prepare('SELECT * FROM site_workflow_settings WHERE site_id = ?').get(siteId);
        if (!settings) {
            settings = {
                audit_threshold: 75,
                rewrite_threshold: 70,
                auto_reaudit_days: 30,
                auto_rewrite_enabled: 0,
                auto_publish_enabled: 0
            };
        }
        return settings;
    }

    evaluate(project, trigger, context = {}) {
        const decisions = [];
        const settings = this.getSiteSettings(project.site_id);

        if (trigger === 'NEW' || trigger === 'STALE') {
            decisions.push('CREATE_AUDIT');
        } else if (trigger === 'AUDIT_COMPLETE') {
            const score = context.score || 0;
            if (score < settings.audit_threshold) {
                decisions.push('CREATE_REWRITE');
            } else {
                decisions.push('MOVE_TO_REVIEW');
            }
        } else if (trigger === 'REWRITE_COMPLETE') {
            decisions.push('MOVE_TO_REVIEW');
        }

        return decisions;
    }
}

module.exports = { WorkflowPolicyEngine };
`;

// 3. WorkflowScheduler.js
const workflowSchedulerCode = `class WorkflowScheduler {
    constructor({ jobRepository, db, logger }) {
        this.jobRepository = jobRepository;
        this.db = db;
        this.logger = logger;
    }

    scheduleJob(projectId, siteId, jobType, prompt = null) {
        // Prevent duplicates
        const existingJob = this.db.prepare(\`
            SELECT id FROM jobs 
            WHERE project_id = ? AND type = ? AND status IN ('PENDING', 'PROCESSING')
        \`).get(projectId, jobType);

        if (existingJob) {
            this.logger.info('Duplicate job blocked', { projectId, jobType });
            return null;
        }

        const jobId = this.jobRepository.createJob({
            site_id: siteId,
            project_id: projectId,
            type: jobType,
            status: 'PENDING',
            priority: 'NORMAL',
            prompt: prompt
        });

        this.logger.info('Job scheduled', { projectId, jobType, jobId });
        return jobId;
    }
}

module.exports = { WorkflowScheduler };
`;

// 4. WorkflowOrchestrator.js
const workflowOrchestratorCode = `class WorkflowOrchestrator {
    constructor({ policyEngine, scheduler, db, eventRepository, logger }) {
        this.policyEngine = policyEngine;
        this.scheduler = scheduler;
        this.db = db;
        this.eventRepository = eventRepository;
        this.logger = logger;
    }

    async evaluateProject(project, trigger, context = {}) {
        const decisions = this.policyEngine.evaluate(project, trigger, context);
        
        for (const decision of decisions) {
            if (decision === 'CREATE_AUDIT') {
                this.updateWorkflowState(project.id, 'AUDIT_PENDING');
                this.scheduler.scheduleJob(project.id, project.site_id, 'AUDIT');
                this.logEvent(project.id, 'AUDIT_SCHEDULED');
            } else if (decision === 'CREATE_REWRITE') {
                this.updateWorkflowState(project.id, 'REWRITE_PENDING');
                this.scheduler.scheduleJob(project.id, project.site_id, 'REWRITE');
                this.logEvent(project.id, 'REWRITE_SCHEDULED');
            } else if (decision === 'MOVE_TO_REVIEW') {
                this.updateWorkflowState(project.id, 'REVIEW_PENDING');
                this.logEvent(project.id, 'REVIEW_CREATED');
            }
        }
    }

    updateWorkflowState(projectId, workflowState) {
        // Assuming workflow_state column added to content_projects
        try {
            this.db.prepare('UPDATE content_projects SET metadata = json_insert(coalesce(metadata, "{}"), "$.workflow_state", ?) WHERE id = ?')
                   .run(workflowState, projectId);
            this.logger.info('Workflow state updated', { projectId, workflowState });
        } catch (e) {
            this.logger.error('Failed to update workflow state', { error: e.message });
        }
    }

    logEvent(projectId, eventType, message = '') {
        try {
            if (this.eventRepository && this.eventRepository.createEvent) {
                this.eventRepository.createEvent({
                    project_id: projectId,
                    event_type: eventType,
                    message: message,
                    metadata: '{}'
                });
            } else {
                this.db.prepare('INSERT INTO project_events (project_id, event_type, message, metadata, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
                       .run(projectId, eventType, message, '{}');
            }
        } catch(e) {
            this.logger.error('Failed to log event', { error: e.message });
        }
    }

    reconcile() {
        // Reconcile AUDITING with PENDING jobs
        const stuckProjects = this.db.prepare(\`
            SELECT cp.id, cp.metadata 
            FROM content_projects cp
            JOIN jobs j ON cp.id = j.project_id
            WHERE json_extract(cp.metadata, '$.workflow_state') IN ('AUDITING', 'REWRITING')
            AND j.status = 'PENDING'
        \`).all();

        for (const p of stuckProjects) {
            const meta = JSON.parse(p.metadata || '{}');
            if (meta.workflow_state === 'AUDITING') {
                this.updateWorkflowState(p.id, 'AUDIT_PENDING');
            } else if (meta.workflow_state === 'REWRITING') {
                this.updateWorkflowState(p.id, 'REWRITE_PENDING');
            }
        }
    }
}

module.exports = { WorkflowOrchestrator };
`;

fs.writeFileSync(path.join(backendDir, 'src/services/workflow/WorkflowRules.js'), workflowRulesCode);
fs.writeFileSync(path.join(backendDir, 'src/services/workflow/WorkflowPolicyEngine.js'), workflowPolicyEngineCode);
fs.writeFileSync(path.join(backendDir, 'src/services/workflow/WorkflowScheduler.js'), workflowSchedulerCode);
fs.writeFileSync(path.join(backendDir, 'src/services/workflow/WorkflowOrchestrator.js'), workflowOrchestratorCode);

// Update schema.sql
const schemaPath = path.join(backendDir, 'schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
if (!schemaContent.includes('site_workflow_settings')) {
    schemaContent += "\nCREATE TABLE site_workflow_settings (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    site_id INTEGER NOT NULL,\n    audit_threshold INTEGER DEFAULT 75,\n    rewrite_threshold INTEGER DEFAULT 70,\n    auto_reaudit_days INTEGER DEFAULT 30,\n    auto_rewrite_enabled INTEGER DEFAULT 0,\n    auto_publish_enabled INTEGER DEFAULT 0,\n    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE\n);\n";
    fs.writeFileSync(schemaPath, schemaContent);
}

// Update BootstrapManager.js
const bootstrapPath = path.join(backendDir, 'src/bootstrap/BootstrapManager.js');
let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
if (!bootstrap.includes('WorkflowOrchestrator')) {
    const importCode = `
const { WorkflowPolicyEngine } = require('../services/workflow/WorkflowPolicyEngine');
const { WorkflowScheduler } = require('../services/workflow/WorkflowScheduler');
const { WorkflowOrchestrator } = require('../services/workflow/WorkflowOrchestrator');
`;
    bootstrap = bootstrap.replace(
        "const { EventConsumerService } = require('../services/EventConsumerService');",
        importCode + "const { EventConsumerService } = require('../services/EventConsumerService');"
    );

    const initCode = `
            const workflowPolicyEngine = new WorkflowPolicyEngine({ db: this.db, logger: this.logger.db });
            const workflowScheduler = new WorkflowScheduler({ jobRepository, db: this.db, logger: this.logger.db });
            const workflowOrchestrator = new WorkflowOrchestrator({
                policyEngine: workflowPolicyEngine,
                scheduler: workflowScheduler,
                db: this.db,
                eventRepository,
                logger: this.logger.db
            });
            
            // Reconcile stuck workflows on boot
            workflowOrchestrator.reconcile();
`;
    bootstrap = bootstrap.replace(
        "const eventConsumerService = new EventConsumerService({",
        initCode + "\n            const eventConsumerService = new EventConsumerService({"
    );
    
    // Inject orchestrator into consumer so we can trigger it
    bootstrap = bootstrap.replace(
        "eventHandlers,",
        "eventHandlers,\n                workflowOrchestrator,"
    );

    bootstrap = bootstrap.replace(
        "eventConsumerService,",
        "eventConsumerService,\n                workflowOrchestrator,"
    );
    fs.writeFileSync(bootstrapPath, bootstrap);
}

// Hook orchestrator into PostEventHandler
const postEventHandlerPath = path.join(backendDir, 'src/services/eventHandlers/PostEventHandler.js');
let postEventHandler = fs.readFileSync(postEventHandlerPath, 'utf8');
if (!postEventHandler.includes('workflowOrchestrator')) {
    postEventHandler = postEventHandler.replace(
        "constructor({ projectRepository, logger }) {",
        "constructor({ projectRepository, workflowOrchestrator, logger }) {\n        this.workflowOrchestrator = workflowOrchestrator;"
    );
    
    // We need to trigger evaluateProject
    postEventHandler = postEventHandler.replace(
        "this.logger.info('Created new project from event', { siteId, wpPostId });",
        "this.logger.info('Created new project from event', { siteId, wpPostId });\n            if (this.workflowOrchestrator) {\n                const newProj = this.projectRepository.findByWpPostId(siteId, wpPostId);\n                this.workflowOrchestrator.evaluateProject(newProj, newStatus);\n            }"
    );
    
    postEventHandler = postEventHandler.replace(
        "this.logger.info('Updated project from event', { projectId: project.id, newStatus });",
        "this.logger.info('Updated project from event', { projectId: project.id, newStatus });\n            if (this.workflowOrchestrator) {\n                const updatedProj = this.projectRepository.findByWpPostId(siteId, wpPostId);\n                this.workflowOrchestrator.evaluateProject(updatedProj, newStatus);\n            }"
    );
    
    fs.writeFileSync(postEventHandlerPath, postEventHandler);
}

// Also update Bootstrap to pass orchestrator into PostEventHandler
bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
if (!bootstrap.includes('workflowOrchestrator: workflowOrchestrator')) {
    bootstrap = bootstrap.replace(
        "const postEventHandler = new PostEventHandler({ projectRepository, logger: this.logger.db });",
        "const postEventHandler = new PostEventHandler({ projectRepository, workflowOrchestrator, logger: this.logger.db });"
    );
    fs.writeFileSync(bootstrapPath, bootstrap);
}

// Update EventConsumerService constructor if needed
const consumerPath = path.join(backendDir, 'src/services/EventConsumerService.js');
let consumer = fs.readFileSync(consumerPath, 'utf8');
if (!consumer.includes('this.workflowOrchestrator = workflowOrchestrator;')) {
    consumer = consumer.replace(
        "constructor({ db, pluginRepository, projectRepository, eventHandlers, logger }) {",
        "constructor({ db, pluginRepository, projectRepository, eventHandlers, workflowOrchestrator, logger }) {\n        this.workflowOrchestrator = workflowOrchestrator;"
    );
    fs.writeFileSync(consumerPath, consumer);
}

console.log("Setup complete for P6");
