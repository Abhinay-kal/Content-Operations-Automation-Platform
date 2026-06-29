import React from 'react';

export function ReviewSLA({ createdAt }: { createdAt: string }) {
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffHours = (now - created) / (1000 * 60 * 60);

    let color = 'bg-green-100 text-green-800';
    let label = '< 24h';
    if (diffHours >= 24 && diffHours <= 72) {
        color = 'bg-yellow-100 text-yellow-800';
        label = '24-72h';
    } else if (diffHours > 72) {
        color = 'bg-red-100 text-red-800';
        label = '> 72h';
    }

    return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>
            Wait: {label}
        </span>
    );
}
