import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { ProjectDto } from '../lib/api/types';

export function useProjects(page: number = 1) {
    return useQuery({
        queryKey: ['projects', page],
        queryFn: async () => {
            const res = await apiClient<ProjectDto[]>(`/dashboard/projects?page=${page}`);
            return res;
        }
    });
}
