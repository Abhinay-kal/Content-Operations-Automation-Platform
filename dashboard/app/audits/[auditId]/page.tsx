"use client";
import { useAudit } from '@/hooks/useAudits';
import { use } from 'react';
import { AuditHeader } from '@/components/audits/AuditHeader';
import { ScoreCards } from '@/components/audits/ScoreCards';
import { IssueGroups } from '@/components/audits/IssueGroups';
import { AuditMetadata } from '@/components/audits/AuditMetadata';
import { AuditTimeline } from '@/components/audits/AuditTimeline';

export default function AuditDetail({ params }: { params: Promise<{auditId: string}> }) {
    const { auditId } = use(params);
    const { data: audit, isLoading, isError } = useAudit(auditId);

    if (isLoading) return <div className="p-8 max-w-5xl mx-auto animate-pulse">Loading audit data...</div>;
    if (isError || !audit) return <div className="p-8 text-red-500 max-w-5xl mx-auto">Audit not found or error loading.</div>;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <AuditHeader audit={audit} />
            <ScoreCards audit={audit} />
            
            <AuditTimeline projectId={audit.projectId} currentAuditId={audit.id} />
            
            <IssueGroups audit={audit} />
            <AuditMetadata audit={audit} />
        </div>
    );
}
