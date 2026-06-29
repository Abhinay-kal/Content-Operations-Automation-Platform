"use client";
import { useSites } from '@/hooks/useSites';
import Link from 'next/link';

export default function SitesList() {
    const { data, isLoading, isError } = useSites();

    if (isLoading) return <div className="p-4 animate-pulse">Loading sites...</div>;
    if (isError) return <div className="p-4 text-red-500">Error loading sites.</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Connected Sites</h1>
            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Site Name</th>
                            <th className="p-4 font-semibold text-gray-600">Domain</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Projects</th>
                            <th className="p-4 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data?.data.map(site => (
                            <tr key={site.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{site.name}</td>
                                <td className="p-4 text-gray-500">{site.domain}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{site.presence}</span>
                                </td>
                                <td className="p-4 text-gray-500">{site.projectsCount}</td>
                                <td className="p-4 space-x-3">
                                    <Link href={`/sites/${site.id}`} className="text-blue-600 hover:underline">Open Site</Link>
                                    <Link href={`/sites/${site.id}/settings`} className="text-blue-600 hover:underline">Settings</Link>
                                    <Link href={`/sites/${site.id}/plugin`} className="text-blue-600 hover:underline">Plugin Status</Link>
                                </td>
                            </tr>
                        ))}
                        {data?.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">No sites connected.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
