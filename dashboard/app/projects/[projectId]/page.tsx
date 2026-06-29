"use client";
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
                        <div className="font-semibold text-lg mt-1 text-blue-600">
                            {project.latestAuditId ? <Link href={`/audits/${project.latestAuditId}`} className="hover:underline">{project.auditScore || 'View Audit'}</Link> : (project.auditScore || 'N/A')}
                        </div>
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
