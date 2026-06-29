const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';
const frontendDir = path.join(backendDir, 'dashboard');

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(frontendDir, 'app/audits/[auditId]'));
mkdirp(path.join(frontendDir, 'app/projects/[projectId]/audits'));
mkdirp(path.join(frontendDir, 'components/audits'));

// 1. Backend Schema Update
const schemaPath = path.join(backendDir, 'schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
if (!schemaContent.includes('seo_audits')) {
    schemaContent += `
CREATE TABLE seo_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    job_id INTEGER,
    status TEXT DEFAULT 'COMPLETED',
    seo_score INTEGER,
    intent_score INTEGER,
    eeat_score INTEGER,
    readability_score INTEGER,
    issues TEXT, -- JSON array
    recommendations TEXT, -- JSON array
    prompt_version TEXT,
    prompt_hash TEXT,
    claude_chat_id TEXT,
    runtime_ms INTEGER,
    failure_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
    fs.writeFileSync(schemaPath, schemaContent);
}

// 2. Backend Read Service
const readServicePath = path.join(backendDir, 'src/services/DashboardReadService.js');
let readServiceCode = fs.readFileSync(readServicePath, 'utf8');

if (!readServiceCode.includes('getAuditById')) {
    const newMethods = `
    getAuditById(id) {
        try {
            const r = this.db.prepare('SELECT * FROM seo_audits WHERE id = ?').get(id);
            if (!r) return null;
            return this.mapAuditDto(r);
        } catch(e) {
            return null;
        }
    }

    getProjectAudits(projectId) {
        try {
            const rows = this.db.prepare('SELECT * FROM seo_audits WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
            return rows.map(r => this.mapAuditDto(r));
        } catch(e) {
            return [];
        }
    }

    mapAuditDto(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            siteId: row.site_id,
            jobId: row.job_id,
            status: row.status,
            seoScore: row.seo_score,
            intentScore: row.intent_score,
            eeatScore: row.eeat_score,
            readabilityScore: row.readability_score,
            issues: JSON.parse(row.issues || '[]'),
            recommendations: JSON.parse(row.recommendations || '[]'),
            promptVersion: row.prompt_version,
            promptHash: row.prompt_hash,
            claudeChatId: row.claude_chat_id,
            runtimeMs: row.runtime_ms,
            failureReason: row.failure_reason,
            createdAt: row.created_at,
            postTitle: 'Placeholder Title'
        };
    }
`;
    readServiceCode = readServiceCode.replace(
        "getProjectById(id) {",
        newMethods + "\n    getProjectById(id) {"
    );
    fs.writeFileSync(readServicePath, readServiceCode);
}

// 3. Backend Routes
const routesPath = path.join(backendDir, 'src/api/dashboardRoutes.js');
let routesCode = fs.readFileSync(routesPath, 'utf8');

if (!routesCode.includes('/dashboard/audits/:id')) {
    const newRoutes = `
    router.get('/dashboard/audits/:id', (req, res) => {
        try {
            const data = dashboardReadService.getAuditById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Audit not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id/audits', (req, res) => {
        try {
            const data = dashboardReadService.getProjectAudits(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });
`;
    routesCode = routesCode.replace(
        "router.get('/dashboard/projects/:id/history'",
        newRoutes + "\n    router.get('/dashboard/projects/:id/history'"
    );
    fs.writeFileSync(routesPath, routesCode);
}


// 4. Frontend Types & Hooks
const apiTypesPath = path.join(frontendDir, 'lib/api/types.ts');
let apiTypesCode = fs.readFileSync(apiTypesPath, 'utf8');

if (!apiTypesCode.includes('AuditDto')) {
    apiTypesCode += `
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
`;
    fs.writeFileSync(apiTypesPath, apiTypesCode);
}

const useAuditsHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { AuditDto } from '../lib/api/types';

export function useAudit(auditId: string) {
    return useQuery({
        queryKey: ['audit', auditId],
        queryFn: async () => {
            const res = await apiClient<AuditDto>(\`/dashboard/audits/\${auditId}\`);
            return res.data;
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'PROCESSING' ? 15000 : false;
        },
    });
}

export function useProjectAudits(projectId: string) {
    return useQuery({
        queryKey: ['project_audits', projectId],
        queryFn: async () => {
            const res = await apiClient<AuditDto[]>(\`/dashboard/projects/\${projectId}/audits\`);
            return res.data;
        }
    });
}
`;
fs.writeFileSync(path.join(frontendDir, 'hooks/useAudits.ts'), useAuditsHook);


// 5. Audit Viewer Components
const auditHeader = `import React from 'react';
import { AuditDto } from '@/lib/api/types';
import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';

export function AuditHeader({ audit }: { audit: AuditDto }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href={\`/projects/\${audit.projectId}\`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            &larr; Project #{audit.projectId}
                        </Link>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">Site #{audit.siteId}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{audit.postTitle}</h1>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Audit #{audit.id}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(audit.createdAt).toLocaleString()}</div>
                </div>
            </div>
            
            <div className="flex gap-6 border-t pt-4 mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <span className={\`px-2 py-1 rounded text-xs font-bold \${audit.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : audit.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}\`}>
                        {audit.status}
                    </span>
                </div>
                {audit.runtimeMs > 0 && (
                    <div className="flex items-center gap-1">
                        <Clock size={16} /> Runtime: {(audit.runtimeMs / 1000).toFixed(1)}s
                    </div>
                )}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/audits/AuditHeader.tsx'), auditHeader);

const scoreCards = `import React from 'react';
import { AuditDto } from '@/lib/api/types';

export function ScoreCards({ audit }: { audit: AuditDto }) {
    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-gray-400 border-gray-200 bg-gray-50';
        if (score >= 90) return 'text-green-700 border-green-200 bg-green-50';
        if (score >= 75) return 'text-blue-700 border-blue-200 bg-blue-50';
        if (score >= 60) return 'text-yellow-700 border-yellow-200 bg-yellow-50';
        return 'text-red-700 border-red-200 bg-red-50';
    };
    
    const getScoreLabel = (score: number | null) => {
        if (score === null) return 'N/A';
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Needs Improvement';
        return 'Critical';
    };

    const scores = [
        { label: 'SEO Score', value: audit.seoScore },
        { label: 'Intent Score', value: audit.intentScore },
        { label: 'E-E-A-T Score', value: audit.eeatScore },
        { label: 'Readability', value: audit.readabilityScore },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {scores.map(s => (
                <div key={s.label} className={\`p-5 border rounded-lg flex flex-col items-center justify-center \${getScoreColor(s.value)}\`}>
                    <div className="text-3xl font-bold mb-1">{s.value ?? '-'}</div>
                    <div className="text-sm font-semibold uppercase tracking-wider">{s.label}</div>
                    <div className="text-xs mt-2 opacity-80">{getScoreLabel(s.value)}</div>
                </div>
            ))}
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/audits/ScoreCards.tsx'), scoreCards);

const issueGroups = `import React from 'react';
import { AuditDto } from '@/lib/api/types';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export function IssueGroups({ audit }: { audit: AuditDto }) {
    if (!audit.issues || audit.issues.length === 0) return null;

    const categories = Array.from(new Set(audit.issues.map(i => i.category)));

    const getPriorityIcon = (priority: string) => {
        switch(priority.toUpperCase()) {
            case 'CRITICAL': return <ShieldAlert size={16} className="text-red-600"/>;
            case 'HIGH': return <AlertTriangle size={16} className="text-orange-600"/>;
            case 'MEDIUM': return <AlertTriangle size={16} className="text-yellow-600"/>;
            default: return <Info size={16} className="text-blue-600"/>;
        }
    }

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-6">Identified Issues</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {categories.map(cat => (
                    <div key={cat}>
                        <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">{cat}</h3>
                        <ul className="space-y-3">
                            {audit.issues.filter(i => i.category === cat).map((issue, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                    <div className="mt-0.5">{getPriorityIcon(issue.priority)}</div>
                                    <span className="text-gray-700">{issue.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/audits/IssueGroups.tsx'), issueGroups);

const auditMetadata = `import React from 'react';
import { AuditDto } from '@/lib/api/types';
import { Fingerprint, MessageSquare } from 'lucide-react';

export function AuditMetadata({ audit }: { audit: AuditDto }) {
    return (
        <div className="bg-gray-50 border rounded-lg p-6 mt-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Audit Diagnostics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                    <div className="text-gray-500 mb-1">Prompt Version</div>
                    <div className="font-mono text-gray-900">{audit.promptVersion || 'N/A'}</div>
                </div>
                <div>
                    <div className="text-gray-500 mb-1">Prompt Hash</div>
                    <div className="font-mono text-gray-900 truncate flex items-center gap-1">
                        <Fingerprint size={14}/> {audit.promptHash || 'N/A'}
                    </div>
                </div>
                <div className="col-span-2">
                    <div className="text-gray-500 mb-1">Claude Chat ID</div>
                    <div className="font-mono text-gray-900 flex items-center gap-1">
                        <MessageSquare size={14}/> {audit.claudeChatId || 'N/A'}
                    </div>
                </div>
            </div>
            {audit.failureReason && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded text-sm">
                    <strong>Failure Classification:</strong> {audit.failureReason}
                </div>
            )}
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/audits/AuditMetadata.tsx'), auditMetadata);

const auditTimeline = `import React from 'react';
import { useProjectAudits } from '@/hooks/useAudits';
import Link from 'next/link';

export function AuditTimeline({ projectId, currentAuditId }: { projectId: number, currentAuditId: number }) {
    const { data: audits, isLoading } = useProjectAudits(projectId.toString());

    if (isLoading) return <div className="p-4 animate-pulse bg-gray-50 rounded h-32" />;
    
    if (!audits || audits.length <= 1) return null;

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Audit History</h2>
            <div className="flex space-x-4 overflow-x-auto pb-2">
                {audits.map((a, i) => {
                    const isActive = a.id === currentAuditId;
                    return (
                        <Link 
                            key={a.id} 
                            href={\`/audits/\${a.id}\`}
                            className={\`flex-shrink-0 p-3 border rounded-lg min-w-32 \${isActive ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50'}\`}
                        >
                            <div className="text-xs text-gray-500 font-semibold mb-1">Audit #{a.id}</div>
                            <div className="text-xl font-bold">SEO: {a.seoScore || '-'}</div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/audits/AuditTimeline.tsx'), auditTimeline);

// 6. Audit Detail Page
const auditDetailPage = `"use client";
import { useAudit } from '@/hooks/useAudits';
import { use } from 'react';
import { AuditHeader } from '@/components/audits/AuditHeader';
import { ScoreCards } from '@/components/audits/ScoreCards';
import { IssueGroups } from '@/components/audits/IssueGroups';
import { AuditMetadata } from '@/components/audits/AuditMetadata';
import { AuditTimeline } from '@/components/audits/AuditTimeline';

export default function AuditDetail({ params }: { params: Promise<{auditId: string}> }) {
    const { auditId } = use(params);
    const { data: audit, isLoading, isError } = useAudit(auditId);

    if (isLoading) return <div className="p-8 max-w-5xl mx-auto animate-pulse">Loading audit data...</div>;
    if (isError || !audit) return <div className="p-8 text-red-500 max-w-5xl mx-auto">Audit not found or error loading.</div>;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <AuditHeader audit={audit} />
            <ScoreCards audit={audit} />
            
            <AuditTimeline projectId={audit.projectId} currentAuditId={audit.id} />
            
            <IssueGroups audit={audit} />
            <AuditMetadata audit={audit} />
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/audits/[auditId]/page.tsx'), auditDetailPage);

// 7. Connect Project Detail -> Audits Page Link
// Update app/projects/[projectId]/page.tsx to add link to latest audit if it exists
let projectDetailCode = fs.readFileSync(path.join(frontendDir, 'app/projects/[projectId]/page.tsx'), 'utf8');
if (!projectDetailCode.includes('/audits/${project.latestAuditId}')) {
    projectDetailCode = projectDetailCode.replace(
        "<div>\n                        <div className=\"text-xs text-gray-500 uppercase tracking-wide\">Audit Score</div>\n                        <div className=\"font-semibold text-lg mt-1 text-blue-600\">{project.auditScore || 'N/A'}</div>\n                    </div>",
        "<div>\n                        <div className=\"text-xs text-gray-500 uppercase tracking-wide\">Audit Score</div>\n                        <div className=\"font-semibold text-lg mt-1 text-blue-600\">\n                            {project.latestAuditId ? <Link href={\`/audits/\${project.latestAuditId}\`} className=\"hover:underline\">{project.auditScore || 'View Audit'}</Link> : (project.auditScore || 'N/A')}\n                        </div>\n                    </div>"
    );
    fs.writeFileSync(path.join(frontendDir, 'app/projects/[projectId]/page.tsx'), projectDetailCode);
}

console.log("Setup complete for Frontend Phase D5");
