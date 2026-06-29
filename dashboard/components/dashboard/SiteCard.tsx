import React from 'react';
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
                    <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(site.presence)}`} title={site.presence} />
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
