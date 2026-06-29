import Link from 'next/link';

export function Sidebar() {
    const links = [
        { name: 'Dashboard', href: '/' },
        { name: 'Sites', href: '/sites' },
        { name: 'Projects', href: '/projects' },
        { name: 'Jobs', href: '/jobs' },
        { name: 'Reviews', href: '/reviews' },
        { name: 'Operations', href: '/operations' },
        { name: 'Settings', href: '/settings' }
    ];

    return (
        <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
            <div className="font-bold text-xl mb-8">SEO Platform</div>
            <nav className="flex flex-col gap-2">
                {links.map(l => (
                    <Link key={l.name} href={l.href} className="px-4 py-2 hover:bg-gray-800 rounded">
                        {l.name}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
