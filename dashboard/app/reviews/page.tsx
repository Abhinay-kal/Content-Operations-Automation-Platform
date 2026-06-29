"use client";
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
                                        <Link href={`/reviews/${r.id}`} className="text-blue-600 font-medium hover:underline">Review &rarr;</Link>
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
