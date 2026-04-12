'use client';

import { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/types';
import type { Order, OrderStatus, LotteryType } from '@/types';
import Link from 'next/link';
import { Eye, Clock, CheckCircle, XCircle, AlertCircle, FileText, Package } from 'lucide-react';

const statusBadgeClass: Record<OrderStatus, string> = {
    pending_payment: 'badge-pending',
    pending_slip: 'badge-pending',
    pending_review: 'badge-review',
    approved: 'badge-approved',
    completed: 'badge-approved',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled',
};

const statusIcons: Record<OrderStatus, React.ReactNode> = {
    pending_payment: <Clock size={12} />,
    pending_slip: <AlertCircle size={12} />,
    pending_review: <FileText size={12} />,
    approved: <CheckCircle size={12} />,
    completed: <Package size={12} />,
    rejected: <XCircle size={12} />,
    cancelled: <XCircle size={12} />,
};

export default function AdminOrdersPage() {
    const { profile } = useLine();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
    const [selectedLotteryId, setSelectedLotteryId] = useState<string>('all');

    // Load lottery types
    useEffect(() => {
        async function loadTypes() {
            const supabase = createClient();
            const { data } = await supabase.from('lottery_types').select('*').eq('is_active', true).order('name');
            if (data) setLotteryTypes(data);
        }
        loadTypes();
    }, []);

    useEffect(() => {
        if (!profile?.userId) return;

        async function fetchOrders() {
            try {
                const res = await fetch(
                    `/api/admin/orders?adminLineUserId=${profile!.userId}&status=${filter}`
                );
                const result = await res.json();
                if (result.success && result.data) {
                    setOrders(result.data);
                }
            } catch (err) {
                console.warn('Failed to fetch from API:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [profile, filter]);

    // Filter by status
    const statusFiltered = filter === 'all'
        ? orders
        : orders.filter(o => o.status === filter);

    // Then filter by lottery type
    const filteredOrders = selectedLotteryId === 'all'
        ? statusFiltered
        : statusFiltered.filter(o => o.lottery_type_id === selectedLotteryId);

    // Count per lottery type for badges
    const countByLottery = (ltId: string) => statusFiltered.filter(o => o.lottery_type_id === ltId).length;
    const pendingReviewCount = (ltId: string) =>
        orders.filter(o => o.status === 'pending_review' && (ltId === 'all' || o.lottery_type_id === ltId)).length;

    const filters = [
        { value: 'all', label: 'ทั้งหมด' },
        { value: 'pending_review', label: 'รอตรวจ' },
        { value: 'approved', label: 'ยืนยันแล้ว' },
        { value: 'completed', label: 'สำเร็จ' },
        { value: 'rejected', label: 'ปฏิเสธ' },
    ];

    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>📋 จัดการออร์เดอร์</h2>

            {/* Lottery Type Tabs */}
            {lotteryTypes.length > 0 && (
                <div style={{
                    display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto',
                    padding: '2px 0',
                }}>
                    <button
                        onClick={() => setSelectedLotteryId('all')}
                        style={{
                            padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                            border: selectedLotteryId === 'all' ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: selectedLotteryId === 'all' ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--bg-card)',
                            color: selectedLotteryId === 'all' ? '#fff' : 'var(--text)',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: selectedLotteryId === 'all' ? '0 2px 8px rgba(59,89,152,0.25)' : 'none',
                        }}
                    >
                        🎰 ทั้งหมด ({statusFiltered.length})
                    </button>
                    {lotteryTypes.map(lt => {
                        const isActive = selectedLotteryId === lt.id;
                        const isPowerball = lt.name === 'Powerball';
                        const emoji = isPowerball ? '🔴' : '🟡';
                        const activeGrad = isPowerball
                            ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                            : 'linear-gradient(135deg, #f59e0b, #d97706)';
                        const activeShadow = isPowerball
                            ? '0 2px 8px rgba(231,76,60,0.3)'
                            : '0 2px 8px rgba(245,158,11,0.3)';
                        const count = countByLottery(lt.id);
                        const pending = pendingReviewCount(lt.id);

                        return (
                            <button
                                key={lt.id}
                                onClick={() => setSelectedLotteryId(lt.id)}
                                style={{
                                    padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                    border: isActive ? 'none' : '1px solid var(--border)',
                                    background: isActive ? activeGrad : 'var(--bg-card)',
                                    color: isActive ? '#fff' : 'var(--text)',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    boxShadow: isActive ? activeShadow : 'none',
                                    position: 'relative',
                                }}
                            >
                                {emoji} {lt.name} ({count})
                                {pending > 0 && !isActive && (
                                    <span style={{
                                        position: 'absolute', top: -4, right: -4,
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: 'var(--danger)', color: '#fff',
                                        fontSize: 10, fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {pending}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Status Filter Tabs */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                {filters.map(f => (
                    <button
                        key={f.value}
                        className={`tab ${filter === f.value ? 'active' : ''}`}
                        onClick={() => setFilter(f.value)}
                    >
                        {f.label}
                        {f.value === 'pending_review' && orders.filter(o => o.status === 'pending_review').length > 0 && (
                            <span style={{
                                background: 'var(--danger)', color: '#fff',
                                borderRadius: 10, padding: '1px 6px', fontSize: 10, marginLeft: 4,
                            }}>
                                {orders.filter(o => o.status === 'pending_review').length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12 }} />
                    ))}
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)' }}>ไม่มีออร์เดอร์</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredOrders.map((order, index) => {
                        const lotteryType = order.lottery_type as unknown as { name: string } | null;
                        const isPowerball = lotteryType?.name === 'Powerball';

                        return (
                            <Link
                                key={order.id}
                                href={`/admin/orders/${order.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <div className="card fade-in" style={{
                                    animationDelay: `${index * 0.05}s`,
                                    borderLeft: order.status === 'pending_review'
                                        ? '4px solid var(--warning)'
                                        : `4px solid ${isPowerball ? '#e74c3c' : '#f59e0b'}`,
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: 10,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {order.order_number}
                                            </div>
                                            <div style={{ fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    background: isPowerball
                                                        ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 10, color: isPowerball ? '#fff' : '#1a1a1a',
                                                    fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {isPowerball ? 'P' : 'M'}
                                                </span>
                                                {lotteryType?.name || 'N/A'}
                                            </div>
                                        </div>
                                        <span className={`badge ${statusBadgeClass[order.status]}`}>
                                            {statusIcons[order.status]}
                                            {ORDER_STATUS_LABELS[order.status]}
                                        </span>
                                    </div>

                                    {/* Show numbers preview */}
                                    {order.order_lines && order.order_lines.length > 0 && (
                                        <div style={{ marginBottom: 8 }}>
                                            {order.order_lines.slice(0, 2).map(line => (
                                                <div key={line.id || line.line_number} style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                                                    {line.numbers.map((n, i) => (
                                                        <span key={i} className="number-ball mini selected" style={{ width: 22, height: 22, fontSize: 10 }}>{n}</span>
                                                    ))}
                                                    {line.special_number !== null && (
                                                        <span
                                                            className="number-ball mini special selected"
                                                            style={{
                                                                width: 22, height: 22, fontSize: 10,
                                                                background: isPowerball
                                                                    ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                                                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                                color: isPowerball ? '#fff' : '#1a1a1a',
                                                            }}
                                                        >
                                                            {line.special_number}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {order.order_lines.length > 2 && (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    +{order.order_lines.length - 2} lines
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: 10,
                                        borderTop: '1px solid var(--border)',
                                    }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {formatDateTime(order.created_at)}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                                {formatCurrency(order.total_amount)}
                                            </span>
                                            <span style={{ fontSize: 13, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Eye size={14} /> ดู
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
