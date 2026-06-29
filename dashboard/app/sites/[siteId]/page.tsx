"use client";
import { useSite, useSiteOperations } from '@/hooks/useSiteDetails';
import { use } from 'react';

export default function SiteOverview({ params }: { params: Promise<{siteId: string}> }) {
    const { siteId } = use(params);
    const { data: site } = useSite(siteId);
    const { data: ops } = useSiteOperations(siteId, 1);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 border rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Total Projects</div>
                    <div className="text-2xl font-bold mt-2">{site?.projectsCount || 0}</div>
                </div>
                <div className="bg-white p-6 border rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Pending Audits</div>
                    <div className="text-2xl font-bold mt-2">{site?.pendingAudits || 0}</div>
                </div>
                <div className="bg-white p-6 border rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Pending Rewrites</div>
                    <div className="text-2xl font-bold mt-2">{site?.pendingRewrites || 0}</div>
                </div>
                <div className="bg-white p-6 border rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500">Pending Reviews</div>
                    <div className="text-2xl font-bold mt-2">{site?.pendingReviews || 0}</div>
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Plugin Operations View</h2>
                <div className="space-y-3">
                    {ops?.data?.map(op => (
                        <div key={op.id} className="p-3 border rounded flex justify-between items-center">
                            <div>
                                <div className="font-medium">{op.operation_type}</div>
                                <div className="text-xs text-gray-500">{op.operation_uuid}</div>
                            </div>
                            <span className="px-2 py-1 text-xs bg-gray-100 rounded">{op.status}</span>
                        </div>
                    ))}
                    {(!ops?.data || ops.data.length === 0) && <div className="text-sm text-gray-500">No active operations.</div>}
                </div>
            </div>
        </div>
    );
}
