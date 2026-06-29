import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { ProjectDto, ProjectHistoryDto } from '../lib/api/types';

export function useProject(projectId: string) {
    return useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const res = await apiClient<ProjectDto>(`/dashboard/projects/${projectId}`);
            return res.data;
        },
        refetchInterval: 15000,
    });
}

export function useProjectHistory(projectId: string, page: number = 1) {
    return useQuery({
        queryKey: ['project', projectId, 'history', page],
        queryFn: async () => {
            const res = await apiClient<ProjectHistoryDto[]>(`/dashboard/projects/${projectId}/history?page=${page}`);
            return res;
        },
        refetchInterval: 15000,
    });
}
