const fs = require('fs');
const path = require('path');

const backendDir = '/Users/abhinaykalkhanday/Desktop/n8n';
const frontendDir = path.join(backendDir, 'dashboard');

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(frontendDir, 'app/sites/[siteId]/settings'));
mkdirp(path.join(frontendDir, 'app/sites/[siteId]/plugin'));
mkdirp(path.join(frontendDir, 'components/sites'));

// 1. Backend Read Service
const readServicePath = path.join(backendDir, 'src/services/DashboardReadService.js');
let readServiceCode = fs.readFileSync(readServicePath, 'utf8');

if (!readServiceCode.includes('getSiteById')) {
    const newMethods = `
    getSiteById(id) {
        const r = this.db.prepare('SELECT * FROM sites WHERE id = ?').get(id);
        if (!r) return null;
        return {
            id: r.id,
            name: r.name,
            domain: r.domain,
            active: !!r.active,
            postsCount: 0,
            projectsCount: 0,
            pendingAudits: 0,
            pendingRewrites: 0,
            pendingReviews: 0,
            lastHeartbeat: "",
            presence: "ONLINE",
            createdAt: r.created_at
        };
    }

    getSitePlugin(siteId) {
        // mock for UI unblocking, real implementation would join plugin_installations
        return {
            version: '1.0.0',
            protocol: 'v1',
            backendVersion: '1.0.0',
            registrationStatus: 'REGISTERED',
            tokenStatus: 'VALID',
            lastHeartbeat: new Date().toISOString(),
            consecutiveFailures: 0,
            presence: 'ONLINE'
        };
    }

    getSiteSettings(siteId) {
        let settings = this.db.prepare('SELECT * FROM site_workflow_settings WHERE site_id = ?').get(siteId);
        if (!settings) {
            settings = {
                site_id: siteId,
                audit_threshold: 75,
                rewrite_threshold: 70,
                auto_reaudit_days: 30,
                auto_rewrite_enabled: 0,
                auto_publish_enabled: 0
            };
        }
        return {
            auditThreshold: settings.audit_threshold,
            rewriteThreshold: settings.rewrite_threshold,
            autoReauditDays: settings.auto_reaudit_days,
            autoRewriteEnabled: !!settings.auto_rewrite_enabled,
            autoPublishEnabled: !!settings.auto_publish_enabled
        };
    }

    updateSiteSettings(siteId, data) {
        const current = this.db.prepare('SELECT * FROM site_workflow_settings WHERE site_id = ?').get(siteId);
        if (current) {
            this.db.prepare(\`
                UPDATE site_workflow_settings SET
                    audit_threshold = ?,
                    rewrite_threshold = ?,
                    auto_reaudit_days = ?,
                    auto_rewrite_enabled = ?,
                    auto_publish_enabled = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE site_id = ?
            \`).run(
                data.auditThreshold, data.rewriteThreshold, data.autoReauditDays, 
                data.autoRewriteEnabled ? 1 : 0, data.autoPublishEnabled ? 1 : 0, siteId
            );
        } else {
            this.db.prepare(\`
                INSERT INTO site_workflow_settings (site_id, audit_threshold, rewrite_threshold, auto_reaudit_days, auto_rewrite_enabled, auto_publish_enabled)
                VALUES (?, ?, ?, ?, ?, ?)
            \`).run(
                siteId, data.auditThreshold, data.rewriteThreshold, data.autoReauditDays, 
                data.autoRewriteEnabled ? 1 : 0, data.autoPublishEnabled ? 1 : 0
            );
        }
    }

    getSiteOperations(siteId, pagination) {
        const rows = this.db.prepare(\`
            SELECT * FROM wordpress_operations WHERE site_id = ?
            ORDER BY \${pagination.sort} \${pagination.direction}
            LIMIT ? OFFSET ?
        \`).all(siteId, pagination.limit, pagination.offset);
        const total = this.db.prepare('SELECT COUNT(*) as c FROM wordpress_operations WHERE site_id = ?').get(siteId).c;
        return { data: rows, total };
    }

    getSiteEvents(siteId, pagination) {
        // mock site events using project events or ingestion
        // Since we don't have a site_id in event_ingestion cleanly mapped in this mock phase, we'll return empty for now
        return { data: [], total: 0 };
    }
`;
    readServiceCode = readServiceCode.replace(
        "mapProjectDto(row) {",
        newMethods + "\n    mapProjectDto(row) {"
    );
    fs.writeFileSync(readServicePath, readServiceCode);
}

// 2. Backend Routes
const routesPath = path.join(backendDir, 'src/api/dashboardRoutes.js');
let routesCode = fs.readFileSync(routesPath, 'utf8');

