'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import liff from '@line/liff';
import type { LineProfile } from '@/types';

interface LineContextType {
    liff: typeof liff | null;
    profile: LineProfile | null;
    isLoggedIn: boolean;
    isReady: boolean;
    error: string | null;
    logout: () => void;
}

const LineContext = createContext<LineContextType>({
    liff: null,
    profile: null,
    isLoggedIn: false,
    isReady: false,
    error: null,
    logout: () => { },
});

export function useLine() {
    return useContext(LineContext);
}

interface LineProviderProps {
    children: ReactNode;
}

export function LineProvider({ children }: LineProviderProps) {
    const [liffObj, setLiffObj] = useState<typeof liff | null>(null);
    const [profile, setProfile] = useState<LineProfile | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initMiniApp = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LINE_MINI_APP_ID;
                if (!liffId) {
                    console.error('NEXT_PUBLIC_LINE_MINI_APP_ID is not set');
                    setError('LINE Mini App ID not configured');
                    setIsReady(true);
                    return;
                }

                await liff.init({ liffId });
                setLiffObj(liff);

                if (liff.isLoggedIn()) {
                    setIsLoggedIn(true);
                    const userProfile = await liff.getProfile();
                    const lineProfile: LineProfile = {
                        userId: userProfile.userId,
                        displayName: userProfile.displayName,
                        pictureUrl: userProfile.pictureUrl,
                        statusMessage: userProfile.statusMessage,
                    };
                    setProfile(lineProfile);

                    // Upsert user to Supabase in background (fire and forget)
                    fetch('/api/auth/line', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(lineProfile),
                    }).catch(err => console.warn('Failed to upsert user:', err));
                }
            } catch (err) {
                console.error('LINE Mini App init error:', err);
                setError(err instanceof Error ? err.message : 'LINE Mini App init failed');
            } finally {
                setIsReady(true);
            }
        };

        initMiniApp();
    }, []);

    const logout = () => {
        if (liffObj && liffObj.isLoggedIn()) {
            liffObj.logout();
            setIsLoggedIn(false);
            setProfile(null);
            window.location.reload();
        }
    };

    return (
        <LineContext.Provider
            value={{
                liff: liffObj,
                profile,
                isLoggedIn,
                isReady,
                error,
                logout,
            }}
        >
            {children}
        </LineContext.Provider>
    );
}
