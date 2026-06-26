const fs = require('fs');
const path = require('path');
const { WORKER_STATES } = require('../models/WorkerState');
const { PROJECT_STATUSES } = require('../models/ContentProject');
const { FailureClassifier } = require('../utils/FailureClassifier');
const AuditPromptBuilder = require('../utils/AuditPromptBuilder');
const RewritePromptBuilder = require('../utils/RewritePromptBuilder');
const { ContentUnavailableError, InvalidProjectContentError } = require('../errors/ClaudeErrors');

class ClaudeWorker {
    constructor({ 
        claudeManager, 
        sessionMonitor = null, 
        workerState, 
        jobService, 
        projectService, 
        queueService, 
        metricsService, 
        logRepository,
        eventRepository,
        logger 
    }) {
        this.claudeManager = claudeManager;
        this.sessionMonitor = sessionMonitor;
        this.workerState = workerState;
        this.jobService = jobService;
        this.projectService = projectService;
        this.queueService = queueService;
        this.metricsService = metricsService;
        this.logRepository = logRepository;
        this.eventRepository = eventRepository;
        this.logger = logger;
        this.isProcessing = false;
        this.workerInterval = null;
        this.MIN_CONTENT_LENGTH = 500;
    }

    async initialize() {
        this.logger.info({ event: 'WORKER_INITIALIZING' });
        
        // Strict dependency check: BootstrapManager must have initialized these already
        if (!this.claudeManager.initialized) {
            throw new Error('Lifecycle Violation: ClaudeManager must be initialized before ClaudeWorker');
        }

        this.workerState.setState(WORKER_STATES.READY, 'worker initialized');
    }

    /**
     * Explicitly starts background job processing.
     * Must be called ONLY after Phase 4 Readiness Verification.
     */
    startProcessing() {
        if (this.workerInterval) return;
        
        this.logger.info({ event: 'WORKER_PROCESSING_START' });
        
        if (this.sessionMonitor) {
            this.sessionMonitor.start();
        }

        this.workerInterval = setInterval(async () => {
            if (this.isProcessing) return;
            await this._processPendingJobs();
        }, 5000);
    }

    /**
     * Explicitly stops background job processing.
     */
    stopProcessing() {
        if (this.workerInterval) {
            clearInterval(this.workerInterval);
            this.workerInterval = null;
            this.logger.info({ event: 'WORKER_PROCESSING_STOP' });
        }
    }

    async _processPendingJobs() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Fetch only the next best job based on priority and fair-share
            const pendingJobs = await this.jobService.getPendingJobs();
            const job = pendingJobs[0]; // Take only the top one
            
