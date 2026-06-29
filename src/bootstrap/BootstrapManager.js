const { PreFlightValidator } = require('./PreFlightValidator');
const { loadConfig } = require('../config/config');
const { createLogger } = require('../utils/logger');
const DatabaseConnection = require('../db/database');
const Migrations = require('../db/migrations');
const { JobRepository } = require('../repositories/JobRepository');
const { SiteRepository } = require('../repositories/SiteRepository');
const { ProjectRepository } = require('../repositories/ProjectRepository');
const { LogRepository, EventRepository } = require('../repositories/LogRepository');
const { WordPressRepository } = require('../repositories/WordPressRepository');
const { PublishingRepository } = require('../repositories/PublishingRepository'); // Import Publishing repository\nconst { PluginRepository } = require('../repositories/PluginRepository');\nconst { TokenService } = require('../services/TokenService');\nconst { CompatibilityService } = require('../services/CompatibilityService');\nconst { PluginService } = require('../services/PluginService');
const JobService = require('../services/JobService');
const { SiteService } = require('../services/SiteService');
const { ProjectService } = require('../services/ProjectService');
const SyncService = require('../services/SyncService'); 
const PublishingService = require('../services/PublishingService'); // Import Publishing service


const { StateMachine } = require('../monitor/StateMachine');
const { BrowserManager } = require('../services/BrowserManager');
const { ClaudeManager } = require('../services/ClaudeManager');
const { MetricsService } = require('../services/MetricsService');
const { QueueService } = require('../services/QueueService');
const { ClaudeWorker } = require('../workers/ClaudeWorker');
const { SessionMonitor } = require('../monitor/SessionMonitor');
const { RecoveryManager } = require('../monitor/RecoveryManager');
const { SessionDetector } = require('../session/SessionDetector');
const { SessionRecovery } = require('../session/SessionRecovery');
const { ClaudeHealthCheck } = require('../session/ClaudeHealthCheck');
const { BrowserRecovery } = require('../browser/BrowserRecovery');
const { DashboardService } = require('../services/DashboardService');

class BootstrapManager {
    constructor() {
        this.validator = new PreFlightValidator();
        this.config = null;
        this.db = null;
        this.services = {};
        this.logger = {
            bootstrap: createLogger('Bootstrap'),
            db: createLogger('Database'),
            worker: createLogger('ClaudeWorker'),
            state: createLogger('WorkerState'),
            browser: createLogger('BrowserManager'),
            session: createLogger('SessionMonitor'),
            server: createLogger('Server'),
            rewrite: createLogger('RewriteRoute'),
            status: createLogger('StatusRoute'),
            health: createLogger('HealthRoute')
        };
    }

    async run() {
        this._printHeader();

        // PHASE 1: Pre-Flight Validation
        await this._runPhase1();

        // PHASE 2: Database & Core State Initialization
        await this._runPhase2();

        // PHASE 3: Browser & Session Initialization
        await this._runPhase3();

        // PHASE 3.5: Startup Consolidation (Worker & Monitoring)
        await this._runPhase3_5();

        // PHASE 4: Readiness Verification
        await this._runPhase4();

        console.log('\nBootstrap Sequence Complete\n');
        
        return {
            config: this.config,
            services: this.services,
            logger: this.logger
        };
    }

    async _runPhase1() {
        console.log('--- Phase 1: Pre-Flight Validation ---');
        
        if (this.validator.validateEnv()) {
            console.log('✓ Environment Loaded');
        } else {
            this._reportFailures();
        }

        this.config = loadConfig();

        if (this.validator.validateConfig(this.config)) {
            console.log('✓ Config Validated');
        }

        if (this.validator.validateProfile(this.config.profilePath)) {
            console.log('✓ Claude Profile Valid');
        }

        const requiredDirs = ['logs', 'temp-chrome-data'];
        if (this.validator.ensureDirectories(requiredDirs)) {
            this.validator.getActions().forEach(action => console.log(`✓ ${action}`));
            console.log('✓ System Directories Ready');
        }

        if (this.validator.getErrors().length > 0) {
            this._reportFailures();
        }
        
        console.log('✓ Phase 1 Successful\n');
    }

