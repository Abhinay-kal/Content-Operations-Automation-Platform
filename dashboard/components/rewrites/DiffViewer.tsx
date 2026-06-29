import React, { useState } from 'react';
import { RewriteDto } from '@/lib/api/types';

export function DiffViewer({ rewrite }: { rewrite: RewriteDto }) {
    const [mode, setMode] = useState<'inline' | 'split'>('inline');

    if (!rewrite.sectionDiffs || rewrite.sectionDiffs.length === 0) {
        return <div className="bg-white p-6 border rounded-lg text-gray-500">No diff data available.</div>;
    }

    return (
        <div className="bg-white border rounded-lg shadow-sm mb-6">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h2 className="text-lg font-bold">Section Diff Viewer</h2>
                <div className="space-x-2">
                    <button onClick={() => setMode('inline')} className={`px-3 py-1 text-sm rounded ${mode === 'inline' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Inline</button>
                    <button onClick={() => setMode('split')} className={`px-3 py-1 text-sm rounded ${mode === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Side-by-side</button>
                </div>
            </div>
            
            <div className="divide-y">
                {rewrite.sectionDiffs.map((diff, idx) => (
                    <div key={idx} className="p-0">
                        <div className="bg-gray-100 px-4 py-2 font-mono text-sm text-gray-600 font-semibold">{diff.sectionName}</div>
                        <div className="p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                            {diff.diffType === 'ADDED' && <div className="text-green-700 bg-green-50 p-2 rounded">+{diff.content}</div>}
                            {diff.diffType === 'REMOVED' && <div className="text-red-700 bg-red-50 p-2 rounded">-{diff.content}</div>}
                            {diff.diffType === 'MODIFIED' && (
                                mode === 'inline' ? (
                                    <div className="text-blue-700 bg-blue-50 p-2 rounded">~{diff.content}</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-red-700 bg-red-50 p-2 rounded">-{diff.content}</div>
                                        <div className="text-green-700 bg-green-50 p-2 rounded">+{diff.content}</div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
