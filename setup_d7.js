const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';
const frontendDir = path.join(backendDir, 'dashboard');

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(frontendDir, 'app/reviews/[reviewId]'));
mkdirp(path.join(frontendDir, 'components/reviews'));

// 1. Backend Schema Update
const schemaPath = path.join(backendDir, 'schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
if (!schemaContent.includes('content_reviews')) {
    schemaContent += `
CREATE TABLE content_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    rewrite_id INTEGER NOT NULL,
    status TEXT DEFAULT 'REVIEW_PENDING', -- REVIEW_PENDING, IN_REVIEW, APPROVED, REJECTED, NEEDS_REVISION, PUBLISHED
    reviewer_id TEXT,
    assigned_at DATETIME,
    assigned_by TEXT,
    audit_score_change INTEGER DEFAULT 0,
    intent_improvement INTEGER DEFAULT 0,
    eeat_improvement INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
    fs.writeFileSync(schemaPath, schemaContent);
}

// 2. Backend Read Service
const readServicePath = path.join(backendDir, 'src/services/DashboardReadService.js');
let readServiceCode = fs.readFileSync(readServicePath, 'utf8');

if (!readServiceCode.includes('getReviewById')) {
    const newMethods = `
    getReviews(pagination, filters = {}) {
        let query = 'SELECT r.*, p.title as project_title, s.change_severity as rewrite_severity, a.seo_score as audit_score FROM content_reviews r LEFT JOIN content_projects p ON r.project_id = p.id LEFT JOIN seo_rewrites s ON r.rewrite_id = s.id LEFT JOIN seo_audits a ON s.source_audit_id = a.id WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as c FROM content_reviews r LEFT JOIN content_projects p ON r.project_id = p.id LEFT JOIN seo_rewrites s ON r.rewrite_id = s.id WHERE 1=1';
        const params = [];
        
        if (filters.siteId) {
            query += ' AND r.site_id = ?';
            countQuery += ' AND r.site_id = ?';
            params.push(filters.siteId);
        }
        if (filters.status) {
            query += ' AND r.status = ?';
            countQuery += ' AND r.status = ?';
            params.push(filters.status);
        }
        if (filters.changeSeverity) {
            query += ' AND s.change_severity = ?';
            countQuery += ' AND s.change_severity = ?';
            params.push(filters.changeSeverity);
        }
        if (filters.assignment === 'MINE') {
            query += ' AND r.reviewer_id = ?';
            countQuery += ' AND r.reviewer_id = ?';
            params.push(filters.userId || 'current_user'); // mockup current user
        } else if (filters.assignment === 'UNASSIGNED') {
            query += ' AND r.reviewer_id IS NULL';
            countQuery += ' AND r.reviewer_id IS NULL';
        }

        query += \` ORDER BY r.\${pagination.sort} \${pagination.direction} LIMIT ? OFFSET ?\`;
        
        const rows = this.db.prepare(query).all(...params, pagination.limit, pagination.offset);
        const total = this.db.prepare(countQuery).get(...params).c;
        
        return { data: rows.map(r => this.mapReviewListDto(r)), total };
    }

    getReviewById(id) {
        try {
            const r = this.db.prepare('SELECT r.*, p.title as project_title FROM content_reviews r LEFT JOIN content_projects p ON r.project_id = p.id WHERE r.id = ?').get(id);
            if (!r) return null;
            return this.mapReviewDetailDto(r);
        } catch(e) {
            return null;
        }
    }

    updateReviewStatus(id, status) {
        this.db.prepare('UPDATE content_reviews SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    }

    assignReviewer(id, reviewerId) {
        this.db.prepare('UPDATE content_reviews SET reviewer_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?').run(reviewerId, id);
    }

    mapReviewListDto(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            siteId: row.site_id,
            rewriteId: row.rewrite_id,
            status: row.status,
            projectTitle: row.project_title || 'Unknown Project',
            auditScore: row.audit_score || null,
            rewriteSeverity: row.rewrite_severity || 'MODERATE_CHANGE',
            reviewerId: row.reviewer_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    mapReviewDetailDto(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            siteId: row.site_id,
            rewriteId: row.rewrite_id,
            status: row.status,
            projectTitle: row.project_title || 'Unknown Project',
            reviewerId: row.reviewer_id,
            assignedAt: row.assigned_at,
            assignedBy: row.assigned_by,
            auditScoreChange: row.audit_score_change,
            intentImprovement: row.intent_improvement,
            eeatImprovement: row.eeat_improvement,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
`;
    readServiceCode = readServiceCode.replace(
        "getVersionById(id) {",
        newMethods + "\n    getVersionById(id) {"
    );
    fs.writeFileSync(readServicePath, readServiceCode);
}

// 3. Backend Routes
const routesPath = path.join(backendDir, 'src/api/dashboardRoutes.js');
let routesCode = fs.readFileSync(routesPath, 'utf8');

if (!routesCode.includes('/dashboard/reviews/:id')) {
    // Note: We already have a /dashboard/reviews route that was mocked for the overview widget in D2.
    // Let's replace the old simple one with the new filtering one.
    const oldReviewsRoute = `router.get('/dashboard/reviews', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getReviews(p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });`;

    const newRoutes = `
    router.get('/dashboard/reviews', (req, res) => {
        try {
            const p = parsePagination(req);
            const filters = { 
                siteId: req.query.siteId, 
                status: req.query.status, 
                changeSeverity: req.query.changeSeverity,
                assignment: req.query.assignment,
                userId: req.query.userId
            };
            const { data, total } = dashboardReadService.getReviews(p, filters);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            // fallback for missing schema in fresh run
            return sendSuccess(res, [], { ...p, total: 0, pages: 0 });
        }
    });

    router.get('/dashboard/reviews/:id', (req, res) => {
        try {
            const data = dashboardReadService.getReviewById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Review not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/approve', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'APPROVED');
            return sendSuccess(res, { status: 'APPROVED' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/reject', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'REJECTED');
            return sendSuccess(res, { status: 'REJECTED' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/request-changes', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'NEEDS_REVISION');
            return sendSuccess(res, { status: 'NEEDS_REVISION' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/publish', (req, res) => {
        try {
            dashboardReadService.updateReviewStatus(req.params.id, 'PUBLISHED');
            // publish workflow hook would go here
            return sendSuccess(res, { status: 'PUBLISHED' });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.post('/dashboard/reviews/:id/assign', express.json(), (req, res) => {
        try {
            dashboardReadService.assignReviewer(req.params.id, req.body.reviewerId);
            return sendSuccess(res, dashboardReadService.getReviewById(req.params.id));
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });
`;
    if (routesCode.includes("router.get('/dashboard/reviews'")) {
        // Regex replace is safer if exact match fails
        routesCode = routesCode.replace(/router\.get\('\/dashboard\/reviews', \(req, res\) => \{[\s\S]*?\}\);/g, "");
    }
    routesCode = routesCode.replace(
        "router.get('/dashboard/versions/:id'",
        newRoutes + "\n    router.get('/dashboard/versions/:id'"
    );
    fs.writeFileSync(routesPath, routesCode);
}


// 4. Frontend Types & Hooks Update
const apiTypesPath = path.join(frontendDir, 'lib/api/types.ts');
let apiTypesCode = fs.readFileSync(apiTypesPath, 'utf8');

if (!apiTypesCode.includes('ReviewListDto')) {
    apiTypesCode += `
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
`;
    fs.writeFileSync(apiTypesPath, apiTypesCode);
}

// Modify useReviews for filtering and add detailed ones
let useReviewsCode = fs.readFileSync(path.join(frontendDir, 'hooks/useReviews.ts'), 'utf8');
if (!useReviewsCode.includes('useReviewDetails')) {
    const newHooks = `
export interface ReviewFilters {
    siteId?: string;
    status?: string;
    changeSeverity?: string;
    assignment?: string;
}

export function useReviewQueue(page: number = 1, filters: ReviewFilters = {}) {
    return useQuery({
        queryKey: ['review_queue', page, filters],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString() });
            if (filters.siteId) params.append('siteId', filters.siteId);
            if (filters.status) params.append('status', filters.status);
            if (filters.changeSeverity) params.append('changeSeverity', filters.changeSeverity);
            if (filters.assignment) params.append('assignment', filters.assignment);
            
            const res = await apiClient<any[]>(\`/dashboard/reviews?\${params.toString()}\`);
            return res;
        },
        refetchInterval: 30000,
    });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useReviewDetails(reviewId: string) {
    return useQuery({
        queryKey: ['review', reviewId],
        queryFn: async () => {
            const res = await apiClient<any>(\`/dashboard/reviews/\${reviewId}\`);
            return res.data;
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'IN_REVIEW' ? 15000 : false;
        },
    });
}

export function useReviewAction(reviewId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (action: 'approve' | 'reject' | 'request-changes' | 'publish') => {
            return apiClient(\`/dashboard/reviews/\${reviewId}/\${action}\`, { method: 'POST' });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['review', reviewId] });
            qc.invalidateQueries({ queryKey: ['review_queue'] });
        }
    });
}

export function useReviewAssign(reviewId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (reviewerId: string) => {
            return apiClient(\`/dashboard/reviews/\${reviewId}/assign\`, { 
                method: 'POST',
                body: JSON.stringify({ reviewerId })
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['review', reviewId] });
            qc.invalidateQueries({ queryKey: ['review_queue'] });
        }
    });
}
`;
    useReviewsCode += newHooks;
    fs.writeFileSync(path.join(frontendDir, 'hooks/useReviews.ts'), useReviewsCode);
}


// 5. Components
const reviewSla = `import React from 'react';

export function ReviewSLA({ createdAt }: { createdAt: string }) {
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffHours = (now - created) / (1000 * 60 * 60);

    let color = 'bg-green-100 text-green-800';
    let label = '< 24h';
    if (diffHours >= 24 && diffHours <= 72) {
        color = 'bg-yellow-100 text-yellow-800';
        label = '24-72h';
    } else if (diffHours > 72) {
        color = 'bg-red-100 text-red-800';
        label = '> 72h';
    }

    return (
        <span className={\`px-2 py-1 rounded text-xs font-bold \${color}\`}>
            Wait: {label}
        </span>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/reviews/ReviewSLA.tsx'), reviewSla);


const reviewHeader = `import React from 'react';
import Link from 'next/link';

export function ReviewHeader({ review }: { review: any }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href={\`/projects/\${review.projectId}\`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            &larr; Project #{review.projectId}
                        </Link>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">Site #{review.siteId}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{review.projectTitle}</h1>
                </div>
                <div className="text-right text-sm">
                    <div className="text-gray-500 font-semibold mb-1">Status: <span className="text-gray-800">{review.status}</span></div>
                    <div className="text-gray-400">{new Date(review.createdAt).toLocaleString()}</div>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                    <div className="text-xs text-gray-500 uppercase">Assigned To</div>
                    <div className="font-semibold text-gray-800">{review.reviewerId || 'Unassigned'}</div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 uppercase">Rewrite Version</div>
                    <div className="font-semibold text-blue-600">
                        <Link href={\`/rewrites/\${review.rewriteId}\`} className="hover:underline">Rewrite #{review.rewriteId}</Link>
                    </div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 uppercase">Audit Score Change</div>
                    <div className="font-semibold text-green-600">+{review.auditScoreChange}</div>
                </div>
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/reviews/ReviewHeader.tsx'), reviewHeader);

const reviewActions = `import React from 'react';
import { useReviewAction } from '@/hooks/useReviews';

export function ReviewActions({ review }: { review: any }) {
    const { mutate: doAction, isPending } = useReviewAction(review.id.toString());

    return (
        <div className="bg-white border rounded-lg p-6 mb-6 flex gap-4">
            <button 
                onClick={() => doAction('approve')} 
                disabled={isPending || review.status === 'APPROVED'}
                className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
            >
                Approve (Ready for Editor)
            </button>
            <button 
                onClick={() => doAction('request-changes')} 
                disabled={isPending || review.status === 'NEEDS_REVISION'}
                className="bg-yellow-500 text-white px-4 py-2 rounded font-medium hover:bg-yellow-600 disabled:opacity-50"
            >
                Request AI Changes
            </button>
            <button 
                onClick={() => doAction('reject')} 
                disabled={isPending || review.status === 'REJECTED'}
                className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50"
            >
                Reject & Archive
            </button>
            <div className="flex-1"></div>
            <button 
                onClick={() => doAction('publish')} 
                disabled={isPending || review.status === 'PUBLISHED'}
                className="bg-gray-800 text-white px-4 py-2 rounded font-medium hover:bg-gray-900 disabled:opacity-50"
            >
                Force Publish to WP
            </button>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/reviews/ReviewActions.tsx'), reviewActions);

const reviewAssignment = `import React, { useState } from 'react';
import { useReviewAssign } from '@/hooks/useReviews';

export function ReviewAssignment({ review }: { review: any }) {
    const [userId, setUserId] = useState('');
    const { mutate, isPending } = useReviewAssign(review.id.toString());

    const handleAssign = () => {
        if (userId.trim()) mutate(userId);
    };

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Assignment System</h2>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Enter reviewer user ID..."
                    className="border rounded p-2 text-sm flex-1"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                />
                <button 
                    onClick={handleAssign}
                    disabled={isPending || !userId.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                    {isPending ? 'Assigning...' : 'Assign'}
                </button>
                {review.reviewerId && (
                    <button 
                        onClick={() => mutate('')}
                        disabled={isPending}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 disabled:opacity-50"
                    >
                        Unassign
                    </button>
                )}
            </div>
            {review.assignedBy && (
                <div className="text-xs text-gray-500 mt-2">
                    Assigned by {review.assignedBy} at {new Date(review.assignedAt).toLocaleString()}
                </div>
            )}
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/reviews/ReviewAssignment.tsx'), reviewAssignment);


// 6. Review Pages
const reviewQueuePage = `"use client";
import { useState } from 'react';
import { useReviewQueue } from '@/hooks/useReviews';
import Link from 'next/link';
import { RewriteHealthBadge } from '@/components/rewrites/RewriteHealthBadge';
import { ReviewSLA } from '@/components/reviews/ReviewSLA';

export default function ReviewQueue() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        assignment: '',
        changeSeverity: '',
        siteId: ''
    });

    const { data, isLoading, isError } = useReviewQueue(page, filters);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1);
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Editorial Queue</h1>
            </div>

            <div className="bg-white p-4 border rounded-lg shadow-sm flex gap-4 mb-6">
                <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded p-2 text-sm flex-1">
                    <option value="">All Statuses</option>
                    <option value="REVIEW_PENDING">REVIEW_PENDING</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="NEEDS_REVISION">NEEDS_REVISION</option>
                </select>
                <select name="assignment" value={filters.assignment} onChange={handleFilterChange} className="border rounded p-2 text-sm flex-1">
                    <option value="">All Assignments</option>
                    <option value="MINE">Assigned to Me</option>
                    <option value="UNASSIGNED">Unassigned</option>
                </select>
                <select name="changeSeverity" value={filters.changeSeverity} onChange={handleFilterChange} className="border rounded p-2 text-sm flex-1">
                    <option value="">All Severities</option>
                    <option value="MINIMAL_CHANGE">MINIMAL_CHANGE</option>
                    <option value="MODERATE_CHANGE">MODERATE_CHANGE</option>
                    <option value="MAJOR_REWRITE">MAJOR_REWRITE</option>
                    <option value="COMPLETE_REWRITE">COMPLETE_REWRITE</option>
                </select>
            </div>

            {isLoading ? (
                <div className="p-4 animate-pulse bg-white border rounded h-64">Loading queue...</div>
            ) : isError ? (
                <div className="p-4 text-red-500 bg-white border rounded">Error loading review queue.</div>
            ) : (
                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Project / Site</th>
                                <th className="p-4 font-semibold text-gray-600">SLA Wait</th>
                                <th className="p-4 font-semibold text-gray-600">Review State</th>
                                <th className="p-4 font-semibold text-gray-600">Severity</th>
                                <th className="p-4 font-semibold text-gray-600">Assigned</th>
                                <th className="p-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data?.data?.map((r: any) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900 truncate max-w-xs">{r.projectTitle}</div>
                                        <div className="text-xs text-gray-500 mt-1">Site #{r.siteId}</div>
                                    </td>
                                    <td className="p-4"><ReviewSLA createdAt={r.createdAt} /></td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-800">{r.status}</span>
                                    </td>
                                    <td className="p-4"><RewriteHealthBadge severity={r.rewriteSeverity} /></td>
                                    <td className="p-4 text-gray-600 font-medium">{r.reviewerId || 'Unassigned'}</td>
                                    <td className="p-4">
                                        <Link href={\`/reviews/\${r.id}\`} className="text-blue-600 font-medium hover:underline">Review &rarr;</Link>
                                    </td>
                                </tr>
                            ))}
                            {(!data?.data || data.data.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Queue is empty.</td>
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
fs.writeFileSync(path.join(frontendDir, 'app/reviews/page.tsx'), reviewQueuePage);

const reviewDetailPage = `"use client";
import { useReviewDetails } from '@/hooks/useReviews';
import { useRewrite } from '@/hooks/useRewrites';
import { use } from 'react';
import { ReviewHeader } from '@/components/reviews/ReviewHeader';
import { ReviewActions } from '@/components/reviews/ReviewActions';
import { ReviewAssignment } from '@/components/reviews/ReviewAssignment';
import { RewriteSummary } from '@/components/rewrites/RewriteSummary';
import { RewriteMetrics } from '@/components/rewrites/RewriteMetrics';
import { DiffViewer } from '@/components/rewrites/DiffViewer';
import Link from 'next/link';

export default function ReviewDetail({ params }: { params: Promise<{reviewId: string}> }) {
    const { reviewId } = use(params);
    const { data: review, isLoading: reviewLoading } = useReviewDetails(reviewId);
    
    // We fetch rewrite details safely once we have the review
    const { data: rewrite, isLoading: rewriteLoading } = useRewrite(review?.rewriteId?.toString() || '');

    if (reviewLoading) return <div className="p-8 max-w-5xl mx-auto animate-pulse">Loading review...</div>;
    if (!review) return <div className="p-8 text-red-500 max-w-5xl mx-auto">Review not found.</div>;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <div className="mb-4">
                <Link href="/reviews" className="text-blue-600 text-sm hover:underline">&larr; Back to Queue</Link>
            </div>
            
            <ReviewHeader review={review} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <ReviewActions review={review} />
                </div>
                <div>
                    <ReviewAssignment review={review} />
                </div>
            </div>

            {rewriteLoading ? (
                <div className="p-4 bg-gray-50 rounded animate-pulse h-32">Loading diff data...</div>
            ) : rewrite ? (
                <>
                    <h2 className="text-xl font-bold mb-4 mt-8">AI Generated Content Changes</h2>
                    <RewriteMetrics rewrite={rewrite} />
                    <RewriteSummary rewrite={rewrite} />
                    <DiffViewer rewrite={rewrite} />
                </>
            ) : (
                <div className="text-gray-500 italic mt-8">No rewrite data available.</div>
            )}
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/reviews/[reviewId]/page.tsx'), reviewDetailPage);

console.log("Setup complete for Frontend Phase D7");
