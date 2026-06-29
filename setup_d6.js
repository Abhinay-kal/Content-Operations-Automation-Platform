const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';
const frontendDir = path.join(backendDir, 'dashboard');

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(frontendDir, 'app/rewrites/[rewriteId]'));
mkdirp(path.join(frontendDir, 'components/rewrites'));
mkdirp(path.join(frontendDir, 'hooks'));

// 1. Backend Schema Update
const schemaPath = path.join(backendDir, 'schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
if (!schemaContent.includes('seo_rewrites')) {
    schemaContent += `
CREATE TABLE seo_rewrites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    source_audit_id INTEGER,
    status TEXT DEFAULT 'COMPLETED',
    original_word_count INTEGER,
    rewritten_word_count INTEGER,
    words_added INTEGER,
    words_removed INTEGER,
    change_percentage REAL,
    change_severity TEXT, -- MINIMAL_CHANGE, MODERATE_CHANGE, MAJOR_REWRITE, COMPLETE_REWRITE
    summary TEXT, -- JSON structure { added: [], improved: [], removed: [] }
    section_diffs TEXT, -- JSON array of section diffs
    runtime_ms INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    rewrite_id INTEGER,
    version_number INTEGER NOT NULL,
    version_type TEXT, -- ORIGINAL, REWRITE, EDITOR_CHANGES
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
    fs.writeFileSync(schemaPath, schemaContent);
}

// 2. Backend Read Service
const readServicePath = path.join(backendDir, 'src/services/DashboardReadService.js');
let readServiceCode = fs.readFileSync(readServicePath, 'utf8');

if (!readServiceCode.includes('getRewriteById')) {
    const newMethods = `
    getRewriteById(id) {
        try {
            const r = this.db.prepare('SELECT * FROM seo_rewrites WHERE id = ?').get(id);
            if (!r) return null;
            return this.mapRewriteDto(r);
        } catch(e) {
            return null;
        }
    }

    getProjectRewrites(projectId) {
        try {
            const rows = this.db.prepare('SELECT * FROM seo_rewrites WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
            return rows.map(r => this.mapRewriteDto(r));
        } catch(e) {
            return [];
        }
    }

    getVersionById(id) {
        try {
            return this.db.prepare('SELECT * FROM content_versions WHERE id = ?').get(id);
        } catch(e) {
            return null;
        }
    }

    getProjectVersions(projectId) {
        try {
            return this.db.prepare('SELECT * FROM content_versions WHERE project_id = ? ORDER BY version_number ASC').all(projectId);
        } catch(e) {
            return [];
        }
    }

    mapRewriteDto(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            siteId: row.site_id,
            sourceAuditId: row.source_audit_id,
            status: row.status,
            originalWordCount: row.original_word_count || 0,
            rewrittenWordCount: row.rewritten_word_count || 0,
            wordsAdded: row.words_added || 0,
            wordsRemoved: row.words_removed || 0,
            changePercentage: row.change_percentage || 0,
            changeSeverity: row.change_severity || 'MODERATE_CHANGE',
            summary: JSON.parse(row.summary || '{"added":[],"improved":[],"removed":[]}'),
            sectionDiffs: JSON.parse(row.section_diffs || '[]'),
            runtimeMs: row.runtime_ms || 0,
            createdAt: row.created_at
        };
    }
`;
    readServiceCode = readServiceCode.replace(
        "getProjectAudits(projectId) {",
        newMethods + "\n    getProjectAudits(projectId) {"
    );
    fs.writeFileSync(readServicePath, readServiceCode);
}

// 3. Backend Routes
const routesPath = path.join(backendDir, 'src/api/dashboardRoutes.js');
let routesCode = fs.readFileSync(routesPath, 'utf8');

if (!routesCode.includes('/dashboard/rewrites/:id')) {
    const newRoutes = `
    router.get('/dashboard/rewrites/:id', (req, res) => {
        try {
            const data = dashboardReadService.getRewriteById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Rewrite not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id/rewrites', (req, res) => {
        try {
            const data = dashboardReadService.getProjectRewrites(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/versions/:id', (req, res) => {
        try {
            const data = dashboardReadService.getVersionById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Version not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/projects/:id/versions', (req, res) => {
        try {
            const data = dashboardReadService.getProjectVersions(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });
`;
    routesCode = routesCode.replace(
        "router.get('/dashboard/projects/:id/audits'",
        newRoutes + "\n    router.get('/dashboard/projects/:id/audits'"
    );
    fs.writeFileSync(routesPath, routesCode);
}


// 4. Frontend Types
const apiTypesPath = path.join(frontendDir, 'lib/api/types.ts');
let apiTypesCode = fs.readFileSync(apiTypesPath, 'utf8');

if (!apiTypesCode.includes('RewriteDto')) {
    apiTypesCode += `
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
`;
    fs.writeFileSync(apiTypesPath, apiTypesCode);
}

// 5. Hooks
const useRewritesHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { RewriteDto, VersionDto } from '../lib/api/types';

export function useRewrite(rewriteId: string) {
    return useQuery({
        queryKey: ['rewrite', rewriteId],
        queryFn: async () => {
            const res = await apiClient<RewriteDto>(\`/dashboard/rewrites/\${rewriteId}\`);
            return res.data;
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'PROCESSING' ? 15000 : false;
        },
    });
}

export function useProjectRewrites(projectId: string) {
    return useQuery({
        queryKey: ['project_rewrites', projectId],
        queryFn: async () => {
            const res = await apiClient<RewriteDto[]>(\`/dashboard/projects/\${projectId}/rewrites\`);
            return res.data;
        }
    });
}

export function useProjectVersions(projectId: string) {
    return useQuery({
        queryKey: ['project_versions', projectId],
        queryFn: async () => {
            const res = await apiClient<VersionDto[]>(\`/dashboard/projects/\${projectId}/versions\`);
            return res.data;
        }
    });
}
`;
fs.writeFileSync(path.join(frontendDir, 'hooks/useRewrites.ts'), useRewritesHook);

// 6. Components
const rewriteHeader = `import React from 'react';
import { RewriteDto } from '@/lib/api/types';
import Link from 'next/link';
import { Clock } from 'lucide-react';

export function RewriteHeader({ rewrite }: { rewrite: RewriteDto }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href={\`/projects/\${rewrite.projectId}\`} className="text-sm text-blue-600 hover:underline">
                            &larr; Project #{rewrite.projectId}
                        </Link>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">Site #{rewrite.siteId}</span>
                        {rewrite.sourceAuditId && (
                            <>
                                <span className="text-gray-300">|</span>
                                <Link href={\`/audits/\${rewrite.sourceAuditId}\`} className="text-sm text-blue-600 hover:underline">
                                    Source Audit #{rewrite.sourceAuditId}
                                </Link>
                            </>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Rewrite #{rewrite.id} Details</h1>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400 mt-1">{new Date(rewrite.createdAt).toLocaleString()}</div>
                </div>
            </div>
            <div className="flex gap-6 border-t pt-4 mt-4 text-sm text-gray-600">
                <span className={\`px-2 py-1 rounded text-xs font-bold \${rewrite.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}\`}>
                    {rewrite.status}
                </span>
                {rewrite.runtimeMs > 0 && (
                    <div className="flex items-center gap-1">
                        <Clock size={16} /> Runtime: {(rewrite.runtimeMs / 1000).toFixed(1)}s
                    </div>
                )}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/rewrites/RewriteHeader.tsx'), rewriteHeader);

const rewriteHealthBadge = `import React from 'react';

export function RewriteHealthBadge({ severity }: { severity: string }) {
    let style = "bg-gray-100 text-gray-800";
    if (severity === 'MINIMAL_CHANGE') style = "bg-blue-100 text-blue-800";
    if (severity === 'MODERATE_CHANGE') style = "bg-purple-100 text-purple-800";
    if (severity === 'MAJOR_REWRITE') style = "bg-orange-100 text-orange-800";
    if (severity === 'COMPLETE_REWRITE') style = "bg-red-100 text-red-800";

    return (
        <span className={\`px-3 py-1 rounded-full text-xs font-bold \${style}\`}>
            {severity.replace('_', ' ')}
        </span>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/rewrites/RewriteHealthBadge.tsx'), rewriteHealthBadge);

const rewriteMetrics = `import React from 'react';
import { RewriteDto } from '@/lib/api/types';
import { RewriteHealthBadge } from './RewriteHealthBadge';

export function RewriteMetrics({ rewrite }: { rewrite: RewriteDto }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Rewrite Metrics</h2>
                <RewriteHealthBadge severity={rewrite.changeSeverity} />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-50 rounded border">
                    <div className="text-xs text-gray-500 uppercase">Original Words</div>
                    <div className="text-2xl font-semibold mt-1">{rewrite.originalWordCount}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded border">
                    <div className="text-xs text-gray-500 uppercase">New Words</div>
                    <div className="text-2xl font-semibold mt-1">{rewrite.rewrittenWordCount}</div>
                </div>
                <div className="p-4 bg-green-50 rounded border text-green-700">
                    <div className="text-xs uppercase">Words Added</div>
                    <div className="text-2xl font-semibold mt-1">+{rewrite.wordsAdded}</div>
                </div>
                <div className="p-4 bg-red-50 rounded border text-red-700">
                    <div className="text-xs uppercase">Words Removed</div>
                    <div className="text-2xl font-semibold mt-1">-{rewrite.wordsRemoved}</div>
                </div>
                <div className="p-4 bg-blue-50 rounded border text-blue-700">
                    <div className="text-xs uppercase">Change %</div>
                    <div className="text-2xl font-semibold mt-1">{rewrite.changePercentage.toFixed(1)}%</div>
                </div>
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/rewrites/RewriteMetrics.tsx'), rewriteMetrics);

const rewriteSummary = `import React from 'react';
import { RewriteDto } from '@/lib/api/types';
import { Check, Plus, Minus } from 'lucide-react';

export function RewriteSummary({ rewrite }: { rewrite: RewriteDto }) {
    const sum = rewrite.summary;
    if (!sum) return null;

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">AI Rewrite Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="p-4 bg-green-50 border border-green-100 rounded">
                    <div className="font-semibold text-green-800 flex items-center gap-1 mb-2"><Plus size={16}/> Added</div>
                    <ul className="space-y-1 text-green-900">
                        {sum.added?.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded">
                    <div className="font-semibold text-blue-800 flex items-center gap-1 mb-2"><Check size={16}/> Improved</div>
                    <ul className="space-y-1 text-blue-900">
                        {sum.improved?.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded">
                    <div className="font-semibold text-red-800 flex items-center gap-1 mb-2"><Minus size={16}/> Removed</div>
                    <ul className="space-y-1 text-red-900">
                        {sum.removed?.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/rewrites/RewriteSummary.tsx'), rewriteSummary);


const diffViewer = `import React, { useState } from 'react';
import { RewriteDto } from '@/lib/api/types';

export function DiffViewer({ rewrite }: { rewrite: RewriteDto }) {
    const [mode, setMode] = useState<'inline' | 'split'>('inline');

    if (!rewrite.sectionDiffs || rewrite.sectionDiffs.length === 0) {
        return <div className="bg-white p-6 border rounded-lg text-gray-500">No diff data available.</div>;
    }

    return (
        <div className="bg-white border rounded-lg shadow-sm mb-6">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h2 className="text-lg font-bold">Section Diff Viewer</h2>
                <div className="space-x-2">
                    <button onClick={() => setMode('inline')} className={\`px-3 py-1 text-sm rounded \${mode === 'inline' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}\`}>Inline</button>
                    <button onClick={() => setMode('split')} className={\`px-3 py-1 text-sm rounded \${mode === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}\`}>Side-by-side</button>
                </div>
            </div>
            
            <div className="divide-y">
                {rewrite.sectionDiffs.map((diff, idx) => (
                    <div key={idx} className="p-0">
                        <div className="bg-gray-100 px-4 py-2 font-mono text-sm text-gray-600 font-semibold">{diff.sectionName}</div>
                        <div className="p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                            {diff.diffType === 'ADDED' && <div className="text-green-700 bg-green-50 p-2 rounded">+{diff.content}</div>}
                            {diff.diffType === 'REMOVED' && <div className="text-red-700 bg-red-50 p-2 rounded">-{diff.content}</div>}
                            {diff.diffType === 'MODIFIED' && (
                                mode === 'inline' ? (
                                    <div className="text-blue-700 bg-blue-50 p-2 rounded">~{diff.content}</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-red-700 bg-red-50 p-2 rounded">-{diff.content}</div>
                                        <div className="text-green-700 bg-green-50 p-2 rounded">+{diff.content}</div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/rewrites/DiffViewer.tsx'), diffViewer);


const rewriteTimeline = `import React from 'react';
import { useProjectRewrites } from '@/hooks/useRewrites';
import Link from 'next/link';

export function RewriteTimeline({ projectId, currentRewriteId }: { projectId: number, currentRewriteId: number }) {
    const { data: rewrites, isLoading } = useProjectRewrites(projectId.toString());

    if (isLoading) return <div className="p-4 animate-pulse bg-gray-50 rounded h-24 mb-6" />;
    
    if (!rewrites || rewrites.length <= 1) return null;

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Rewrite History</h2>
            <div className="flex space-x-4 overflow-x-auto pb-2">
                {rewrites.map((r, i) => {
                    const isActive = r.id === currentRewriteId;
                    return (
                        <Link 
                            key={r.id} 
                            href={\`/rewrites/\${r.id}\`}
                            className={\`flex-shrink-0 p-3 border rounded-lg min-w-32 \${isActive ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50'}\`}
                        >
                            <div className="text-xs text-gray-500 font-semibold mb-1">Rewrite #{r.id}</div>
                            <div className="text-sm font-medium">{r.changePercentage.toFixed(1)}% changed</div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/rewrites/RewriteTimeline.tsx'), rewriteTimeline);


const versionBrowser = `import React from 'react';
import { useProjectVersions } from '@/hooks/useRewrites';

export function VersionBrowser({ projectId }: { projectId: number }) {
    const { data: versions, isLoading } = useProjectVersions(projectId.toString());

    if (isLoading) return <div className="p-4 animate-pulse bg-gray-50 rounded h-24 mb-6" />;
    if (!versions || versions.length === 0) return null;

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Version Browser</h2>
            <div className="flex space-x-2">
                {versions.map(v => (
                    <div key={v.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="text-sm font-bold">V{v.version_number}</div>
                        <div className="text-xs text-gray-500">{v.version_type}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/rewrites/VersionBrowser.tsx'), versionBrowser);


// 7. Page File
const rewriteDetailPage = `"use client";
import { useRewrite } from '@/hooks/useRewrites';
import { use } from 'react';
import { RewriteHeader } from '@/components/rewrites/RewriteHeader';
import { RewriteMetrics } from '@/components/rewrites/RewriteMetrics';
import { RewriteSummary } from '@/components/rewrites/RewriteSummary';
import { DiffViewer } from '@/components/rewrites/DiffViewer';
import { RewriteTimeline } from '@/components/rewrites/RewriteTimeline';
import { VersionBrowser } from '@/components/rewrites/VersionBrowser';

export default function RewriteDetail({ params }: { params: Promise<{rewriteId: string}> }) {
    const { rewriteId } = use(params);
    const { data: rewrite, isLoading, isError } = useRewrite(rewriteId);

    if (isLoading) return <div className="p-8 max-w-5xl mx-auto animate-pulse">Loading rewrite data...</div>;
    if (isError || !rewrite) return <div className="p-8 text-red-500 max-w-5xl mx-auto">Rewrite not found or error loading.</div>;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <RewriteHeader rewrite={rewrite} />
            <RewriteMetrics rewrite={rewrite} />
            
            <RewriteTimeline projectId={rewrite.projectId} currentRewriteId={rewrite.id} />
            
            <RewriteSummary rewrite={rewrite} />
            <DiffViewer rewrite={rewrite} />

            <VersionBrowser projectId={rewrite.projectId} />
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/rewrites/[rewriteId]/page.tsx'), rewriteDetailPage);


// 8. Connect Project Detail -> Rewrites Link
let projectDetailCode = fs.readFileSync(path.join(frontendDir, 'app/projects/[projectId]/page.tsx'), 'utf8');
if (!projectDetailCode.includes('/rewrites/${project.latestRewriteId}')) {
    // Add a link next to "WP Post ID" for rewrites, or just add a quick link in header if latestRewriteId exists
    projectDetailCode = projectDetailCode.replace(
        "<span>WP Post ID {project.wpPostId}</span>\n                        </div>",
        "<span>WP Post ID {project.wpPostId}</span>\n                            {project.latestRewriteId && <span className=\"px-2 border-l ml-2 pl-4\"><Link href={\`/rewrites/\${project.latestRewriteId}\`} className=\"text-blue-600 hover:underline\">View Latest Rewrite</Link></span>}\n                        </div>"
    );
    fs.writeFileSync(path.join(frontendDir, 'app/projects/[projectId]/page.tsx'), projectDetailCode);
}


console.log("Setup complete for Frontend Phase D6");
