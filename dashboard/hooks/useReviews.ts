import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export interface ReviewDto {
    id: number;
    project_id: number;
    status: string;
    title: string;
    created_at: string;
}

export function useReviews(page: number = 1) {
    return useQuery({
        queryKey: ['reviews', page],
        queryFn: async () => {
            const res = await apiClient<ReviewDto[]>(`/dashboard/reviews?page=${page}`);
            return res;
        },
        refetchInterval: 30000,
    });
}
