'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Trophy, BookOpen, User } from 'lucide-react';

const navItems = [
    { href: '/', icon: Home, label: 'หน้าหลัก' },
    { href: '/order/history', icon: ClipboardList, label: 'ออร์เดอร์' },
    { href: '/my-results', icon: Trophy, label: 'ผลรางวัล' },
    { href: '/info', icon: BookOpen, label: 'ข้อมูล' },
    { href: '/profile', icon: User, label: 'โปรไฟล์' },
];

export default function BottomNav() {
    const pathname = usePathname();

    // Hide bottom nav on admin pages and flow pages with their own navigation
    const hideOnPaths = ['/admin', '/lottery/', '/order/checkout'];
    if (hideOnPaths.some(p => pathname.startsWith(p))) return null;

    return (
        <nav className="bottom-nav">
            {navItems.map(item => {
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
