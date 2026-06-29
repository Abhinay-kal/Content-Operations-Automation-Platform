import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { JobDto } from '../lib/api/types';

export function useJobs(page: number = 1) {
    return useQuery({
        queryKey: ['jobs', page],
        queryFn: async () => {
            const res = await apiClient<JobDto[]>(`/dashboard/jobs?page=${page}`);
            return res;
        },
        refetchInterval: 15000,
    });
}
