import React from 'react';
import { RewriteDto } from '@/lib/api/types';
import { Check, Plus, Minus } from 'lucide-react';

export function RewriteSummary({ rewrite }: { rewrite: RewriteDto }) {
    const sum = rewrite.summary;
    if (!sum) return null;

    return (
        <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">AI Rewrite Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="p-4 bg-green-50 border border-green-100 rounded">
                    <div className="font-semibold text-green-800 flex items-center gap-1 mb-2"><Plus size={16}/> Added</div>
                    <ul className="space-y-1 text-green-900">
                        {sum.added?.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded">
                    <div className="font-semibold text-blue-800 flex items-center gap-1 mb-2"><Check size={16}/> Improved</div>
                    <ul className="space-y-1 text-blue-900">
                        {sum.improved?.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded">
                    <div className="font-semibold text-red-800 flex items-center gap-1 mb-2"><Minus size={16}/> Removed</div>
                    <ul className="space-y-1 text-red-900">
                        {sum.removed?.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
}
