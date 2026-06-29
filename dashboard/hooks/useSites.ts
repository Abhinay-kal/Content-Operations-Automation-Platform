import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { SiteDto } from '../lib/api/types';

export function useSites(page: number = 1) {
    return useQuery({
        queryKey: ['sites', page],
        queryFn: async () => {
            const res = await apiClient<SiteDto[]>(`/dashboard/sites?page=${page}`);
            return res;
        }
    });
}
