import React from 'react';
import { AuditDto } from '@/lib/api/types';
import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';

export function AuditHeader({ audit }: { audit: AuditDto }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href={`/projects/${audit.projectId}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
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
                    <span className={`px-2 py-1 rounded text-xs font-bold ${audit.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : audit.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
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
