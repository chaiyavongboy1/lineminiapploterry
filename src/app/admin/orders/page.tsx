'use client';

import { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/types';
import type { Order, OrderStatus } from '@/types';
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

    const filteredOrders = filter === 'all'
        ? orders
        : orders.filter(o => o.status === filter);

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

            {/* Filter Tabs */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                {filters.map(f => (
                    <button
                        key={f.value}
                        className={`tab ${filter === f.value ? 'active' : ''}`}
                        onClick={() => setFilter(f.value)}
                    >
                        {f.label}
                        {f.value === 'pending_review' && filteredOrders.filter(o => o.status === 'pending_review').length > 0 && (
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

                        return (
                            <Link
                                key={order.id}
                                href={`/admin/orders/${order.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <div className="card fade-in" style={{
                                    animationDelay: `${index * 0.05}s`,
                                    borderLeft: order.status === 'pending_review' ? '4px solid var(--warning)' : undefined,
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
                                            <div style={{ fontWeight: 600, marginTop: 2 }}>
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
                                                        <span className="number-ball mini special selected" style={{ width: 22, height: 22, fontSize: 10 }}>{line.special_number}</span>
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
