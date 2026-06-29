import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { RewriteDto, VersionDto } from '../lib/api/types';

export function useRewrite(rewriteId: string) {
    return useQuery({
        queryKey: ['rewrite', rewriteId],
        queryFn: async () => {
            const res = await apiClient<RewriteDto>(`/dashboard/rewrites/${rewriteId}`);
            return res.data;
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'PROCESSING' ? 15000 : false;
        },
    });
}

export function useProjectRewrites(projectId: string) {
    return useQuery({
        queryKey: ['project_rewrites', projectId],
        queryFn: async () => {
            const res = await apiClient<RewriteDto[]>(`/dashboard/projects/${projectId}/rewrites`);
            return res.data;
        }
    });
}

export function useProjectVersions(projectId: string) {
    return useQuery({
        queryKey: ['project_versions', projectId],
        queryFn: async () => {
            const res = await apiClient<VersionDto[]>(`/dashboard/projects/${projectId}/versions`);
            return res.data;
        }
    });
}
