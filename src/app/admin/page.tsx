'use client';

import React, { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import {
    DollarSign, FileText, Clock, CheckCircle,
    CreditCard, Settings, Ticket, ClipboardList,
    BarChart2, Zap, Inbox, BookOpen, ChevronRight,
    TrendingUp, AlertCircle
} from 'lucide-react';
import type { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface Stats {
    totalOrders: number;
    pendingReview: number;
    approved: number;
    totalRevenue: number;
    pendingByLotteryType: Record<string, number>;
}

function getThaiDate(): string {
    const now = new Date();
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const thaiDays = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    return `วัน${thaiDays[now.getDay()]}ที่ ${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
}

export default function AdminDashboard() {
    const { profile } = useLine();
    const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingReview: 0, approved: 0, totalRevenue: 0, pendingByLotteryType: {} });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [lotteryTypeNames, setLotteryTypeNames] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!profile?.userId) return;
        const userId = profile.userId;

        async function loadDashboard() {
            try {
                // Parallel fetch: stats + lottery types at the same time
                const [statsRes, lotteryTypesRes] = await Promise.all([
                    fetch(`/api/admin/stats?adminLineUserId=${userId}`),
                    fetch('/api/admin/lottery-types'),
                ]);

                const [statsResult, lotteryTypesResult] = await Promise.all([
                    statsRes.json(),
                    lotteryTypesRes.json(),
                ]);

                // Build lottery type name map from dedicated endpoint
                const nameMap: Record<string, string> = {};
                const list = lotteryTypesResult.data || lotteryTypesResult;
                if (Array.isArray(list)) {
                    for (const lt of list) nameMap[lt.id] = lt.name;
                }

                if (statsResult.success && statsResult.data) {
                    setStats({
                        totalOrders: statsResult.data.totalOrders,
                        pendingReview: statsResult.data.pendingReview,
                        approved: statsResult.data.approved,
                        totalRevenue: statsResult.data.totalRevenue,
                        pendingByLotteryType: statsResult.data.pendingByLotteryType || {},
                    });
                    setRecentOrders(statsResult.data.recentOrders || []);
                    // Merge names from recentOrders in case lottery-types endpoint missed any
                    for (const o of statsResult.data.recentOrders || []) {
                        const lt = o.lottery_type as { id: string; name: string } | null;
                        if (lt?.id && !nameMap[lt.id]) nameMap[lt.id] = lt.name;
                    }
                }

                setLotteryTypeNames(nameMap);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            } finally { setLoading(false); }
        }

        loadDashboard();
    }, [profile]);

    const statCards = [
        { label: 'ออร์เดอร์ทั้งหมด', value: stats.totalOrders, icon: <FileText size={20} />,
          bg: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)', iconBg: 'var(--grad-primary)',
          border: 'rgba(59,130,246,0.2)', color: '#1d4ed8', shadow: 'rgba(59,130,246,0.12)' },
        { label: 'รอตรวจสอบ', value: stats.pendingReview, icon: <Clock size={20} />,
          bg: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)', iconBg: 'var(--grad-accent)',
          border: 'rgba(245,158,11,0.22)', color: '#92400e', shadow: 'rgba(245,158,11,0.12)' },
        { label: 'ซื้อสำเร็จ', value: stats.approved, icon: <CheckCircle size={20} />,
          bg: 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)', iconBg: 'var(--grad-success)',
          border: 'rgba(16,185,129,0.2)', color: '#065f46', shadow: 'rgba(16,185,129,0.12)' },
        { label: 'ยอดขายรวม', value: formatCurrency(stats.totalRevenue), icon: <DollarSign size={20} />,
          bg: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)', iconBg: 'var(--grad-sky)',
          border: 'rgba(14,165,233,0.2)', color: '#0c4a6e', shadow: 'rgba(14,165,233,0.12)' },
    ];

    const quickActions = [
        { label: 'ตรวจสลิป',   href: '/admin/orders',       icon: <ClipboardList size={20} />, cls: 'icon-box-grad-blue' },
        { label: 'ธนาคาร',     href: '/admin/settings',     icon: <CreditCard size={20} />,    cls: 'icon-box-grad-sky' },
        { label: 'จัดการ Lottery',  href: '/admin/lottery-types', icon: <Ticket size={20} />,        cls: 'icon-box-grad-amber' },
        { label: 'เนื้อหา',    href: '/admin/content',      icon: <BookOpen size={20} />,      cls: 'icon-box-grad-emerald' },
        { label: 'ผลรางวัล',   href: '/admin/draw-results', icon: <BarChart2 size={20} />,     cls: 'icon-box-grad-ocean' },
        { label: 'ตั้งค่า',    href: '/admin/settings',     icon: <Settings size={20} />,      cls: 'icon-box-grad-blue' },
    ];

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending_review':  return { label: 'รอตรวจสอบ', color: '#92400e', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: 'rgba(245,158,11,0.25)' };
            case 'completed':       return { label: 'สำเร็จ',     color: '#065f46', bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: 'rgba(16,185,129,0.25)' };
            case 'rejected':        return { label: 'ปฏิเสธ',     color: '#9f1239', bg: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', border: 'rgba(244,63,94,0.22)' };
            case 'pending_payment': return { label: 'รอชำระ',     color: '#1d4ed8', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: 'rgba(59,130,246,0.25)' };
            default:                return { label: status,       color: '#475569', bg: 'var(--slate-50)',                        border: 'var(--border)' };
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="skeleton" style={{ height: 110, borderRadius: 22 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 115, borderRadius: 16 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 16 }}>

            {/* ═══ Welcome ═══ */}
            <div className="fade-in" style={{
                background: 'var(--grad-hero)',
                border: '2px solid rgba(59,130,246,0.18)',
                borderRadius: 22, padding: '20px 18px',
                position: 'relative', overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
            }}>
                <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -20, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 15,
                        background: 'var(--grad-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-blue)', flexShrink: 0, fontSize: 20,
                    }}>
                        👋
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>สวัสดี, Admin</div>
                        <div style={{ fontSize: 11, color: 'var(--blue-600)', fontWeight: 600, marginTop: 2 }}>{getThaiDate()}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--emerald-600)', fontWeight: 700, marginTop: 4 }}>
                            <span className="status-dot" />
                            ระบบทำงานปกติ
                        </div>
                    </div>
                    <TrendingUp size={22} color="rgba(59,130,246,0.35)" />
                </div>
            </div>

            {/* ═══ Stats ═══ */}
            <div>
                <div className="admin-section-title">
                    <BarChart2 size={14} color="var(--blue-500)" />
                    ภาพรวมระบบ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {statCards.map((c, i) => (
                        <div key={i} className="fade-in" style={{
                            animationDelay: `${i * 0.07}s`,
                            background: c.bg, border: `2px solid ${c.border}`,
                            borderRadius: 16, padding: '16px 14px',
                            position: 'relative', overflow: 'hidden',
                            boxShadow: `0 4px 14px ${c.shadow}`,
                            transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                        }}>
                            {/* BG icon */}
                            <div style={{ position: 'absolute', right: -8, bottom: -8, opacity: 0.1, color: c.color }}>
                                {React.cloneElement(c.icon as React.ReactElement<{size:number}>, { size: 52 })}
                            </div>
                            {/* Shine */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />

                            <div style={{ width: 36, height: 36, borderRadius: 11, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 12, boxShadow: `0 3px 10px ${c.shadow}`, position: 'relative' }}>
                                {c.icon}
                            </div>
                            <div style={{ fontSize: c.value.toString().length > 7 ? 17 : 26, fontWeight: 900, color: c.color, lineHeight: 1.1, marginBottom: 3, letterSpacing: '-0.02em', position: 'relative' }}>
                                {c.value}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: c.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', position: 'relative' }}>
                                {c.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ Per-type Notification Badges ═══ */}
            {Object.keys(stats.pendingByLotteryType).length > 0 && (
                <div>
                    <div className="admin-section-title">
                        <AlertCircle size={14} color="var(--amber-500)" />
                        การแจ้งเตือนรอตรวจสอบ (แยกตามประเภท)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.entries(stats.pendingByLotteryType).map(([typeId, count]) => {
                            const name = lotteryTypeNames[typeId] || typeId.slice(0, 8);
                            const isPB = name.toLowerCase().includes('powerball');
                            return (
                                <Link
                                    key={typeId}
                                    href={`/admin/orders?status=pending_review&lotteryTypeId=${typeId}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', borderRadius: 14,
                                        background: isPB
                                            ? 'linear-gradient(135deg, rgba(255,228,232,0.95), rgba(255,200,210,0.85))'
                                            : 'linear-gradient(135deg, rgba(255,252,220,0.95), rgba(255,236,160,0.85))',
                                        border: isPB ? '1.5px solid rgba(231,76,60,0.25)' : '1.5px solid rgba(245,158,11,0.25)',
                                        boxShadow: isPB ? '0 2px 8px rgba(231,76,60,0.08)' : '0 2px 8px rgba(245,158,11,0.08)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: 10,
                                                background: isPB ? '#e74c3c' : '#f59e0b',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 14, color: '#fff', fontWeight: 800,
                                            }}>{isPB ? '🔴' : '🟡'}</div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{name}</div>
                                                <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>รอตรวจสอบ</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                minWidth: 28, height: 28, borderRadius: 14,
                                                background: isPB ? '#e74c3c' : '#f59e0b',
                                                color: '#fff', fontWeight: 900, fontSize: 14,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '0 8px',
                                            }}>{count}</span>
                                            <ChevronRight size={14} color={isPB ? '#e74c3c' : '#d97706'} />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ Quick Actions ═══ */}
            <div>
                <div className="admin-section-title">
                    <Zap size={14} color="var(--amber-500)" />
                    การจัดการด่วน
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {quickActions.map((a, i) => (
                        <Link key={i} href={a.href} className="admin-quick-action fade-in" style={{ animationDelay: `${(i + 4) * 0.06}s` }}>
                            <div className={`icon-box ${a.cls}`} style={{ width: 42, height: 42, borderRadius: 13 }}>{a.icon}</div>
                            <span className="qa-label">{a.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ═══ Recent Activity ═══ */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div className="admin-section-title" style={{ marginBottom: 0 }}>
                        <FileText size={14} color="var(--blue-500)" />
                        กิจกรรมล่าสุด
                    </div>
                    <Link href="/admin/orders" style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--blue-600)',
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3,
                        background: 'rgba(59,130,246,0.08)', padding: '4px 10px', borderRadius: 18,
                    }}>
                        ทั้งหมด <ChevronRight size={12} />
                    </Link>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="admin-empty-state fade-in">
                        <div style={{
                            width: 56, height: 56, borderRadius: 18,
                            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                            border: '2px solid rgba(59,130,246,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px',
                        }}>
                            <Inbox size={26} color="var(--blue-400)" strokeWidth={1.5} />
                        </div>
                        <p>ยังไม่มีออร์เดอร์ในระบบ</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {recentOrders.map((order, i) => {
                            const info = getStatusInfo(order.status);
                            return (
                                <Link key={order.id} href={`/admin/orders/${order.id}`}
                                    className="admin-activity-item fade-in"
                                    style={{ animationDelay: `${(i + 10) * 0.05}s`, textDecoration: 'none', color: 'var(--text)' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                                        background: info.bg, border: `1.5px solid ${info.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color,
                                    }}>
                                        <FileText size={17} />
                                    </div>
                                    <div className="activity-info">
                                        <div className="activity-title">#{order.id.slice(-6).toUpperCase()}</div>
                                        <div style={{ marginTop: 3 }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                padding: '2px 8px', borderRadius: 18,
                                                background: info.bg, border: `1px solid ${info.border}`,
                                                color: info.color, fontSize: 10, fontWeight: 800,
                                            }}>
                                                {info.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="activity-amount" style={{ color: 'var(--blue-700)' }}>
                                        {formatCurrency(Number(order.total_amount))}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