if (!routesCode.includes('/dashboard/sites/:id/plugin')) {
    const newRoutes = `
    router.get('/dashboard/sites/:id', (req, res) => {
        try {
            const data = dashboardReadService.getSiteById(req.params.id);
            if (!data) return sendError(res, new ApiError(ErrorCodes.SITE_NOT_FOUND, 'Site not found', 404));
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/plugin', (req, res) => {
        try {
            const data = dashboardReadService.getSitePlugin(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/settings', (req, res) => {
        try {
            const data = dashboardReadService.getSiteSettings(req.params.id);
            return sendSuccess(res, data);
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.put('/dashboard/sites/:id/settings', express.json(), (req, res) => {
        try {
            dashboardReadService.updateSiteSettings(req.params.id, req.body);
            return sendSuccess(res, dashboardReadService.getSiteSettings(req.params.id));
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/operations', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getSiteOperations(req.params.id, p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });

    router.get('/dashboard/sites/:id/events', (req, res) => {
        try {
            const p = parsePagination(req);
            const { data, total } = dashboardReadService.getSiteEvents(req.params.id, p);
            return sendSuccess(res, data, { ...p, total, pages: Math.ceil(total / p.limit) });
        } catch(e) {
            return sendError(res, { code: ErrorCodes.INTERNAL_ERROR, message: e.message });
        }
    });
`;
    routesCode = routesCode.replace(
        "return router;",
        newRoutes + "\n    return router;"
    );
    fs.writeFileSync(routesPath, routesCode);
}

// 3. Frontend Types & Hooks
const apiTypesPath = path.join(frontendDir, 'lib/api/types.ts');
let apiTypesCode = fs.readFileSync(apiTypesPath, 'utf8');

if (!apiTypesCode.includes('SiteSettingsDto')) {
    apiTypesCode += `
export interface PluginHealthDto {
    version: string;
    protocol: string;
    backendVersion: string;
    registrationStatus: string;
    tokenStatus: string;
    lastHeartbeat: string;
    consecutiveFailures: number;
    presence: string;
}

export interface SiteSettingsDto {
    auditThreshold: number;
    rewriteThreshold: number;
    autoReauditDays: number;
    autoRewriteEnabled: boolean;
    autoPublishEnabled: boolean;
}

export interface OperationDto {
    id: number;
    site_id: number;
    operation_uuid: string;
    operation_type: string;
    payload: string;
    priority: string;
    status: string;
    attempt_count: number;
    created_at: string;
}
`;
    fs.writeFileSync(apiTypesPath, apiTypesCode);
}

const siteHooks = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { SiteDto, PluginHealthDto, SiteSettingsDto, OperationDto, EventDto } from '../lib/api/types';

