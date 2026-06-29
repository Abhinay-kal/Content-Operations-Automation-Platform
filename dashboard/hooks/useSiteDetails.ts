import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { SiteDto, PluginHealthDto, SiteSettingsDto, OperationDto, EventDto } from '../lib/api/types';

export function useSite(siteId: string) {
    return useQuery({
        queryKey: ['site', siteId],
        queryFn: async () => {
            const res = await apiClient<SiteDto>(`/dashboard/sites/${siteId}`);
            return res.data;
        },
        refetchInterval: 30000,
    });
}

export function useSitePlugin(siteId: string) {
    return useQuery({
        queryKey: ['site', siteId, 'plugin'],
        queryFn: async () => {
            const res = await apiClient<PluginHealthDto>(`/dashboard/sites/${siteId}/plugin`);
            return res.data;
        },
        refetchInterval: 15000,
    });
}

export function useSiteSettings(siteId: string) {
    return useQuery({
        queryKey: ['site', siteId, 'settings'],
        queryFn: async () => {
            const res = await apiClient<SiteSettingsDto>(`/dashboard/sites/${siteId}/settings`);
            return res.data;
        }
    });
}

export function useUpdateSiteSettings(siteId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: SiteSettingsDto) => {
            const res = await apiClient<SiteSettingsDto>(`/dashboard/sites/${siteId}/settings`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['site', siteId, 'settings'] });
        }
    });
}

export function useSiteOperations(siteId: string, page: number = 1) {
    return useQuery({
        queryKey: ['site', siteId, 'operations', page],
        queryFn: async () => {
            const res = await apiClient<OperationDto[]>(`/dashboard/sites/${siteId}/operations?page=${page}`);
            return res;
        },
        refetchInterval: 15000,
    });
}

export function useSiteEvents(siteId: string, page: number = 1) {
    return useQuery({
        queryKey: ['site', siteId, 'events', page],
        queryFn: async () => {
            const res = await apiClient<EventDto[]>(`/dashboard/sites/${siteId}/events?page=${page}`);
            return res;
        },
        refetchInterval: 30000,
    });
}
