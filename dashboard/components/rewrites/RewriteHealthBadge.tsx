import React from 'react';

export function RewriteHealthBadge({ severity }: { severity: string }) {
    let style = "bg-gray-100 text-gray-800";
    if (severity === 'MINIMAL_CHANGE') style = "bg-blue-100 text-blue-800";
    if (severity === 'MODERATE_CHANGE') style = "bg-purple-100 text-purple-800";
    if (severity === 'MAJOR_REWRITE') style = "bg-orange-100 text-orange-800";
    if (severity === 'COMPLETE_REWRITE') style = "bg-red-100 text-red-800";

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${style}`}>
            {severity.replace('_', ' ')}
        </span>
    );
}
