import { useQuery } from '@tanstack/react-query';
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
