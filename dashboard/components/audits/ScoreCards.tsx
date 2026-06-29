import React from 'react';
import { AuditDto } from '@/lib/api/types';

export function ScoreCards({ audit }: { audit: AuditDto }) {
    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-gray-400 border-gray-200 bg-gray-50';
        if (score >= 90) return 'text-green-700 border-green-200 bg-green-50';
        if (score >= 75) return 'text-blue-700 border-blue-200 bg-blue-50';
        if (score >= 60) return 'text-yellow-700 border-yellow-200 bg-yellow-50';
        return 'text-red-700 border-red-200 bg-red-50';
    };
    
    const getScoreLabel = (score: number | null) => {
        if (score === null) return 'N/A';
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Needs Improvement';
        return 'Critical';
    };

    const scores = [
        { label: 'SEO Score', value: audit.seoScore },
        { label: 'Intent Score', value: audit.intentScore },
        { label: 'E-E-A-T Score', value: audit.eeatScore },
        { label: 'Readability', value: audit.readabilityScore },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {scores.map(s => (
                <div key={s.label} className={`p-5 border rounded-lg flex flex-col items-center justify-center ${getScoreColor(s.value)}`}>
                    <div className="text-3xl font-bold mb-1">{s.value ?? '-'}</div>
                    <div className="text-sm font-semibold uppercase tracking-wider">{s.label}</div>
                    <div className="text-xs mt-2 opacity-80">{getScoreLabel(s.value)}</div>
                </div>
            ))}
        </div>
    );
}