export function useSite(siteId: string) {
    return useQuery({
        queryKey: ['site', siteId],
        queryFn: async () => {
            const res = await apiClient<SiteDto>(\`/dashboard/sites/\${siteId}\`);
            return res.data;
        },
        refetchInterval: 30000,
    });
}

export function useSitePlugin(siteId: string) {
    return useQuery({
        queryKey: ['site', siteId, 'plugin'],
        queryFn: async () => {
            const res = await apiClient<PluginHealthDto>(\`/dashboard/sites/\${siteId}/plugin\`);
            return res.data;
        },
        refetchInterval: 15000,
    });
}

export function useSiteSettings(siteId: string) {
    return useQuery({
        queryKey: ['site', siteId, 'settings'],
        queryFn: async () => {
            const res = await apiClient<SiteSettingsDto>(\`/dashboard/sites/\${siteId}/settings\`);
            return res.data;
        }
    });
}

export function useUpdateSiteSettings(siteId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: SiteSettingsDto) => {
            const res = await apiClient<SiteSettingsDto>(\`/dashboard/sites/\${siteId}/settings\`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['site', siteId, 'settings'] });
        }
    });
}

export function useSiteOperations(siteId: string, page: number = 1) {
    return useQuery({
        queryKey: ['site', siteId, 'operations', page],
        queryFn: async () => {
            const res = await apiClient<OperationDto[]>(\`/dashboard/sites/\${siteId}/operations?page=\${page}\`);
            return res;
        },
        refetchInterval: 15000,
    });
}

export function useSiteEvents(siteId: string, page: number = 1) {
    return useQuery({
        queryKey: ['site', siteId, 'events', page],
        queryFn: async () => {
            const res = await apiClient<EventDto[]>(\`/dashboard/sites/\${siteId}/events?page=\${page}\`);
            return res;
        },
        refetchInterval: 30000,
    });
}
`;
fs.writeFileSync(path.join(frontendDir, 'hooks/useSiteDetails.ts'), siteHooks);


// 4. Frontend Pages

const sitesList = `"use client";
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
                                    <Link href={\`/sites/\${site.id}\`} className="text-blue-600 hover:underline">Open Site</Link>
                                    <Link href={\`/sites/\${site.id}/settings\`} className="text-blue-600 hover:underline">Settings</Link>
                                    <Link href={\`/sites/\${site.id}/plugin\`} className="text-blue-600 hover:underline">Plugin Status</Link>
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
`;
fs.writeFileSync(path.join(frontendDir, 'app/sites/page.tsx'), sitesList);

const siteLayout = `"use client";
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
        { name: 'Overview', href: \`/sites/\${siteId}\` },
        { name: 'Plugin Health', href: \`/sites/\${siteId}/plugin\` },
        { name: 'Workflow Settings', href: \`/sites/\${siteId}/settings\` },
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
                            className={\`pb-3 text-sm font-medium border-b-2 \${pathname === n.href ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}\`}
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
`;
fs.writeFileSync(path.join(frontendDir, 'app/sites/[siteId]/layout.tsx'), siteLayout);


const siteOverview = `"use client";
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
`;
fs.writeFileSync(path.join(frontendDir, 'app/sites/[siteId]/page.tsx'), siteOverview);

const sitePlugin = `"use client";
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
`;
fs.writeFileSync(path.join(frontendDir, 'app/sites/[siteId]/plugin/page.tsx'), sitePlugin);

const siteSettings = `"use client";
import { useSiteSettings, useUpdateSiteSettings } from '@/hooks/useSiteDetails';
import { useState, useEffect, use } from 'react';

export default function WorkflowSettings({ params }: { params: Promise<{siteId: string}> }) {
    const { siteId } = use(params);
    const { data: settings, isLoading } = useSiteSettings(siteId);
    const updateSettings = useUpdateSiteSettings(siteId);
    
    const [formData, setFormData] = useState({
        auditThreshold: 75,
        rewriteThreshold: 70,
        autoReauditDays: 30,
        autoRewriteEnabled: false,
        autoPublishEnabled: false,
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                auditThreshold: settings.auditThreshold,
                rewriteThreshold: settings.rewriteThreshold,
                autoReauditDays: settings.autoReauditDays,
                autoRewriteEnabled: settings.autoRewriteEnabled,
                autoPublishEnabled: settings.autoPublishEnabled,
            });
        }
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings.mutate(formData);
    };

    if (isLoading) return <div className="animate-pulse">Loading settings...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Workflow Settings</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Audit Threshold</label>
                        <input type="number" value={formData.auditThreshold} onChange={e => setFormData({...formData, auditThreshold: +e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Rewrite Threshold</label>
                        <input type="number" value={formData.rewriteThreshold} onChange={e => setFormData({...formData, rewriteThreshold: +e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
                    </div>
                    <div className="flex items-center gap-3 py-2">
                        <input type="checkbox" checked={formData.autoRewriteEnabled} onChange={e => setFormData({...formData, autoRewriteEnabled: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        <label className="text-sm font-medium text-gray-700">Auto Rewrite Enabled</label>
                    </div>
                    <div className="flex items-center gap-3 py-2">
                        <input type="checkbox" checked={formData.autoPublishEnabled} onChange={e => setFormData({...formData, autoPublishEnabled: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        <label className="text-sm font-medium text-gray-700">Auto Publish Enabled</label>
                    </div>
                    
                    <button type="submit" disabled={updateSettings.isPending} className="mt-4 w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                        {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                    {updateSettings.isSuccess && <div className="text-green-600 text-sm mt-2">Settings saved successfully!</div>}
                </form>
            </div>
            
            <div className="bg-gray-50 border rounded-lg shadow-sm p-6 text-sm">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Workflow Policy Tree</h2>
                <div className="space-y-2 font-mono bg-gray-900 text-green-400 p-4 rounded">
                    <div>NEW</div>
                    <div>↓</div>
                    <div>AUDIT_PENDING</div>
                    <div>↓</div>
                    <div>AUDIT_COMPLETE</div>
                    <div>↓</div>
                    <div>REWRITE_PENDING (if score &lt; {formData.auditThreshold})</div>
                    <div>↓</div>
                    <div>REWRITE_COMPLETE</div>
                    <div>↓</div>
                    <div>REVIEW_PENDING</div>
                </div>
            </div>
        </div>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/sites/[siteId]/settings/page.tsx'), siteSettings);


console.log("Setup complete for Frontend Phase D3");
