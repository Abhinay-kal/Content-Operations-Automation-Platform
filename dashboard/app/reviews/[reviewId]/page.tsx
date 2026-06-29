"use client";
import { useReviewDetails } from '@/hooks/useReviews';
import { useRewrite } from '@/hooks/useRewrites';
import { use } from 'react';
import { ReviewHeader } from '@/components/reviews/ReviewHeader';
import { ReviewActions } from '@/components/reviews/ReviewActions';
import { ReviewAssignment } from '@/components/reviews/ReviewAssignment';
import { RewriteSummary } from '@/components/rewrites/RewriteSummary';
import { RewriteMetrics } from '@/components/rewrites/RewriteMetrics';
import { DiffViewer } from '@/components/rewrites/DiffViewer';
import Link from 'next/link';

export default function ReviewDetail({ params }: { params: Promise<{reviewId: string}> }) {
    const { reviewId } = use(params);
    const { data: review, isLoading: reviewLoading } = useReviewDetails(reviewId);
    
    // We fetch rewrite details safely once we have the review
    const { data: rewrite, isLoading: rewriteLoading } = useRewrite(review?.rewriteId?.toString() || '');

    if (reviewLoading) return <div className="p-8 max-w-5xl mx-auto animate-pulse">Loading review...</div>;
    if (!review) return <div className="p-8 text-red-500 max-w-5xl mx-auto">Review not found.</div>;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <div className="mb-4">
                <Link href="/reviews" className="text-blue-600 text-sm hover:underline">&larr; Back to Queue</Link>
            </div>
            
            <ReviewHeader review={review} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <ReviewActions review={review} />
                </div>
                <div>
                    <ReviewAssignment review={review} />
                </div>
            </div>

            {rewriteLoading ? (
                <div className="p-4 bg-gray-50 rounded animate-pulse h-32">Loading diff data...</div>
            ) : rewrite ? (
                <>
                    <h2 className="text-xl font-bold mb-4 mt-8">AI Generated Content Changes</h2>
                    <RewriteMetrics rewrite={rewrite} />
                    <RewriteSummary rewrite={rewrite} />
                    <DiffViewer rewrite={rewrite} />
                </>
            ) : (
                <div className="text-gray-500 italic mt-8">No rewrite data available.</div>
            )}
        </div>
    );
}
