export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: any;
    errors?: any[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    }
}

export interface ApiErrorResponse {
    success: boolean;
    error: {
        code: string;
        message: string;
    }
}

export interface SiteDto {
    id: number;
    name: string;
    domain: string;
    active: boolean;
    postsCount: number;
    projectsCount: number;
    pendingAudits: number;
    pendingRewrites: number;
    pendingReviews: number;
    lastHeartbeat: string;
    presence: string;
    createdAt: string;
}

export interface ProjectDto {
    id: number;
    siteId: number;
    wpPostId: number;
    title: string;
    slug: string;
    contentState: string;
    workflowState: string;
    auditScore: number | null;
    intentScore: number | null;
    eeatScore: number | null;
    latestAuditId: number | null;
    latestRewriteId: number | null;
    lastSyncAt: string;
    lastAuditAt: string;
    lastRewriteAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobDto {
    id: number;
    projectId: number;
    siteId: number;
    type: string;
    status: string;
    priority: string;
    attemptCount: number;
    createdAt: string;
    startedAt: string;
    completedAt: string | null;
    runtimeMs: number;
}

export interface OverviewDto {
    total_sites: number;
    total_projects: number;
    projects_new: number;
    projects_stale: number;
    projects_review_pending: number;
    pending_audits: number;
    pending_rewrites: number;
    jobs_processing: number;
    jobs_failed: number;
    operations_pending: number;
    drafts_waiting_review: number;
}

export interface PluginHealthDto {
    version: string;
    protocol: string;
    backendVersion: string;
    registrationStatus: string;
    tokenStatus: string;
    lastHeartbeat: string;
    consecutiveFailures: number;
    presence: string;
}

export interface SiteSettingsDto {
    auditThreshold: number;
    rewriteThreshold: number;
    autoReauditDays: number;
    autoRewriteEnabled: boolean;
    autoPublishEnabled: boolean;
}

export interface OperationDto {
    id: number;
    site_id: number;
    operation_uuid: string;
    operation_type: string;
    payload: string;
    priority: string;
    status: string;
    attempt_count: number;
    created_at: string;
}

export interface ProjectHistoryDto {
    id: number;
    project_id: number;
    event_type: string;
    message: string;
    metadata: string;
    created_at: string;
}

export interface ProjectFilters {
    siteId?: string;
    contentState?: string;
    workflowState?: string;
    search?: string;
}

export interface AuditIssue {
    category: string;
    priority: string;
    description: string;
}

export interface AuditDto {
    id: number;
    projectId: number;
    siteId: number;
    jobId: number;
    status: string;
    seoScore: number | null;
    intentScore: number | null;
    eeatScore: number | null;
    readabilityScore: number | null;
    issues: AuditIssue[];
    recommendations: string[];
    promptVersion: string;
    promptHash: string;
    claudeChatId: string;
    runtimeMs: number;
    failureReason: string;
    createdAt: string;
    postTitle: string;
}

export interface SectionDiffDto {
    sectionName: string;
    diffType: string;
    content: string;
}

export interface RewriteSummaryDto {
    added: string[];
    improved: string[];
    removed: string[];
}

export interface RewriteDto {
    id: number;
    projectId: number;
    siteId: number;
    sourceAuditId: number;
    status: string;
    originalWordCount: number;
    rewrittenWordCount: number;
    wordsAdded: number;
    wordsRemoved: number;
    changePercentage: number;
    changeSeverity: string;
    summary: RewriteSummaryDto;
    sectionDiffs: SectionDiffDto[];
    runtimeMs: number;
    createdAt: string;
}

export interface VersionDto {
    id: number;
    project_id: number;
    rewrite_id: number | null;
    version_number: number;
    version_type: string;
    content: string;
    created_at: string;
}

export interface ReviewListDto {
    id: number;
    projectId: number;
    siteId: number;
    rewriteId: number;
    status: string;
    projectTitle: string;
    auditScore: number | null;
    rewriteSeverity: string;
    reviewerId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReviewDetailDto {
    id: number;
    projectId: number;
    siteId: number;
    rewriteId: number;
    status: string;
    projectTitle: string;
    reviewerId: string | null;
    assignedAt: string | null;
    assignedBy: string | null;
    auditScoreChange: number;
    intentImprovement: number;
    eeatImprovement: number;
    createdAt: string;
    updatedAt: string;
}
