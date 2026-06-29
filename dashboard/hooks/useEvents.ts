import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export interface EventDto {
    id: number;
    project_id: number;
    event_type: string;
    message: string;
    created_at: string;
}

export function useEvents(page: number = 1) {
    return useQuery({
        queryKey: ['events', page],
        queryFn: async () => {
            const res = await apiClient<EventDto[]>(`/dashboard/events?page=${page}`);
            return res;
        },
        refetchInterval: 30000,
    });
}