    async _runPhase2() {
        console.log('--- Phase 2: Database & State Initialization ---');

        try {
            const dbConnection = new DatabaseConnection(this.config);
            this.db = await dbConnection.connect();
            console.log('✓ Database Connected');

            const migrations = new Migrations(this.db);
            await migrations.run();
            console.log('✓ Schema Validated/Migrated');

            const siteRepository = new SiteRepository(this.db);
            const projectRepository = new ProjectRepository(this.db);
            const jobRepository = new JobRepository(this.db);
            const logRepository = new LogRepository(this.db);
            const eventRepository = new EventRepository(this.db);
            const wordpressRepository = new WordPressRepository(this.db);
            const publishingRepository = new PublishingRepository(this.db);\n            const pluginRepository = new PluginRepository(this.db);\n            const tokenService = new TokenService();\n            const compatibilityService = new CompatibilityService();\n            const pluginService = new PluginService({ pluginRepository, tokenService, compatibilityService, logger: this.logger.db });
            
            const siteService = new SiteService({ siteRepository, logger: this.logger.db, config: this.config });
            const syncService = new SyncService({ siteService, wordpressRepository, logger: this.logger.db });
            
            if (siteService.encryption.enabled) {
                console.log('✓ Encryption Enabled');
            } else {
                console.log('⚠ WARNING: Encryption unavailable. APP_SECRET not configured. Credentials cannot be securely stored.');
            }

            const jobService = new JobService({ jobRepository, projectRepository, siteRepository, logger: this.logger.worker });
            const projectService = new ProjectService({ 
                projectRepository, 
                jobRepository, 
                eventRepository, 
                wordpressRepository, 
                logger: this.logger.db 
            });

            const publishingService = new PublishingService({
                siteService,
                projectService,
                publishingRepository,\n                pluginRepository,\n                tokenService,\n                compatibilityService,\n                pluginService,
                eventRepository,
                logger: this.logger.db
            });

            const recoveredCount = await jobService.recoverInterruptedJobs();
            
            if (recoveredCount > 0) {
                console.log(`✓ Job Recovery: ${recoveredCount} jobs reset to PENDING`);
                const reconciledCount = await projectService.reconcileProjectStates();
                if (reconciledCount > 0) {
                    console.log(`✓ Project Recovery: ${reconciledCount} projects reconciled`);
                }
            } else {
                console.log('✓ Job Recovery: No interrupted jobs found');
            }

            const stateMachine = new StateMachine({ db: this.db, logger: this.logger.state });
            
            // Hard reset to STARTING to ensure clean bootstrap lifecycle
            stateMachine.resetToStarting('system_bootstrap');
            console.log(`✓ Worker State Reset to STARTING`);

            const metricsService = new MetricsService();
            metricsService.start();
            
            const queueService = new QueueService();
            console.log('✓ Core Services Initialized (Metrics, Queue)');

            this.services = {
                ...this.services,
                dbConnection,
                db: this.db,
                siteRepository,
                projectRepository,
                jobRepository,
                logRepository,
                eventRepository,
                wordpressRepository,
                publishingRepository,
                siteService,
                projectService,
                jobService,
                syncService,
                publishingService,
                stateMachine,
                metricsService,
                queueService
            };

            console.log('✓ Phase 2 Successful\n');
        } catch (error) {
            console.log(`\n✗ Phase 2 Initialization Failed: ${error.message}`);
            process.exit(1);
        }
    }

