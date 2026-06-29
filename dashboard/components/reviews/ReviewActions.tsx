import React from 'react';
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
