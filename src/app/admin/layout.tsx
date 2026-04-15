'use client';

import { ReactNode } from 'react';
import { useLine } from '@/components/LineProvider';
import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, LogOut, ShieldCheck, Trophy, BookOpen, Ticket, Coins } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
    // isAdmin comes from LineProvider context — no extra DB call needed
    const { isReady, isLoggedIn, isAdmin, logout } = useLine();
    const pathname = usePathname();

    // Show loader only while LIFF is initializing (isAdmin is already pre-cached)
    if (!isReady) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div className="loading-spinner" />
                <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>กำลังโหลด...</p>
            </div>
        );
    }

    if (!isLoggedIn || !isAdmin) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                    border: '2px solid rgba(244,63,94,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                }}>
                    <ShieldCheck size={32} color="var(--danger)" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>ไม่มีสิทธิ์เข้าถึง</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                    คุณไม่มีสิทธิ์เข้าถึงหน้า Admin
                </p>
                <Link href="/" className="btn btn-primary">กลับหน้าหลัก</Link>
            </div>
        );
    }

    const navItems = [
        { href: '/admin',               icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
        { href: '/admin/orders',        icon: <FileText size={16} />,        label: 'ออร์เดอร์' },
        { href: '/admin/draw-results',  icon: <Trophy size={16} />,          label: 'ผลรางวัล' },
        { href: '/admin/content',       icon: <BookOpen size={16} />,        label: 'เนื้อหา' },
        { href: '/admin/lottery-types', icon: <Ticket size={16} />,          label: 'จัดการ Lottery' },
        { href: '/admin/settings',      icon: <Settings size={16} />,        label: 'ตั้งค่า' },
        { href: '/admin/prize-tiers',   icon: <Coins size={16} />,           label: 'เงินรางวัล' },
    ];

    return (
        <div>
            {/* Admin Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0 10px',
                marginBottom: 8,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="icon-box icon-box-grad-blue" style={{ width: 32, height: 32, borderRadius: 10 }}>
                        <ShieldCheck size={16} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Admin Panel</span>
                </div>
                <button
                    onClick={logout}
                    style={{
                        background: 'rgba(244,63,94,0.06)',
                        border: '1.5px solid rgba(244,63,94,0.15)',
                        borderRadius: 20,
                        cursor: 'pointer',
                        color: 'var(--rose-500)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '5px 12px',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <LogOut size={14} />
                    ออก
                </button>
            </div>

            {/* Admin Nav */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`tab ${pathname === item.href ? 'active' : ''}`}
                        prefetch={true}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                ))}
            </div>

            {children}
        </div>
    );
}
