import React from 'react';
import { RewriteDto } from '@/lib/api/types';
import Link from 'next/link';
import { Clock } from 'lucide-react';

export function RewriteHeader({ rewrite }: { rewrite: RewriteDto }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href={`/projects/${rewrite.projectId}`} className="text-sm text-blue-600 hover:underline">
                            &larr; Project #{rewrite.projectId}
                        </Link>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">Site #{rewrite.siteId}</span>
                        {rewrite.sourceAuditId && (
                            <>
                                <span className="text-gray-300">|</span>
                                <Link href={`/audits/${rewrite.sourceAuditId}`} className="text-sm text-blue-600 hover:underline">
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
                <span className={`px-2 py-1 rounded text-xs font-bold ${rewrite.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
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
