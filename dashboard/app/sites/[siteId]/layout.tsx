"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSite } from '@/hooks/useSiteDetails';
import { use } from 'react';

export default function SiteLayout({ children, params }: { children: React.ReactNode, params: Promise<{siteId: string}> }) {
    const { siteId } = use(params);
    const { data: site, isLoading } = useSite(siteId);
    const pathname = usePathname();

    if (isLoading) return <div className="p-4 animate-pulse">Loading workspace...</div>;
    if (!site) return <div className="p-4 text-red-500">Site not found.</div>;

    const navs = [
        { name: 'Overview', href: `/sites/${siteId}` },
        { name: 'Plugin Health', href: `/sites/${siteId}/plugin` },
        { name: 'Workflow Settings', href: `/sites/${siteId}/settings` },
    ];

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{site.name}</h1>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">{site.presence}</span>
                </div>
                <div className="text-gray-500 text-sm">{site.domain}</div>
            </div>

            <div className="border-b mb-6">
                <nav className="flex gap-6">
                    {navs.map(n => (
                        <Link 
                            key={n.name} 
                            href={n.href}
                            className={`pb-3 text-sm font-medium border-b-2 ${pathname === n.href ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            {n.name}
                        </Link>
                    ))}
                </nav>
            </div>

            <div>
                {children}
            </div>
        </div>
    );
}
