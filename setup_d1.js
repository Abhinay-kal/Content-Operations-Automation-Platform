const fs = require('fs');
const path = require('path');

const frontendDir = '/Users/abhinaykalkhanday/Desktop/n8n/dashboard';

function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

mkdirp(path.join(frontendDir, 'lib/api'));
mkdirp(path.join(frontendDir, 'hooks'));
mkdirp(path.join(frontendDir, 'components/ui'));

// 1. API Types
const apiTypes = `export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: any;
    errors?: any[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    }
}

export interface ApiErrorResponse {
    success: boolean;
    error: {
        code: string;
        message: string;
    }
}

export interface SiteDto {
    id: number;
    name: string;
    domain: string;
    active: boolean;
    postsCount: number;
    projectsCount: number;
    pendingAudits: number;
    pendingRewrites: number;
    pendingReviews: number;
    lastHeartbeat: string;
    presence: string;
    createdAt: string;
}

export interface ProjectDto {
    id: number;
    siteId: number;
    wpPostId: number;
    title: string;
    slug: string;
    contentState: string;
    workflowState: string;
    auditScore: number | null;
    intentScore: number | null;
    eeatScore: number | null;
    latestAuditId: number | null;
    latestRewriteId: number | null;
    lastSyncAt: string;
    lastAuditAt: string;
    lastRewriteAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobDto {
    id: number;
    projectId: number;
    siteId: number;
    type: string;
    status: string;
    priority: string;
    attemptCount: number;
    createdAt: string;
    startedAt: string;
    completedAt: string | null;
    runtimeMs: number;
}

export interface OverviewDto {
    total_sites: number;
    total_projects: number;
    projects_new: number;
    projects_stale: number;
    projects_review_pending: number;
    pending_audits: number;
    pending_rewrites: number;
    jobs_processing: number;
    jobs_failed: number;
    operations_pending: number;
    drafts_waiting_review: number;
}
`;
fs.writeFileSync(path.join(frontendDir, 'lib/api/types.ts'), apiTypes);

// 2. API Errors
const apiErrors = `export class ApiError extends Error {
    code: string;
    statusCode: number;

    constructor(code: string, message: string, statusCode: number = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}
`;
fs.writeFileSync(path.join(frontendDir, 'lib/api/errors.ts'), apiErrors);

// 3. API Client
const apiClient = `import { ApiResponse, ApiErrorResponse } from './types';
import { ApiError } from './errors';

// Helper to attach tokens, parse response, handle errors
export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
    };

    try {
        const response = await fetch(\`http://localhost:3000\${endpoint}\`, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            const errResponse = data as ApiErrorResponse;
            throw new ApiError(
                errResponse.error?.code || 'FETCH_ERROR', 
                errResponse.error?.message || 'Failed to fetch', 
                response.status
            );
        }

        return data as ApiResponse<T>;
    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('NETWORK_ERROR', error.message || 'Network error occurred', 0);
    }
}
`;
fs.writeFileSync(path.join(frontendDir, 'lib/api/client.ts'), apiClient);

// 4. React Query Hooks
const useOverviewHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { OverviewDto } from '../lib/api/types';

export function useOverview() {
    return useQuery({
        queryKey: ['overview'],
        queryFn: async () => {
            const res = await apiClient<OverviewDto>('/dashboard/overview');
            return res.data;
        },
        refetchInterval: 15000, // 15 second polling
    });
}
`;

const useSitesHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { SiteDto } from '../lib/api/types';

export function useSites(page: number = 1) {
    return useQuery({
        queryKey: ['sites', page],
        queryFn: async () => {
            const res = await apiClient<SiteDto[]>(\`/dashboard/sites?page=\${page}\`);
            return res;
        }
    });
}
`;

const useProjectsHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { ProjectDto } from '../lib/api/types';

export function useProjects(page: number = 1) {
    return useQuery({
        queryKey: ['projects', page],
        queryFn: async () => {
            const res = await apiClient<ProjectDto[]>(\`/dashboard/projects?page=\${page}\`);
            return res;
        }
    });
}
`;

const useJobsHook = `import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { JobDto } from '../lib/api/types';

export function useJobs(page: number = 1) {
    return useQuery({
        queryKey: ['jobs', page],
        queryFn: async () => {
            const res = await apiClient<JobDto[]>(\`/dashboard/jobs?page=\${page}\`);
            return res;
        },
        refetchInterval: 15000,
    });
}
`;

fs.writeFileSync(path.join(frontendDir, 'hooks/useOverview.ts'), useOverviewHook);
fs.writeFileSync(path.join(frontendDir, 'hooks/useSites.ts'), useSitesHook);
fs.writeFileSync(path.join(frontendDir, 'hooks/useProjects.ts'), useProjectsHook);
fs.writeFileSync(path.join(frontendDir, 'hooks/useJobs.ts'), useJobsHook);

// 5. Query Provider & Layout
const queryProvider = `"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1,
                refetchOnWindowFocus: false,
            }
        }
    }));
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/providers.tsx'), queryProvider);

// Sidebar component
const sidebar = `import Link from 'next/link';

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
`;
mkdirp(path.join(frontendDir, 'components'));
fs.writeFileSync(path.join(frontendDir, 'components/sidebar.tsx'), sidebar);

const topNav = `export function TopNav() {
    return (
        <header className="h-16 border-b bg-white flex items-center justify-between px-6">
            <div className="font-semibold text-gray-700">Dashboard Overview</div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Theme Toggle (Placeholder)</span>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">U</div>
            </div>
        </header>
    );
}
`;
fs.writeFileSync(path.join(frontendDir, 'components/top-nav.tsx'), topNav);


// App Layout
const appLayout = `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SEO Platform",
  description: "Dashboard Shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <TopNav />
                    <main className="flex-1 p-6 overflow-auto">
                        {children}
                    </main>
                </div>
            </div>
        </Providers>
      </body>
    </html>
  );
}
`;
fs.writeFileSync(path.join(frontendDir, 'app/layout.tsx'), appLayout);


// Page index template showing a loading skeleton / states
const pageIndex = `"use client";
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
`;
fs.writeFileSync(path.join(frontendDir, 'app/page.tsx'), pageIndex);

console.log("Setup complete for Frontend Dashboard D1");
