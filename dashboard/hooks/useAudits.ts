import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { AuditDto } from '../lib/api/types';

export function useAudit(auditId: string) {
    return useQuery({
        queryKey: ['audit', auditId],
        queryFn: async () => {
            const res = await apiClient<AuditDto>(`/dashboard/audits/${auditId}`);
            return res.data;
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'PROCESSING' ? 15000 : false;
        },
    });
}

export function useProjectAudits(projectId: string) {
    return useQuery({
        queryKey: ['project_audits', projectId],
        queryFn: async () => {
            const res = await apiClient<AuditDto[]>(`/dashboard/projects/${projectId}/audits`);
            return res.data;
        }
    });
}
