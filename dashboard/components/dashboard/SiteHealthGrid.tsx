import React from 'react';
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
