'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import liff from '@line/liff';
import type { LineProfile } from '@/types';

const ADMIN_CACHE_KEY = 'app_is_admin';
const ADMIN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface LineContextType {
    liff: typeof liff | null;
    profile: LineProfile | null;
    isLoggedIn: boolean;
    isReady: boolean;
    isAdmin: boolean;
    error: string | null;
    logout: () => void;
}

const LineContext = createContext<LineContextType>({
    liff: null,
    profile: null,
    isLoggedIn: false,
    isReady: false,
    isAdmin: false,
    error: null,
    logout: () => { },
});

export function useLine() {
    return useContext(LineContext);
}

interface LineProviderProps {
    children: ReactNode;
}

// Read cached admin role from sessionStorage (survives tab navigation, cleared on close)
function getCachedAdmin(userId: string): boolean | null {
    try {
        const raw = sessionStorage.getItem(`${ADMIN_CACHE_KEY}_${userId}`);
        if (!raw) return null;
        const { value, expires } = JSON.parse(raw);
        if (Date.now() > expires) {
            sessionStorage.removeItem(`${ADMIN_CACHE_KEY}_${userId}`);
            return null;
        }
        return value as boolean;
    } catch {
        return null;
    }
}

function setCachedAdmin(userId: string, isAdmin: boolean) {
    try {
        sessionStorage.setItem(`${ADMIN_CACHE_KEY}_${userId}`, JSON.stringify({
            value: isAdmin,
            expires: Date.now() + ADMIN_CACHE_TTL,
        }));
    } catch { /* ignore */ }
}

export function LineProvider({ children }: LineProviderProps) {
    const [liffObj, setLiffObj] = useState<typeof liff | null>(null);
    const [profile, setProfile] = useState<LineProfile | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initMiniApp = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LINE_MINI_APP_ID;
                if (!liffId) {
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

                    // Check cached admin role first (instant)
                    const cached = getCachedAdmin(userProfile.userId);
                    if (cached !== null) {
                        setIsAdmin(cached);
                    }

                    // Upsert user + fetch admin role in one call (fire and store)
                    fetch('/api/auth/line', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(lineProfile),
                    })
                        .then(res => res.json())
                        .then(result => {
                            if (result.success && result.data) {
                                const admin = result.data.role === 'admin' || result.data.role === 'super_admin';
                                setIsAdmin(admin);
                                setCachedAdmin(userProfile.userId, admin);
                            }
                        })
                        .catch(err => console.warn('Failed to upsert user:', err));
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
            if (profile?.userId) {
                try { sessionStorage.removeItem(`${ADMIN_CACHE_KEY}_${profile.userId}`); } catch { /* ignore */ }
            }
            liffObj.logout();
            setIsLoggedIn(false);
            setProfile(null);
            setIsAdmin(false);
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
                isAdmin,
                error,
                logout,
            }}
        >
            {children}
        </LineContext.Provider>
    );
}
