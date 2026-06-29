"use client";
import { useSitePlugin } from '@/hooks/useSiteDetails';
import { use } from 'react';

export default function PluginHealth({ params }: { params: Promise<{siteId: string}> }) {
    const { siteId } = use(params);
    const { data: plugin, isLoading } = useSitePlugin(siteId);

    if (isLoading) return <div className="animate-pulse">Loading plugin status...</div>;
    if (!plugin) return <div>Plugin not connected.</div>;

    return (
        <div className="bg-white border rounded-lg shadow-sm p-6 max-w-2xl">
            <h2 className="text-lg font-semibold mb-6">Plugin Diagnostics</h2>
            
            <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div>
                    <dt className="text-sm text-gray-500">Presence State</dt>
                    <dd className="mt-1 font-semibold">{plugin.presence}</dd>
                </div>
                <div>
                    <dt className="text-sm text-gray-500">Registration Status</dt>
                    <dd className="mt-1 font-semibold">{plugin.registrationStatus}</dd>
                </div>
                <div>
                    <dt className="text-sm text-gray-500">Plugin Version</dt>
                    <dd className="mt-1 font-medium">{plugin.version}</dd>
                </div>
                <div>
                    <dt className="text-sm text-gray-500">Protocol Version</dt>
                    <dd className="mt-1 font-medium">{plugin.protocol}</dd>
                </div>
                <div>
                    <dt className="text-sm text-gray-500">Last Heartbeat</dt>
                    <dd className="mt-1 font-medium">{plugin.lastHeartbeat ? new Date(plugin.lastHeartbeat).toLocaleString() : 'Never'}</dd>
                </div>
                <div>
                    <dt className="text-sm text-gray-500">Consecutive Failures</dt>
                    <dd className="mt-1 font-medium">{plugin.consecutiveFailures}</dd>
                </div>
            </dl>
        </div>
    );
}
