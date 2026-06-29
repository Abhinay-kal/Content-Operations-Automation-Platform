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

export interface ReviewFilters {
    siteId?: string;
    status?: string;
    changeSeverity?: string;
    assignment?: string;
}

export function useReviewQueue(page: number = 1, filters: ReviewFilters = {}) {
    return useQuery({
        queryKey: ['review_queue', page, filters],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString() });
            if (filters.siteId) params.append('siteId', filters.siteId);
            if (filters.status) params.append('status', filters.status);
            if (filters.changeSeverity) params.append('changeSeverity', filters.changeSeverity);
            if (filters.assignment) params.append('assignment', filters.assignment);
            
            const res = await apiClient<any[]>(`/dashboard/reviews?${params.toString()}`);
            return res;
        },
        refetchInterval: 30000,
    });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useReviewDetails(reviewId: string) {
    return useQuery({
        queryKey: ['review', reviewId],
        queryFn: async () => {
            const res = await apiClient<any>(`/dashboard/reviews/${reviewId}`);
            return res.data;
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'IN_REVIEW' ? 15000 : false;
        },
    });
}

export function useReviewAction(reviewId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (action: 'approve' | 'reject' | 'request-changes' | 'publish') => {
            return apiClient(`/dashboard/reviews/${reviewId}/${action}`, { method: 'POST' });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['review', reviewId] });
            qc.invalidateQueries({ queryKey: ['review_queue'] });
        }
    });
}

export function useReviewAssign(reviewId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (reviewerId: string) => {
            return apiClient(`/dashboard/reviews/${reviewId}/assign`, { 
                method: 'POST',
                body: JSON.stringify({ reviewerId })
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['review', reviewId] });
            qc.invalidateQueries({ queryKey: ['review_queue'] });
        }
    });
}
