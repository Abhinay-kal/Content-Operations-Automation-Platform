class WorkflowPolicyEngine {
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
