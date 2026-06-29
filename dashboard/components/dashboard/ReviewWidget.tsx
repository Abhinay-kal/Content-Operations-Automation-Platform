import React from 'react';
import { useReviews } from '@/hooks/useReviews';

export function ReviewWidget() {
    const { data, isLoading, isError } = useReviews(1);

    if (isLoading) {
        return <div className="bg-white rounded-lg border shadow-sm p-4 animate-pulse h-64" />;
    }

    if (isError) {
        return <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md h-full">Failed to load reviews</div>;
    }

    const reviews = data?.data || [];

    return (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b font-semibold text-gray-800 flex justify-between items-center">
                <span>Review Queue</span>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">{reviews.length} pending</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-64">
                {reviews.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-8">No drafts waiting for review.</div>
                ) : (
                    <ul className="space-y-3">
                        {reviews.map(r => (
                            <li key={r.id} className="text-sm border-b pb-2 last:border-0">
                                <div className="font-medium text-gray-900 truncate">{r.title || 'Untitled Draft'}</div>
                                <div className="text-gray-500 text-xs mt-1">Project #{r.project_id} • {r.status}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
