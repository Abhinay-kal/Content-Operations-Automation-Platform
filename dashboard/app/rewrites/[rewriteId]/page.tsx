"use client";
import { useRewrite } from '@/hooks/useRewrites';
import { use } from 'react';
import { RewriteHeader } from '@/components/rewrites/RewriteHeader';
import { RewriteMetrics } from '@/components/rewrites/RewriteMetrics';
import { RewriteSummary } from '@/components/rewrites/RewriteSummary';
import { DiffViewer } from '@/components/rewrites/DiffViewer';
import { RewriteTimeline } from '@/components/rewrites/RewriteTimeline';
import { VersionBrowser } from '@/components/rewrites/VersionBrowser';

export default function RewriteDetail({ params }: { params: Promise<{rewriteId: string}> }) {
    const { rewriteId } = use(params);
    const { data: rewrite, isLoading, isError } = useRewrite(rewriteId);

    if (isLoading) return <div className="p-8 max-w-5xl mx-auto animate-pulse">Loading rewrite data...</div>;
    if (isError || !rewrite) return <div className="p-8 text-red-500 max-w-5xl mx-auto">Rewrite not found or error loading.</div>;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <RewriteHeader rewrite={rewrite} />
            <RewriteMetrics rewrite={rewrite} />
            
            <RewriteTimeline projectId={rewrite.projectId} currentRewriteId={rewrite.id} />
            
            <RewriteSummary rewrite={rewrite} />
            <DiffViewer rewrite={rewrite} />

            <VersionBrowser projectId={rewrite.projectId} />
        </div>
    );
}
