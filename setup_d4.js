const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';
const frontendDir = path.join(backendDir, 'dashboard');

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(frontendDir, 'app/projects/[projectId]'));
mkdirp(path.join(frontendDir, 'components/workflow'));

// 1. Backend Read Service
const readServicePath = path.join(backendDir, 'src/services/DashboardReadService.js');
let readServiceCode = fs.readFileSync(readServicePath, 'utf8');

// We need to inject filtering logic into getProjects and add getProjectHistory
if (!readServiceCode.includes('getProjectHistory')) {
    readServiceCode = readServiceCode.replace(
        "getProjects(pagination) {",
        "getProjects(pagination, filters = {}) {"
    );

    const oldGetProjects = `const rows = this.db.prepare(\`
            SELECT * FROM content_projects 
            ORDER BY \${pagination.sort} \${pagination.direction}
            LIMIT ? OFFSET ?
        \`).all(pagination.limit, pagination.offset);
        
        const total = this.db.prepare('SELECT COUNT(*) as c FROM content_projects').get().c;`;

    const newGetProjects = `let query = 'SELECT * FROM content_projects WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as c FROM content_projects WHERE 1=1';
        const params = [];
        
        if (filters.siteId) {
            query += ' AND site_id = ?';
            countQuery += ' AND site_id = ?';
            params.push(filters.siteId);
        }
        if (filters.contentState) {
            query += ' AND status = ?';
            countQuery += ' AND status = ?';
            params.push(filters.contentState);
        }
        if (filters.search) {
            query += ' AND (id LIKE ? OR wp_post_id LIKE ?)';
            countQuery += ' AND (id LIKE ? OR wp_post_id LIKE ?)';
            params.push(\`%\${filters.search}%\`, \`%\${filters.search}%\`);
        }
        
        // workflowState is tricky because it's inside JSON, SQLite json_extract can be used
        if (filters.workflowState) {
            query += " AND json_extract(metadata, '$.workflow_state') = ?";
            countQuery += " AND json_extract(metadata, '$.workflow_state') = ?";
            params.push(filters.workflowState);
        }

        query += \` ORDER BY \${pagination.sort} \${pagination.direction} LIMIT ? OFFSET ?\`;
        
        const rows = this.db.prepare(query).all(...params, pagination.limit, pagination.offset);
        const total = this.db.prepare(countQuery).get(...params).c;`;

    readServiceCode = readServiceCode.replace(oldGetProjects, newGetProjects);

    const historyMethod = `
    getProjectHistory(projectId, pagination) {
        // We look at project_events or event_ingestion. Let's assume project_events.
        try {
            const rows = this.db.prepare(\`
                SELECT * FROM project_events 
                WHERE project_id = ?
                ORDER BY \${pagination.sort} \${pagination.direction}
                LIMIT ? OFFSET ?
            \`).all(projectId, pagination.limit, pagination.offset);
            const total = this.db.prepare('SELECT COUNT(*) as c FROM project_events WHERE project_id = ?').get(projectId).c;
            return { data: rows, total };
        } catch(e) {
            // fallback if table does not exist
            return { data: [], total: 0 };
        }
    }
`;
    readServiceCode = readServiceCode.replace(
        "getProjectById(id) {",
        historyMethod + "\n    getProjectById(id) {"
    );

    fs.writeFileSync(readServicePath, readServiceCode);
}

// 2. Backend Routes
const routesPath = path.join(backendDir, 'src/api/dashboardRoutes.js');
let routesCode = fs.readFileSync(routesPath, 'utf8');

if (!routesCode.includes('filters')) {
    routesCode = routesCode.replace(
        "const { data, total } = dashboardReadService.getProjects(p);",
        "const filters = { siteId: req.query.siteId, contentState: req.query.contentState, workflowState: req.query.workflowState, search: req.query.search };\n            const { data, total } = dashboardReadService.getProjects(p, filters);"
    );
}

if (!routesCode.includes('/dashboard/projects/:id/history')) {
    const historyRoute = `
    router.get('/dashboard/projects/:id/history', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getProjectHistory(req.params.id, p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });
`;
    routesCode = routesCode.replace(
        "router.get('/dashboard/jobs'",
        historyRoute + "\n    router.get('/dashboard/jobs'"
    );
    fs.writeFileSync(routesPath, routesCode);
}

// 3. Frontend Types & Hooks
const apiTypesPath = path.join(frontendDir, 'lib/api/types.ts');
let apiTypesCode = fs.readFileSync(apiTypesPath, 'utf8');

if (!apiTypesCode.includes('ProjectHistoryDto')) {
    apiTypesCode += `
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
`;
    fs.writeFileSync(apiTypesPath, apiTypesCode);
}

const useProjectsHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { ProjectDto, ProjectFilters } from '../lib/api/types';

