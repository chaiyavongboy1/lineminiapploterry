'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Trophy, BookOpen, User, ShieldCheck } from 'lucide-react';
import { useLine } from '@/components/LineProvider';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
    { href: '/', icon: Home, label: 'หน้าหลัก' },
    { href: '/order/history', icon: ClipboardList, label: 'ออร์เดอร์' },
    { href: '/my-results', icon: Trophy, label: 'ผลรางวัล' },
    { href: '/info', icon: BookOpen, label: 'ข้อมูล' },
    { href: '/profile', icon: User, label: 'โปรไฟล์' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { profile, isReady } = useLine();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function checkAdmin() {
            if (!profile?.userId) return;
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('users')
                    .select('role')
                    .eq('line_user_id', profile.userId)
                    .single();
                setIsAdmin(data?.role === 'admin' || data?.role === 'super_admin');
            } catch {
                // not admin
            }
        }
        if (isReady) checkAdmin();
    }, [isReady, profile]);

    // Hide bottom nav on admin pages and flow pages with their own navigation
    const hideOnPaths = ['/admin', '/lottery/', '/order/checkout'];
    if (hideOnPaths.some(p => pathname.startsWith(p))) return null;

    // Build nav items - add admin if user is admin
    const allItems = isAdmin
        ? [...navItems, { href: '/admin', icon: ShieldCheck, label: 'Admin' }]
        : navItems;

    return (
        <nav className="bottom-nav">
            {allItems.map(item => {
                const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={isActive ? 'active' : ''}
                    >
                        <item.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
