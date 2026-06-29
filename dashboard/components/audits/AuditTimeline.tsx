import React from 'react';
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
                            href={`/audits/${a.id}`}
                            className={`flex-shrink-0 p-3 border rounded-lg min-w-32 ${isActive ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50'}`}
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
