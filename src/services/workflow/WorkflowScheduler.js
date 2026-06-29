class WorkflowScheduler {
    constructor({ jobRepository, db, logger }) {
        this.jobRepository = jobRepository;
        this.db = db;
        this.logger = logger;
    }

    scheduleJob(projectId, siteId, jobType, prompt = null) {
        // Prevent duplicates
        const existingJob = this.db.prepare(`
            SELECT id FROM jobs 
            WHERE project_id = ? AND type = ? AND status IN ('PENDING', 'PROCESSING')
        `).get(projectId, jobType);

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
