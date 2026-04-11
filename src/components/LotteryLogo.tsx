'use client';

import Image from 'next/image';

interface LotteryLogoProps {
    type: string;
    size?: number;
}

export default function LotteryLogo({ type, size = 48 }: LotteryLogoProps) {
    const isPowerball = type.toLowerCase().includes('powerball');

    return (
        <div style={{
            width: size,
            height: size,
            borderRadius: size * 0.22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            background: '#fff',
            border: isPowerball
                ? '2px solid rgba(220, 38, 38, 0.12)'
                : '2px solid rgba(217, 119, 6, 0.12)',
            boxShadow: isPowerball
                ? '0 4px 16px rgba(220, 38, 38, 0.10)'
                : '0 4px 16px rgba(217, 119, 6, 0.10)',
        }}>
            <Image
                src={isPowerball ? '/powerball-logo.png' : '/megamillions-logo.png'}
                alt={isPowerball ? 'Powerball' : 'Mega Millions'}
                width={Math.round(size * 0.85)}
                height={Math.round(size * 0.85)}
                style={{ objectFit: 'contain' }}
                unoptimized
            />
        </div>
    );
}