    async _runPhase3() {
        console.log('--- Phase 3: Browser & Session Initialization ---');

        try {
            // 1. Browser Manager Setup
            const browserManager = new BrowserManager({ 
                config: this.config, 
                logger: this.logger.browser, 
                workerState: {
                    setState: (s, r) => this.services.stateMachine.transition(s, r),
                    getState: () => this.services.stateMachine.getState()
                } 
            });

            // 2. Claude Manager Setup
            const claudeManager = new ClaudeManager({
                browserManager,
                logger: this.logger.worker,
                config: this.config,
                workerState: {
                    setState: (s, r) => this.services.stateMachine.transition(s, r),
                    getState: () => this.services.stateMachine.getState()
                }
            });

            // 3. Initialize and Validate (Sequential & Strict)
            console.log('  Launching Browser...');
            await browserManager.initialize();
            console.log('  ✓ Browser Subsystem Initialized');

            console.log('  Validating Claude Session...');
            
            let lastError;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await claudeManager.initialize();
                    console.log('  ✓ Claude Session Validated');
                    lastError = null;
                    break;
                } catch (error) {
                    lastError = error;
                    this.logger.worker.warn({ event: 'CLAUDE_INIT_RETRY', attempt, error: error.message });
                    
                    if (error.type === 'SESSION_EXPIRED') {
                        // Immediately break the retry loop if we know the user is logged out.
                        // We do not want to wait 30s and then automatically close the browser on them!
                        break;
                    }
                    
                    if (attempt < 3) {
                        const backoff = Math.pow(2, attempt - 1) * 30000;
                        console.log(`  ⚠ Session validation failed (${error.message}). Retrying in ${backoff/1000}s... (${attempt}/3)`);
                        await new Promise(r => setTimeout(r, backoff));
                        // Re-launch browser since the page might be closed
                        await browserManager.close().catch(() => {});
                        await browserManager.initialize();
                    }
                }
            }
            
            if (lastError) {
                throw lastError;
            }

            this.services = {
                ...this.services,
                browserManager,
                claudeManager
            };

