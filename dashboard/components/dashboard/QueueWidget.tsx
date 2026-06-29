import React from 'react';
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
