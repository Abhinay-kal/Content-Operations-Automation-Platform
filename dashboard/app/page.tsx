"use client";
import React from 'react';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { SiteHealthGrid } from '@/components/dashboard/SiteHealthGrid';
import { QueueWidget } from '@/components/dashboard/QueueWidget';
import { ReviewWidget } from '@/components/dashboard/ReviewWidget';
import { EventFeed } from '@/components/dashboard/EventFeed';

export default function Dashboard() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
                <p className="text-gray-500 text-sm mt-1">Real-time operational health and pending actions.</p>
            </div>

            <KPIGrid />
            <SiteHealthGrid />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <QueueWidget />
                <ReviewWidget />
            </div>

            <EventFeed />
        </div>
    );
}
