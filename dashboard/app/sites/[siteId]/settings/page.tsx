"use client";
import { useSiteSettings, useUpdateSiteSettings } from '@/hooks/useSiteDetails';
import { useState, useEffect, use } from 'react';

export default function WorkflowSettings({ params }: { params: Promise<{siteId: string}> }) {
    const { siteId } = use(params);
    const { data: settings, isLoading } = useSiteSettings(siteId);
    const updateSettings = useUpdateSiteSettings(siteId);
    
    const [formData, setFormData] = useState({
        auditThreshold: 75,
        rewriteThreshold: 70,
        autoReauditDays: 30,
        autoRewriteEnabled: false,
        autoPublishEnabled: false,
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                auditThreshold: settings.auditThreshold,
                rewriteThreshold: settings.rewriteThreshold,
                autoReauditDays: settings.autoReauditDays,
                autoRewriteEnabled: settings.autoRewriteEnabled,
                autoPublishEnabled: settings.autoPublishEnabled,
            });
        }
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings.mutate(formData);
    };

    if (isLoading) return <div className="animate-pulse">Loading settings...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Workflow Settings</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Audit Threshold</label>
                        <input type="number" value={formData.auditThreshold} onChange={e => setFormData({...formData, auditThreshold: +e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Rewrite Threshold</label>
                        <input type="number" value={formData.rewriteThreshold} onChange={e => setFormData({...formData, rewriteThreshold: +e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
                    </div>
                    <div className="flex items-center gap-3 py-2">
                        <input type="checkbox" checked={formData.autoRewriteEnabled} onChange={e => setFormData({...formData, autoRewriteEnabled: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        <label className="text-sm font-medium text-gray-700">Auto Rewrite Enabled</label>
                    </div>
                    <div className="flex items-center gap-3 py-2">
                        <input type="checkbox" checked={formData.autoPublishEnabled} onChange={e => setFormData({...formData, autoPublishEnabled: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        <label className="text-sm font-medium text-gray-700">Auto Publish Enabled</label>
                    </div>
                    
                    <button type="submit" disabled={updateSettings.isPending} className="mt-4 w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                        {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                    {updateSettings.isSuccess && <div className="text-green-600 text-sm mt-2">Settings saved successfully!</div>}
                </form>
            </div>
            
            <div className="bg-gray-50 border rounded-lg shadow-sm p-6 text-sm">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Workflow Policy Tree</h2>
                <div className="space-y-2 font-mono bg-gray-900 text-green-400 p-4 rounded">
                    <div>NEW</div>
                    <div>↓</div>
                    <div>AUDIT_PENDING</div>
                    <div>↓</div>
                    <div>AUDIT_COMPLETE</div>
                    <div>↓</div>
                    <div>REWRITE_PENDING (if score &lt; {formData.auditThreshold})</div>
                    <div>↓</div>
                    <div>REWRITE_COMPLETE</div>
                    <div>↓</div>
                    <div>REVIEW_PENDING</div>
                </div>
            </div>
        </div>
    );
}
