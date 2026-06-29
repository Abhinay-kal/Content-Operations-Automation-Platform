const fs = require('fs');
const path = require('path');

const frontendDir = '/Users/abhinaykalkhanday/Desktop/n8n/dashboard';

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(frontendDir, 'components/dashboard'));

// 1. Missing Hooks
const useEventsHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export interface EventDto {
    id: number;
    project_id: number;
    event_type: string;
    message: string;
    created_at: string;
}

export function useEvents(page: number = 1) {
    return useQuery({
        queryKey: ['events', page],
        queryFn: async () => {
            const res = await apiClient<EventDto[]>(\`/dashboard/events?page=\${page}\`);
            return res;
        },
        refetchInterval: 30000,
    });
}
`;
fs.writeFileSync(path.join(frontendDir, 'hooks/useEvents.ts'), useEventsHook);

const useReviewsHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export interface ReviewDto {
    id: number;
    project_id: number;
    status: string;
    title: string;
    created_at: string;
}

export function useReviews(page: number = 1) {
    return useQuery({
        queryKey: ['reviews', page],
        queryFn: async () => {
            const res = await apiClient<ReviewDto[]>(\`/dashboard/reviews?page=\${page}\`);
            return res;
        },
        refetchInterval: 30000,
    });
}
`;
fs.writeFileSync(path.join(frontendDir, 'hooks/useReviews.ts'), useReviewsHook);

// Update useSites for 60s polling
const useSitesHookPath = path.join(frontendDir, 'hooks/useSites.ts');
let useSitesCode = fs.readFileSync(useSitesHookPath, 'utf8');
if (!useSitesCode.includes('refetchInterval')) {
    useSitesCode = useSitesCode.replace(
        "return res;\n        }",
        "return res;\n        },\n        refetchInterval: 60000,"
    );
    fs.writeFileSync(useSitesHookPath, useSitesCode);
}

// 2. KPICard
const kpiCard = `import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    isLoading: boolean;
}

export function KPICard({ title, value, icon: Icon, isLoading }: KPICardProps) {
    if (isLoading) {
        return <div className="bg-white p-6 rounded-lg border shadow-sm animate-pulse h-28" />;
    }

    return (
        <div className="bg-white p-6 rounded-lg border shadow-sm flex items-center justify-between">
            <div>
                <div className="text-sm text-gray-500 font-medium">{title}</div>
                <div className="text-3xl font-bold mt-2 text-gray-900">{value}</div>
            </div>
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <Icon size={24} />
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/dashboard/KPICard.tsx'), kpiCard);

// 3. KPIGrid
const kpiGrid = `import React from 'react';
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
`;
fs.writeFileSync(path.join(frontendDir, 'components/dashboard/KPIGrid.tsx'), kpiGrid);

// 4. SiteCard
const siteCard = `import React from 'react';
import { SiteDto } from '@/lib/api/types';
import { Globe, Search, RefreshCw, AlertCircle } from 'lucide-react';

export function SiteCard({ site }: { site: SiteDto }) {
    const getStatusColor = (presence: string) => {
        switch (presence) {
            case 'ONLINE': return 'bg-green-500';
            case 'DEGRADED': return 'bg-yellow-500';
            case 'OFFLINE': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="bg-white p-5 rounded-lg border shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-gray-900 truncate" title={site.name}>{site.name}</h3>
                    <div className="text-xs text-gray-500 truncate" title={site.domain}>{site.domain}</div>
                </div>
                <div className="flex flex-col items-end">
                    <span className={\`inline-block w-3 h-3 rounded-full \${getStatusColor(site.presence)}\`} title={site.presence} />
                    <span className="text-[10px] text-gray-400 mt-1 uppercase">{site.presence || 'UNKNOWN'}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><Search size={12}/> Audits</div>
                    <div className="font-medium text-sm mt-1">{site.pendingAudits} pending</div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={12}/> Rewrites</div>
                    <div className="font-medium text-sm mt-1">{site.pendingRewrites} pending</div>
                </div>
                <div className="col-span-2">
                    <div className="text-xs text-gray-500 flex items-center gap-1"><AlertCircle size={12}/> Reviews</div>
                    <div className="font-medium text-sm mt-1">{site.pendingReviews} pending</div>
                </div>
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/dashboard/SiteCard.tsx'), siteCard);

// 5. SiteHealthGrid
const siteHealthGrid = `import React from 'react';
import { useSites } from '@/hooks/useSites';
import { SiteCard } from './SiteCard';

export function SiteHealthGrid() {
    const { data, isLoading, isError } = useSites(1);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {[1,2,3,4].map(i => <div key={i} className="bg-white p-5 rounded-lg border shadow-sm animate-pulse h-40" />)}
            </div>
        );
    }

    if (isError) {
        return <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md mb-8">Failed to load sites</div>;
    }

    if (!data?.data || data.data.length === 0) {
        return <div className="p-8 text-center text-gray-500 bg-white rounded-lg border mb-8">No sites connected yet.</div>;
    }

    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Site Health Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.data.map(site => (
                    <SiteCard key={site.id} site={site} />
                ))}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/dashboard/SiteHealthGrid.tsx'), siteHealthGrid);

// 6. QueueWidget
const queueWidget = `import React from 'react';
import { useJobs } from '@/hooks/useJobs';
import { Activity, Clock, CheckCircle, XCircle } from 'lucide-react';

export function QueueWidget() {
    const { data, isLoading, isError } = useJobs(1);

    if (isLoading) {
        return <div className="bg-white rounded-lg border shadow-sm p-4 animate-pulse h-64" />;
    }

    if (isError) {
        return <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md h-full">Failed to load jobs</div>;
    }

    const jobs = data?.data || [];
    
    // Grouping by status conceptually
    const counts = {
        PROCESSING: jobs.filter(j => j.status === 'PROCESSING').length,
        PENDING: jobs.filter(j => j.status === 'PENDING').length,
        COMPLETED: jobs.filter(j => j.status === 'COMPLETED').length,
        FAILED: jobs.filter(j => j.status === 'FAILED').length,
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b font-semibold text-gray-800">Queue Status</div>
            <div className="p-4 flex-1">
                {jobs.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-8">No active jobs in queue.</div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                            <div className="flex items-center gap-2 text-blue-700">
                                <Activity size={18} /> <span className="font-medium text-sm">Processing</span>
                            </div>
                            <span className="font-bold text-blue-700">{counts.PROCESSING}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-2 text-gray-700">
                                <Clock size={18} /> <span className="font-medium text-sm">Pending</span>
                            </div>
                            <span className="font-bold text-gray-700">{counts.PENDING}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                            <div className="flex items-center gap-2 text-red-700">
                                <XCircle size={18} /> <span className="font-medium text-sm">Failed</span>
                            </div>
                            <span className="font-bold text-red-700">{counts.FAILED}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                            <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle size={18} /> <span className="font-medium text-sm">Completed</span>
                            </div>
                            <span className="font-bold text-green-700">{counts.COMPLETED}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/dashboard/QueueWidget.tsx'), queueWidget);

// 7. ReviewWidget
const reviewWidget = `import React from 'react';
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
`;
fs.writeFileSync(path.join(frontendDir, 'components/dashboard/ReviewWidget.tsx'), reviewWidget);

// 8. EventFeed
const eventFeed = `import React from 'react';
import { useEvents } from '@/hooks/useEvents';
import { Activity } from 'lucide-react';

export function EventFeed() {
    const { data, isLoading, isError } = useEvents(1);

    if (isLoading) {
        return <div className="bg-white rounded-lg border shadow-sm p-4 animate-pulse h-64 mt-8" />;
    }

    if (isError) {
        return <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md mt-8">Failed to load recent events</div>;
    }

    const events = data?.data || [];

    return (
        <div className="bg-white rounded-lg border shadow-sm mt-8">
            <div className="p-4 border-b font-semibold text-gray-800 flex items-center gap-2">
                <Activity size={18} className="text-blue-500" />
                Recent System Events
            </div>
            <div className="p-0">
                {events.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-8">No recent events.</div>
                ) : (
                    <div className="divide-y max-h-80 overflow-y-auto">
                        {events.slice(0, 25).map(e => (
                            <div key={e.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{e.event_type}</div>
                                        {e.message && <div className="text-xs text-gray-600 mt-1">{e.message}</div>}
                                    </div>
                                    <div className="text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(e.created_at).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/dashboard/EventFeed.tsx'), eventFeed);


// 9. Root Page Replacement
const pageCode = `"use client";
import React from 'react';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { SiteHealthGrid } from '@/components/dashboard/SiteHealthGrid';
import { QueueWidget } from '@/components/dashboard/QueueWidget';
import { ReviewWidget } from '@/components/dashboard/ReviewWidget';
import { EventFeed } from '@/components/dashboard/EventFeed';

export default function Dashboard() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
                <p className="text-gray-500 text-sm mt-1">Real-time operational health and pending actions.</p>
            </div>

            <KPIGrid />
            <SiteHealthGrid />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <QueueWidget />
                <ReviewWidget />
            </div>

            <EventFeed />
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/page.tsx'), pageCode);

console.log("Setup complete for Frontend Phase D2");
