"use client";
import { useOverview } from "@/hooks/useOverview";

export default function Dashboard() {
    const { data, isLoading, isError, error } = useOverview();

    if (isLoading) return <div className="p-4 rounded border bg-white animate-pulse h-32">Loading overview...</div>;
    if (isError) return <div className="p-4 rounded border border-red-500 bg-red-50 text-red-700">Error loading data: {(error as any)?.message}</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Dashboard Shell Online</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <div className="text-sm text-gray-500">Total Projects</div>
                    <div className="text-3xl font-semibold mt-2">{data?.total_projects || 0}</div>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <div className="text-sm text-gray-500">Active Sites</div>
                    <div className="text-3xl font-semibold mt-2">{data?.total_sites || 0}</div>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <div className="text-sm text-gray-500">Pending Audits</div>
                    <div className="text-3xl font-semibold mt-2">{data?.pending_audits || 0}</div>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <div className="text-sm text-gray-500">Jobs Processing</div>
                    <div className="text-3xl font-semibold mt-2">{data?.jobs_processing || 0}</div>
                </div>
            </div>
        </div>
    );
}