            console.log('✓ Phase 3 Successful\n');
        } catch (error) {
            console.log(`\n✗ Phase 3 Initialization Failed\n`);
            
            if (error.type === 'SESSION_EXPIRED') {
                console.log('Authentication Required:');
                console.log('Claude session is not active.');
                console.log('The browser will remain open so you can log in manually.');
                console.log('Please log in, then restart the application.');
                
                // Keep the process alive indefinitely so the browser stays open for manual login
                // An unresolved Promise alone does not keep Node.js alive; we need an active timer handle.
                setInterval(() => {}, 1000 * 60 * 60); 
                await new Promise(() => {}); 
            } else if (error.type === 'PROFILE_LOCK') {
                console.log(error.message);
                console.log('');
            } else {
                console.log(`Error: ${error.message}\n`);
            }
            
            if (this.services.browserManager) {
                await this.services.browserManager.close().catch(() => {});
            }
            
            process.exit(1);
        }
    }

    async _runPhase3_5() {
        console.log('--- Phase 3.5: Startup Consolidation ---');

        try {
            const { 
                browserManager, 
                claudeManager, 
                stateMachine, 
                queueService, 
                metricsService, 
                jobService,
                projectService,
                logRepository,
                eventRepository
            } = this.services;

            const workerStateProxy = {
                setState: (s, r) => stateMachine.transition(s, r),
                getState: () => stateMachine.getState()
            };

            const sessionDetector = new SessionDetector({ logger: this.logger.session });
            const claudeHealthCheck = new ClaudeHealthCheck({ browserManager, sessionDetector, logger: this.logger.session });
            
            const sessionRecovery = new SessionRecovery({ browserManager, logger: this.logger.session });
            const browserRecovery = new BrowserRecovery({ browserManager, logger: this.logger.session });

            const recoveryManager = new RecoveryManager({ 
                stateMachine, 
                queueService, 
                sessionRecovery, 
                browserRecovery, 
                metricsService, 
                logger: this.logger.session 
            });

            const sessionMonitor = new SessionMonitor({ 
                stateMachine, 
                claudeHealthCheck, 
                recoveryManager, 
                queueService, 
                metricsService, 
                logger: this.logger.session 
            });

            const worker = new ClaudeWorker({ 
                claudeManager, 
                sessionMonitor, 
                workerState: workerStateProxy, 
                jobService, 
                projectService, 
                queueService, 
                metricsService,
                logRepository, // Pass logRepository
                eventRepository, // Pass eventRepository
                logger: this.logger.worker 
            });

            // Initialize the worker subsystem (prepares state, but does NOT start processing)
            await worker.initialize();
            console.log('✓ Claude Worker Initialized (Wait-State)');

            const dashboardService = new DashboardService({
                services: {
                    ...this.services,
                    sessionDetector,
                    claudeHealthCheck,
                    sessionRecovery,
                    browserRecovery,
                    recoveryManager,
                    sessionMonitor,
                    worker
                },
                logger: this.logger.bootstrap
            });

            this.services = {
                ...this.services,
                sessionDetector,
                claudeHealthCheck,
                sessionRecovery,
                browserRecovery,
                recoveryManager,
                sessionMonitor,
                worker,
                dashboardService
            };

            console.log('✓ Phase 3.5 Successful\n');
        } catch (error) {
            console.log(`\n✗ Phase 3.5 Initialization Failed: ${error.message}`);
            process.exit(1);
        }
    }

    async _runPhase4() {
        console.log('--- Phase 4: Readiness Verification ---');

        try {
            await this._verifyReadiness();
            console.log('✓ Readiness Verification Passed: ALL SYSTEMS GO');
            console.log('✓ Phase 4 Successful');
        } catch (error) {
            console.log(`\n✗ Phase 4 Readiness Verification Failed\n`);
            console.log(`${error.message}\n`);
            console.log('The system is not ready to accept traffic.');
            
            if (this.services.browserManager) {
                await this.services.browserManager.close().catch(() => {});
            }
            
            process.exit(1);
        }
    }

    async _verifyReadiness() {
        const { db, browserManager, claudeManager, stateMachine, queueService, sessionMonitor } = this.services;

        // 1. Database Liveness
        try {
            db.prepare('SELECT 1').get();
            console.log('  - Database: Connected & Responsive');
        } catch (e) {
            throw new Error(`Readiness Failure (Database): ${e.message}`);
        }

        // 2. Browser Health
        if (!(await browserManager.isHealthy())) {
            throw new Error('Readiness Failure (Browser): Browser subsystem is unhealthy or closed');
        }
        console.log('  - Browser: Healthy');

        // 3. Claude Session
        const claudeStatus = claudeManager.getStatus();
        if (!claudeStatus.healthy) {
            throw new Error('Readiness Failure (Session): Claude session validation failed or is unstable');
        }
        console.log('  - Session: Validated & Healthy');

        // 4. Worker State
        const state = stateMachine.getState();
        if (state !== 'READY' && state !== 'HEALTHY' && state !== 'BUSY') {
            throw new Error(`Readiness Failure (State): Worker state is ${state}, expected READY/HEALTHY/BUSY`);
        }
        console.log(`  - Worker State: ${state}`);

        // 5. Queue Operational
        if (queueService.paused) {
            throw new Error('Readiness Failure (Queue): Queue is paused or blocked');
        }
        console.log('  - Queue: Operational');

        // 6. Monitor Initialized
        if (!sessionMonitor) {
            throw new Error('Readiness Failure (Monitor): Session monitor was not instantiated');
        }
        console.log('  - Monitor: Initialized (Wait-State)');
    }

    _printHeader() {
        console.log('═══════════════════════════════');
        console.log('Claude Worker Foundation');
        console.log('System Bootstrap Pipeline');
        console.log('═══════════════════════════════\n');
    }

    _reportFailures() {
        const errors = this.validator.getErrors();
        console.log('\n✗ Validation Failed\n');
        errors.forEach(err => {
            console.log(`- ${err}`);
        });
        console.log('\nStartup halted due to validation errors.');
        process.exit(1);
    }
}

module.exports = { BootstrapManager };
