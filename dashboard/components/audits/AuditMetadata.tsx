import React from 'react';
import { AuditDto } from '@/lib/api/types';
import { Fingerprint, MessageSquare } from 'lucide-react';

export function AuditMetadata({ audit }: { audit: AuditDto }) {
    return (
        <div className="bg-gray-50 border rounded-lg p-6 mt-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Audit Diagnostics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                    <div className="text-gray-500 mb-1">Prompt Version</div>
                    <div className="font-mono text-gray-900">{audit.promptVersion || 'N/A'}</div>
                </div>
                <div>
                    <div className="text-gray-500 mb-1">Prompt Hash</div>
                    <div className="font-mono text-gray-900 truncate flex items-center gap-1">
                        <Fingerprint size={14}/> {audit.promptHash || 'N/A'}
                    </div>
                </div>
                <div className="col-span-2">
                    <div className="text-gray-500 mb-1">Claude Chat ID</div>
                    <div className="font-mono text-gray-900 flex items-center gap-1">
                        <MessageSquare size={14}/> {audit.claudeChatId || 'N/A'}
                    </div>
                </div>
            </div>
            {audit.failureReason && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded text-sm">
                    <strong>Failure Classification:</strong> {audit.failureReason}
                </div>
            )}
        </div>
    );
}
