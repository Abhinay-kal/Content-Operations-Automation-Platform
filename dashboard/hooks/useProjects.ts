import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { ProjectDto, ProjectFilters } from '../lib/api/types';

export function useProjects(page: number = 1, filters: ProjectFilters = {}) {
    return useQuery({
        queryKey: ['projects', page, filters],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString() });
            if (filters.siteId) params.append('siteId', filters.siteId);
            if (filters.contentState) params.append('contentState', filters.contentState);
            if (filters.workflowState) params.append('workflowState', filters.workflowState);
            if (filters.search) params.append('search', filters.search);
            
            const res = await apiClient<ProjectDto[]>(`/dashboard/projects?${params.toString()}`);
            return res;
        },
        refetchInterval: 30000,
    });
}
