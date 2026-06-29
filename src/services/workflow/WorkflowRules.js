const WorkflowRules = {
    NEW: ['CREATE_AUDIT'],
    STALE: ['CREATE_AUDIT'],
    AUDIT_COMPLETE: ['EVALUATE_REWRITE'],
    REWRITE_COMPLETE: ['MOVE_TO_REVIEW']
};

module.exports = { WorkflowRules };