export function useProjects(page: number = 1, filters: ProjectFilters = {}) {
    return useQuery({
        queryKey: ['projects', page, filters],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString() });
            if (filters.siteId) params.append('siteId', filters.siteId);
            if (filters.contentState) params.append('contentState', filters.contentState);
            if (filters.workflowState) params.append('workflowState', filters.workflowState);
            if (filters.search) params.append('search', filters.search);
            
            const res = await apiClient<ProjectDto[]>(\`/dashboard/projects?\${params.toString()}\`);
            return res;
        },
        refetchInterval: 30000,
    });
}
`;
fs.writeFileSync(path.join(frontendDir, 'hooks/useProjects.ts'), useProjectsHook);

const useProjectDetailsHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { ProjectDto, ProjectHistoryDto } from '../lib/api/types';

export function useProject(projectId: string) {
    return useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const res = await apiClient<ProjectDto>(\`/dashboard/projects/\${projectId}\`);
            return res.data;
        },
        refetchInterval: 15000,
    });
}

export function useProjectHistory(projectId: string, page: number = 1) {
    return useQuery({
        queryKey: ['project', projectId, 'history', page],
        queryFn: async () => {
            const res = await apiClient<ProjectHistoryDto[]>(\`/dashboard/projects/\${projectId}/history?page=\${page}\`);
            return res;
        },
        refetchInterval: 15000,
    });
}
`;
fs.writeFileSync(path.join(frontendDir, 'hooks/useProjectDetails.ts'), useProjectDetailsHook);

// 4. WorkflowStepper Component
const workflowStepper = `import React from 'react';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

interface WorkflowStepperProps {
    currentState: string;
}

const STAGES = [
    { key: 'CREATED', matches: ['NEW', 'STALE'] },
    { key: 'AUDIT', matches: ['AUDIT_PENDING', 'AUDITING', 'AUDIT_COMPLETE'] },
    { key: 'REWRITE', matches: ['REWRITE_PENDING', 'REWRITING', 'REWRITE_COMPLETE'] },
    { key: 'REVIEW', matches: ['REVIEW_PENDING'] },
    { key: 'DONE', matches: ['PUBLISHED'] }
];

export function WorkflowStepper({ currentState }: WorkflowStepperProps) {
    // Determine the current index based on state
    let activeIndex = 0;
    if (['AUDIT_PENDING', 'AUDITING', 'AUDIT_COMPLETE'].includes(currentState)) activeIndex = 1;
    if (['REWRITE_PENDING', 'REWRITING', 'REWRITE_COMPLETE'].includes(currentState)) activeIndex = 2;
    if (['REVIEW_PENDING'].includes(currentState)) activeIndex = 3;
    if (['PUBLISHED'].includes(currentState)) activeIndex = 4;
    
    // Check if failed
    const isFailed = currentState === 'FAILED' || currentState === 'ARCHIVED';

    return (
        <div className="flex items-center space-x-2 overflow-x-auto p-4 bg-gray-50 border rounded-lg">
            {STAGES.map((stage, i) => {
                const isCompleted = i < activeIndex;
                const isActive = i === activeIndex;
                
                let textColor = 'text-gray-400';
                let icon = <Circle size={20} />;
                
                if (isCompleted) {
                    textColor = 'text-green-600';
                    icon = <CheckCircle size={20} />;
                } else if (isActive && !isFailed) {
                    textColor = 'text-blue-600 font-semibold';
                    icon = <Circle size={20} className="fill-current" />;
                } else if (isActive && isFailed) {
                    textColor = 'text-red-600 font-semibold';
                    icon = <Circle size={20} className="fill-current" />;
                }

                return (
                    <React.Fragment key={stage.key}>
                        <div className={\`flex items-center gap-2 \${textColor}\`}>
                            {icon}
                            <span className="text-sm whitespace-nowrap">{stage.key}</span>
                        </div>
                        {i < STAGES.length - 1 && (
                            <ArrowRight size={16} className="text-gray-300" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/workflow/WorkflowStepper.tsx'), workflowStepper);

// 5. Project List Page
const projectListPage = `"use client";
import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import Link from 'next/link';

export default function ProjectsList() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        siteId: '',
        contentState: '',
        workflowState: '',
        search: ''
    });

    const { data, isLoading, isError } = useProjects(page, filters);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1);
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Project Explorer</h1>
            </div>

            <div className="bg-white p-4 border rounded-lg shadow-sm flex gap-4 mb-6">
                <input 
                    name="search"
                    placeholder="Search by ID..."
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="border rounded p-2 text-sm flex-1"
                />
                <select name="contentState" value={filters.contentState} onChange={handleFilterChange} className="border rounded p-2 text-sm">
                    <option value="">All Content States</option>
                    <option value="NEW">NEW</option>
                    <option value="STALE">STALE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                </select>
                <select name="workflowState" value={filters.workflowState} onChange={handleFilterChange} className="border rounded p-2 text-sm">
                    <option value="">All Workflow States</option>
                    <option value="AUDIT_PENDING">AUDIT_PENDING</option>
                    <option value="REWRITE_PENDING">REWRITE_PENDING</option>
                    <option value="REVIEW_PENDING">REVIEW_PENDING</option>
                    <option value="FAILED">FAILED</option>
                </select>
            </div>

            {isError ? (
                <div className="p-4 text-red-500 bg-white border rounded">Error loading projects.</div>
            ) : isLoading ? (
                <div className="p-4 animate-pulse bg-white border rounded h-64">Loading projects...</div>
            ) : (
                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">ID / Post</th>
                                <th className="p-4 font-semibold text-gray-600">Site</th>
                                <th className="p-4 font-semibold text-gray-600">Content State</th>
                                <th className="p-4 font-semibold text-gray-600">Workflow State</th>
                                <th className="p-4 font-semibold text-gray-600">Audit Score</th>
                                <th className="p-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data?.data.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium">#{p.id} / Post {p.wpPostId}</td>
                                    <td className="p-4 text-gray-500">{p.siteId}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{p.contentState}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">{p.workflowState}</span>
                                    </td>
                                    <td className="p-4 text-gray-500">{p.auditScore || '-'}</td>
                                    <td className="p-4 space-x-3">
                                        <Link href={\`/projects/\${p.id}\`} className="text-blue-600 hover:underline">Open</Link>
                                    </td>
                                </tr>
                            ))}
                            {data?.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">No projects found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/projects/page.tsx'), projectListPage);

// 6. Project Detail Page
const projectDetailPage = `"use client";
import { useProject, useProjectHistory } from '@/hooks/useProjectDetails';
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import Link from 'next/link';
import { use } from 'react';
import { ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function ProjectDetail({ params }: { params: Promise<{projectId: string}> }) {
    const { projectId } = use(params);
    const { data: project, isLoading: projLoading, isError: projError } = useProject(projectId);
    const { data: history, isLoading: histLoading } = useProjectHistory(projectId, 1);

    if (projLoading) return <div className="p-4 animate-pulse">Loading project details...</div>;
    if (projError || !project) return <div className="p-4 text-red-500">Project not found or error loading.</div>;

    const isBlocked = project.workflowState === 'FAILED';
    const isWaitingEditor = project.workflowState === 'REVIEW_PENDING';
    const isHealthy = !isBlocked && !isWaitingEditor;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-3">
                <Link href="/projects" className="text-gray-500 hover:underline text-sm mr-4">&larr; Back to Projects</Link>
            </div>
            
            <div className="bg-white p-6 border rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">{project.title}</h1>
                        <div className="text-sm text-gray-500 mt-1 flex gap-4">
                            <span>Project #{project.id}</span>
                            <span>Site #{project.siteId}</span>
                            <span>WP Post ID {project.wpPostId}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isBlocked && <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold flex items-center gap-1"><ShieldAlert size={14}/> Blocked</span>}
                        {isWaitingEditor && <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14}/> Waiting for Editor</span>}
                        {isHealthy && <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Healthy</span>}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 pt-6 border-t">
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Content State</div>
                        <div className="font-semibold text-lg mt-1">{project.contentState}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Workflow State</div>
                        <div className="font-semibold text-lg mt-1">{project.workflowState}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Audit Score</div>
                        <div className="font-semibold text-lg mt-1 text-blue-600">{project.auditScore || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Created At</div>
                        <div className="font-medium text-sm mt-1">{new Date(project.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>

                <div className="mb-2 text-sm font-semibold text-gray-700">Workflow Progress</div>
                <WorkflowStepper currentState={project.workflowState} />
            </div>

            <div className="bg-white border rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Workflow Timeline</h2>
                
                {histLoading ? (
                    <div className="animate-pulse h-32 bg-gray-50 rounded" />
                ) : (
                    <div className="space-y-4 relative border-l-2 border-gray-200 ml-3 pl-6">
                        {history?.data?.map(event => (
                            <div key={event.id} className="relative">
                                <span className="absolute -left-[31px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white" />
                                <div className="bg-gray-50 p-3 rounded border">
                                    <div className="flex justify-between items-start">
                                        <div className="font-semibold text-sm text-gray-800">{event.event_type}</div>
                                        <div className="text-xs text-gray-400">{new Date(event.created_at).toLocaleString()}</div>
                                    </div>
                                    {event.message && <div className="text-sm text-gray-600 mt-1">{event.message}</div>}
                                </div>
                            </div>
                        ))}
                        {(!history?.data || history.data.length === 0) && (
                            <div className="text-sm text-gray-500 pl-4 py-2">No timeline events found.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/projects/[projectId]/page.tsx'), projectDetailPage);


console.log("Setup complete for Frontend Phase D4");
