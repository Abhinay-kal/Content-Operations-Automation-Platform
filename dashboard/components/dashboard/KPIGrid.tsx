import React from 'react';
import { KPICard } from './KPICard';
import { useOverview } from '@/hooks/useOverview';
import { Globe, Folder, AlertCircle, Search, RefreshCw, Activity, XOctagon, Server } from 'lucide-react';

export function KPIGrid() {
    const { data, isLoading, isError } = useOverview();

    if (isError) {
        return <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">Failed to load overview data</div>;
    }

    const metrics = [
        { title: 'Total Sites', value: data?.total_sites ?? 0, icon: Globe },
        { title: 'Total Projects', value: data?.total_projects ?? 0, icon: Folder },
        { title: 'Reviews Pending', value: data?.projects_review_pending ?? 0, icon: AlertCircle },
        { title: 'Pending Audits', value: data?.pending_audits ?? 0, icon: Search },
        { title: 'Pending Rewrites', value: data?.pending_rewrites ?? 0, icon: RefreshCw },
        { title: 'Processing Jobs', value: data?.jobs_processing ?? 0, icon: Activity },
        { title: 'Failed Jobs', value: data?.jobs_failed ?? 0, icon: XOctagon },
        { title: 'Pending Ops', value: data?.operations_pending ?? 0, icon: Server },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metrics.map(m => (
                <KPICard key={m.title} title={m.title} value={m.value} icon={m.icon} isLoading={isLoading} />
            ))}
        </div>
    );
}
