class WorkflowOrchestrator {
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
        const stuckProjects = this.db.prepare(`
            SELECT cp.id, cp.metadata 
            FROM content_projects cp
            JOIN jobs j ON cp.id = j.project_id
            WHERE json_extract(cp.metadata, '$.workflow_state') IN ('AUDITING', 'REWRITING')
            AND j.status = 'PENDING'
        `).all();

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
