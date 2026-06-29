import React from 'react';
import { RewriteDto } from '@/lib/api/types';
import { RewriteHealthBadge } from './RewriteHealthBadge';

export function RewriteMetrics({ rewrite }: { rewrite: RewriteDto }) {
    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Rewrite Metrics</h2>
                <RewriteHealthBadge severity={rewrite.changeSeverity} />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-50 rounded border">
                    <div className="text-xs text-gray-500 uppercase">Original Words</div>
                    <div className="text-2xl font-semibold mt-1">{rewrite.originalWordCount}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded border">
                    <div className="text-xs text-gray-500 uppercase">New Words</div>
                    <div className="text-2xl font-semibold mt-1">{rewrite.rewrittenWordCount}</div>
                </div>
                <div className="p-4 bg-green-50 rounded border text-green-700">
                    <div className="text-xs uppercase">Words Added</div>
                    <div className="text-2xl font-semibold mt-1">+{rewrite.wordsAdded}</div>
                </div>
                <div className="p-4 bg-red-50 rounded border text-red-700">
                    <div className="text-xs uppercase">Words Removed</div>
                    <div className="text-2xl font-semibold mt-1">-{rewrite.wordsRemoved}</div>
                </div>
                <div className="p-4 bg-blue-50 rounded border text-blue-700">
                    <div className="text-xs uppercase">Change %</div>
                    <div className="text-2xl font-semibold mt-1">{rewrite.changePercentage.toFixed(1)}%</div>
                </div>
            </div>
        </div>
    );
}
