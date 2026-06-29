import React from 'react';
import { AuditDto } from '@/lib/api/types';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export function IssueGroups({ audit }: { audit: AuditDto }) {
    if (!audit.issues || audit.issues.length === 0) return null;

    const categories = Array.from(new Set(audit.issues.map(i => i.category)));

    const getPriorityIcon = (priority: string) => {
        switch(priority.toUpperCase()) {
            case 'CRITICAL': return <ShieldAlert size={16} className="text-red-600"/>;
            case 'HIGH': return <AlertTriangle size={16} className="text-orange-600"/>;
            case 'MEDIUM': return <AlertTriangle size={16} className="text-yellow-600"/>;
            default: return <Info size={16} className="text-blue-600"/>;
        }
    }

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-6">Identified Issues</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {categories.map(cat => (
                    <div key={cat}>
                        <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">{cat}</h3>
                        <ul className="space-y-3">
                            {audit.issues.filter(i => i.category === cat).map((issue, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                    <div className="mt-0.5">{getPriorityIcon(issue.priority)}</div>
                                    <span className="text-gray-700">{issue.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
