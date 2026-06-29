import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    isLoading: boolean;
}

export function KPICard({ title, value, icon: Icon, isLoading }: KPICardProps) {
    if (isLoading) {
        return <div className="bg-white p-6 rounded-lg border shadow-sm animate-pulse h-28" />;
    }

    return (
        <div className="bg-white p-6 rounded-lg border shadow-sm flex items-center justify-between">
            <div>
                <div className="text-sm text-gray-500 font-medium">{title}</div>
                <div className="text-3xl font-bold mt-2 text-gray-900">{value}</div>
            </div>
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <Icon size={24} />
            </div>
        </div>
    );
}