            if (job) {
                try {
                    await this.executeJob(job.id);
                } catch (error) {
                    this.logger.error({ event: 'JOB_PROCESS_ERROR', job_id: job.id, error: error.message });
                }
            }
        } catch (error) {
            this.logger.error({ event: 'PENDING_JOBS_FETCH_ERROR', error: error.message });
        } finally {
            this.isProcessing = false;
        }
    }

    async executeJob(jobId) {
        const job = await this.jobService.getJobById(jobId);
        if (!job || job.status !== 'PENDING') return;

        return this.queueService.add(async () => {
            // Re-verify status inside queue
            const currentJob = await this.jobService.getJobById(jobId);
            if (!currentJob || currentJob.status !== 'PENDING') return;

            this.logger.info({ event: 'WORKER_JOB_SELECTED', job_id: jobId, type: currentJob.type });

            await this.jobService.startJob(jobId);
            this.workerState.setState(WORKER_STATES.BUSY, `executing job ${jobId}`);
            const startTime = Date.now();

            // Record Project Event: JOB_STARTED
            if (currentJob.project_id) {
                await this.eventRepository.createEvent({
                    project_id: currentJob.project_id,
                    event_type: 'JOB_STARTED',
                    message: `Job ${jobId} (${currentJob.type}) started`,
                    metadata: { job_id: jobId, type: currentJob.type }
                });
            }

            try {
                // Update Project State: AUDITING or REWRITING
                if (currentJob.project_id) {
                    const nextProjectStatus = currentJob.type === 'AUDIT' ? PROJECT_STATUSES.AUDITING : PROJECT_STATUSES.REWRITING;
                    await this.projectService.updateProjectStatus(currentJob.project_id, nextProjectStatus);
                }

                // Determine prompt source: Snapshot preferred
                let prompt = currentJob.type === 'AUDIT' ? currentJob.audit_prompt_snapshot : currentJob.rewrite_prompt_snapshot;
                
                // Content loading is MANDATORY. No silent fallback.
                const post = currentJob.project_id ? await this.projectService.getPostByProjectId(currentJob.project_id) : null;
                
                if (currentJob.project_id && !post) {
                    this.logger.error({
                        event: 'CONTENT_MISSING',
                        projectId: currentJob.project_id,
                        postId: currentJob.wp_post_id,
                        jobId: jobId
                    });
                    throw new ContentUnavailableError('WordPress post content not found in local database');
                }

                // Precondition checks
                if (post) {
                    const title = post.title?.trim();
                    const content = post.content?.trim();
                    const contentLength = content?.length || 0;

                    if (!title) {
                        throw new InvalidProjectContentError('Post title is missing');
                    }

                    if (contentLength < this.MIN_CONTENT_LENGTH) {
                        throw new InvalidProjectContentError(`Post content too short (${contentLength} chars), minimum required: ${this.MIN_CONTENT_LENGTH}`);
                    }

                    // Log loading success
                    this.logger.info({
                        event: 'POST_CONTENT_LOADED',
                        projectId: currentJob.project_id,
                        postId: post.wp_post_id,
                        contentLength
                    });

                    // Build prompt
                    if (currentJob.type === 'AUDIT') {
                        const siteSettings = await this.jobService.siteRepository.getSiteSettings(currentJob.site_id);
                        prompt = AuditPromptBuilder.build({
                            title: post.title,
                            content: post.content,
                            siteSettings,
                            template: prompt // Use the snapshot as template
                        });
                    } else if (currentJob.type === 'REWRITE') {
                        const latestAudit = await this.projectService.getLatestAuditByProjectId(currentJob.project_id);
                        if (!latestAudit) {
                            throw new InvalidProjectContentError('Cannot rewrite without a previous audit');
                        }
                        prompt = RewritePromptBuilder.build({
                            originalContent: post.content,
                            audit: latestAudit,
                            template: prompt // Use the snapshot as template
                        });
                    }

                    this.logger.info({
                        event: 'PROMPT_GENERATED',
                        promptLength: prompt.length,
                        containsTitle: prompt.includes(post.title),
                        containsContent: prompt.includes(post.content)
                    });
                }

                // Fallback to legacy prompt field ONLY if no project linked (unlikely in prod)
                if (!currentJob.project_id && !prompt) {
                    prompt = currentJob.prompt;
                }

                if (!prompt) {
                    throw new Error(`No prompt available for job ${jobId} (type: ${currentJob.type})`);
                }

                this.logger.info({
                    event: 'PROMPT_INTEGRITY',
                    titleLength: post?.title?.length || 0,
                    contentLength: post?.content?.length || 0,
                    promptLength: prompt.length
                });

                this.logger.info({ event: 'WORKER_PROMPT_READY', length: prompt.length });

                this.logger.info({ event: 'JOB_EXECUTION_START', job_id: jobId, type: currentJob.type, project_id: currentJob.project_id });

                let source = 'UNKNOWN';
                if (prompt === currentJob.prompt) {
                    source = 'LEGACY_JOB_PROMPT';
                } else if (prompt === currentJob.audit_prompt_snapshot) {
                    source = 'AUDIT_SNAPSHOT';
                } else if (prompt === currentJob.rewrite_prompt_snapshot) {
                    source = 'REWRITE_SNAPSHOT';
                } else if (currentJob.type === 'AUDIT' && currentJob.project_id) {
                    source = 'AUDIT_PROMPT_BUILDER';
                } else if (currentJob.type === 'REWRITE' && currentJob.project_id) {
                    source = 'REWRITE_PROMPT_BUILDER';
                }

                console.log('PROMPT_SOURCE_AUDIT', JSON.stringify({
                    jobId,
                    jobType: currentJob.type,
                    promptLength: prompt.length,
                    contentLength: post?.content?.length || 0,
                    titleLength: post?.title?.length || 0,
                    source
                }));

                const response = await this.claudeManager.sendPrompt(prompt, currentJob.type);
                
                // Save to files immediately to capture for diagnostics
                this._saveResponse(response);

                // Track Claude Chat
                if (response.chatId || response.url) {
                    await this._recordJobChat(jobId, currentJob.type, response.chatId, response.url);
                }

                this.claudeManager.validateResponse(response, prompt, currentJob.type);

                // Handle AUDIT specific completion
                if (currentJob.type === 'AUDIT' && currentJob.project_id) {
                    await this.projectService.completeAudit(currentJob.project_id, response.text);
                }

                // Handle REWRITE specific completion
                if (currentJob.type === 'REWRITE' && currentJob.project_id) {
                    const latestAudit = await this.projectService.getLatestAuditByProjectId(currentJob.project_id);
                    await this.projectService.completeRewrite(currentJob.project_id, latestAudit?.id, response.text);
                }

                await this.jobService.completeJob(jobId);
                
                const runtimeMs = Date.now() - startTime;
                
                // Record execution log
                await this.logRepository.createExecutionLog({
                    job_id: jobId,
                    site_id: currentJob.site_id,
                    project_id: currentJob.project_id,
                    execution_type: currentJob.type,
                    prompt_used: prompt,
                    response_received: response.text,
                    runtime_ms: runtimeMs,
                    status: 'COMPLETED'
                });

                // Record Project Event: JOB_COMPLETED
                if (currentJob.project_id) {
                    await this.eventRepository.createEvent({
                        project_id: currentJob.project_id,
                        event_type: 'JOB_COMPLETED',
                        message: `Job ${jobId} completed successfully`,
                        metadata: { runtime_ms: runtimeMs }
                    });
                }

                // Record completion metric
                if (this.metricsService) {
                    this.metricsService.recordJobCompletion(runtimeMs);
                }

                // Update Project State: AUDIT_COMPLETE or REWRITE_COMPLETE
                if (currentJob.project_id) {
                    const completionStatus = currentJob.type === 'AUDIT' ? PROJECT_STATUSES.AUDIT_COMPLETE : PROJECT_STATUSES.REWRITE_COMPLETE;
                    await this.projectService.updateProjectStatus(currentJob.project_id, completionStatus);
                }

                this.logger.info({ event: 'JOB_EXECUTION_FINISH', job_id: jobId, success: true });
                return response.text;
            } catch (error) {
                const runtimeMs = Date.now() - startTime;
                const errorCategory = FailureClassifier.classify(error);

                this.logger.error({ 
                    event: 'JOB_EXECUTION_ERROR', 
                    job_id: jobId, 
                    error: error.message, 
                    category: errorCategory 
                });
                
                await this.jobService.failJob(jobId, error.message);
                
                // Record execution log (FAILURE)
                await this.logRepository.createExecutionLog({
                    job_id: jobId,
                    site_id: currentJob.site_id,
                    project_id: currentJob.project_id,
                    execution_type: currentJob.type,
                    prompt_used: currentJob.type === 'AUDIT' ? currentJob.audit_prompt_snapshot : currentJob.rewrite_prompt_snapshot || currentJob.prompt,
                    status: 'FAILED',
                    error_category: errorCategory,
                    metadata: { error: error.message, type: error.type }
                });

                // Record Project Event: JOB_FAILED
                if (currentJob.project_id) {
                    await this.eventRepository.createEvent({
                        project_id: currentJob.project_id,
                        event_type: 'JOB_FAILED',
                        message: `Job ${jobId} failed: ${error.message}`,
                        metadata: { category: errorCategory, error: error.message }
                    });
                }

                // Record failure metric
                if (this.metricsService) {
                    this.metricsService.recordJobFailure();
                }

                if (currentJob.project_id) {
                    await this.projectService.updateProjectStatus(currentJob.project_id, PROJECT_STATUSES.FAILED);
                }
                
                throw error;
            } finally {
                this._resetWorkerState();
            }
        }, job.priority); // Pass priority to queueService
    }

    async _recordJobChat(jobId, type, claudeChatId, chatUrl) {
        try {
            const now = new Date().toISOString();
            const stmt = this.jobService.jobRepository.db.prepare(`
                INSERT INTO job_chats (job_id, chat_type, claude_chat_id, chat_url, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(jobId, type, claudeChatId, chatUrl, 'ACTIVE', now);
        } catch (error) {
            this.logger.warn({ event: 'JOB_CHAT_RECORD_FAILED', job_id: jobId, error: error.message });
        }
    }

    _saveResponse(response) {
        try {
            const htmlPath = path.join(process.cwd(), 'claude_response.html');
            const txtPath = path.join(process.cwd(), 'claude_response.txt');
            
            fs.writeFileSync(htmlPath, response.html || '');
            fs.writeFileSync(txtPath, response.text || '');
            
            this.logger.info({ event: 'RESPONSE_SAVED_TO_FILES', htmlPath, txtPath });
        } catch (saveError) {
            this.logger.warn({ event: 'RESPONSE_SAVE_FAILED', error: saveError.message });
        }
    }

    _resetWorkerState() {
        const currentState = this.workerState.getState();
        if (currentState !== WORKER_STATES.BROKEN && 
            currentState !== WORKER_STATES.DEGRADED && 
            currentState !== WORKER_STATES.RECOVERING) {
            this.workerState.setState(WORKER_STATES.READY, 'execution complete');
        }
    }

    getQueueSize() {
        return this.queueService.size;
    }

    async isHealthy() {
        return this.claudeManager.getStatus().healthy;
    }

    getStatusSnapshot() {
        return this.claudeManager.getStatus();
    }

    async rewrite(prompt, wpPostId = null, siteId = 1) {
        // Force job creation even for transient rewrites to ensure snapshotting and state tracking
        const job = await this.jobService.createJob({ 
            siteId, 
            wpPostId, // Could be null for pure transient, but JobService handles it
            prompt,
            type: 'REWRITE'
        });
        
        return this.executeJob(job.id);
    }
}

module.exports = {
    ClaudeWorker
};
