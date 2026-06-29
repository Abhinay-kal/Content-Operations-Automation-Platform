import React from 'react';
import { useProjectVersions } from '@/hooks/useRewrites';

export function VersionBrowser({ projectId }: { projectId: number }) {
    const { data: versions, isLoading } = useProjectVersions(projectId.toString());

    if (isLoading) return <div className="p-4 animate-pulse bg-gray-50 rounded h-24 mb-6" />;
    if (!versions || versions.length === 0) return null;

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Version Browser</h2>
            <div className="flex space-x-2">
                {versions.map(v => (
                    <div key={v.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="text-sm font-bold">V{v.version_number}</div>
                        <div className="text-xs text-gray-500">{v.version_type}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
