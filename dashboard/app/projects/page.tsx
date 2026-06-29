"use client";
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
                                        <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">Open</Link>
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
