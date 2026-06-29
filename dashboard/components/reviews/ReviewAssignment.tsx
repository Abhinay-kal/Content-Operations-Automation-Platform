import React, { useState } from 'react';
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
