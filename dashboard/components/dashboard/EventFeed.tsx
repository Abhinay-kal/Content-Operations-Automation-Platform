import React from 'react';
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
