import React from 'react';
import Link from 'next/link';

export function ReviewHeader({ review }: { review: any }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href={`/projects/${review.projectId}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
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
                        <Link href={`/rewrites/${review.rewriteId}`} className="hover:underline">Rewrite #{review.rewriteId}</Link>
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
