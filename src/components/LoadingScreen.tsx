'use client';

import { Ticket } from 'lucide-react';

interface LoadingScreenProps {
    title?: string;
    subtitle?: string;
}

export default function LoadingScreen({
    title = 'Lottery USA',
    subtitle = 'กำลังโหลด...',
}: LoadingScreenProps) {
    return (
        <div className="loading-screen">
            <div className="loading-logo">
                <Ticket />
            </div>
            <div className="loading-title">{title}</div>
            <div className="loading-subtitle">{subtitle}</div>
            <div className="loading-bar-track">
                <div className="loading-bar-fill" />
            </div>
        </div>
    );
}
