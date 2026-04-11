'use client';

import React, { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Ticket, History, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Order, OrderStatus } from '@/types';
import { ORDER_STATUS_LABELS } from '@/types';
import Link from 'next/link';

const statusIcons: Record<OrderStatus, React.ReactNode> = {
    pending_payment: <Clock size={14} />,
    pending_slip: <AlertCircle size={14} />,
    pending_review: <FileText size={14} />,
    approved: <CheckCircle size={14} />,
    completed: <CheckCircle size={14} />,
    rejected: <XCircle size={14} />,
    cancelled: <XCircle size={14} />,
};

const statusBadgeClass: Record<OrderStatus, string> = {
    pending_payment: 'badge-pending',
    pending_slip: 'badge-pending',
    pending_review: 'badge-review',
    approved: 'badge-approved',
    completed: 'badge-approved',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled',
};

export default function OrderHistoryPage() {
    const { profile, isReady, isLoggedIn } = useLine();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isReady) return;
        if (!profile?.userId) {
            setLoading(false);
            return;
        }

        async function fetchOrders() {
            try {
                const res = await fetch(`/api/orders?lineUserId=${profile!.userId}`);
                const result = await res.json();
                if (result.success && result.data?.length > 0) {
                    setOrders(result.data as Order[]);
                }
            } catch (err) {
                console.warn('Failed to fetch orders from API:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [isReady, profile]);


    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 12px' }}>
                <Link href="/" style={{ color: 'var(--text)', display: 'flex' }}>
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700 }}>📋 ประวัติออร์เดอร์</h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        ดูรายการสั่งซื้อทั้งหมดของคุณ
                    </p>
                </div>
            </div>

            {!isLoggedIn ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, marginTop: 20 }}>
                    <p style={{ color: 'var(--text-muted)' }}>กรุณาเข้าสู่ระบบเพื่อดูประวัติ</p>
                </div>
            ) : loading ? (
                <div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: 140, marginBottom: 12 }} />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, marginTop: 20 }}>
                    <Ticket size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <p style={{ color: 'var(--text-muted)' }}>ยังไม่มีออร์เดอร์</p>
                    <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                        ซื้อหวยเลย!
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    {orders.map((order: Order, index: number): React.JSX.Element => (
                        <div
                            key={order.id}
                            className="card fade-in"
                            style={{ animationDelay: `${index * 0.08}s` }}
                        >
                            {/* Order header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 12,
                            }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                                        {order.order_number}
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                                        {(order.lottery_type as unknown as { name: string })?.name || 'หวย'}
                                    </div>
                                </div>
                                <span className={`badge ${statusBadgeClass[order.status]}`}>
                                    {statusIcons[order.status]}
                                    {ORDER_STATUS_LABELS[order.status]}
                                </span>
                            </div>

                            {/* Numbers */}
                            {order.order_lines && order.order_lines.length > 0 ? (
                                <div style={{ marginBottom: 12 }}>
                                    {(expandedOrders[order.id] ? order.order_lines : order.order_lines.slice(0, 3)).map((line) => (
                                        <div key={line.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            marginBottom: 6,
                                        }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36 }}>
                                                L{line.line_number}:
                                            </span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {(line.numbers as number[]).map((n: number, i: number) => (
                                                    <span key={i} className="number-ball mini selected">{n}</span>
                                                ))}
                                                {line.special_number !== null && (
                                                    <span className="number-ball mini special selected">
                                                        {line.special_number as number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {order.order_lines.length > 3 && (
                                        <button
                                            onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--primary)',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: '4px 0',
                                                marginTop: 4,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            {expandedOrders[order.id] ? 'ย่อลง' : `ดูทั้งหมด (อีก ${order.order_lines.length - 3} lines)`}
                                        </button>
                                    )}
                                </div>
                            ) : null}

                            {/* Footer */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: 12,
                                borderTop: '1px solid var(--border)',
                            }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {formatDateTime(order.created_at)}
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                    {formatCurrency(order.total_amount)}
                                </span>
                            </div>

                            {/* Ticket images for completed orders */}
                            {order.status === 'completed' && (
                                (() => {
                                    const imgs = (order as unknown as { ticket_images?: { id: string; image_url: string }[] }).ticket_images;
                                    const hasMulti = imgs && imgs.length > 0;
                                    const hasSingle = !hasMulti && order.ticket_image;
                                    if (!hasMulti && !hasSingle) return null;
                                    const fileList = hasMulti
                                        ? imgs!.map((ti, idx) => ({ label: `รูปที่ ${idx + 1}`, url: ti.image_url }))
                                        : [{ label: 'รูป Lottery', url: order.ticket_image as string }];
                                    return (
                                        <div style={{
                                            marginTop: 12,
                                            padding: '12px',
                                            background: 'rgba(16, 185, 129, 0.06)',
                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                            borderRadius: 12,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                                                    🎫 รูป Lottery ของคุณ{hasMulti ? ` (${imgs!.length} รูป)` : ''}
                                                </span>
                                            </div>
                                            {order.purchased_at && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    📅 ซื้อเมื่อ: {formatDateTime(order.purchased_at)}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {fileList.map((item, idx) => (
                                                    <div key={idx} style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '9px 12px',
                                                        background: 'rgba(255,255,255,0.6)',
                                                        border: '1px solid rgba(16,185,129,0.2)',
                                                        borderRadius: 8,
                                                    }}>
                                                        <span style={{ fontSize: 16 }}>🎫</span>
                                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                            {item.label}
                                                        </span>
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-primary"
                                                            style={{ fontSize: 12, padding: '5px 12px', whiteSpace: 'nowrap' }}
                                                        >
                                                            🔍 เปิดดู
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()
                            )}

                            {/* Approved status - waiting for admin to purchase */}
                            {order.status === 'approved' && (
                                <div style={{
                                    marginTop: 12,
                                    padding: '10px 12px',
                                    background: 'rgba(37, 99, 235, 0.08)',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: 'var(--primary)',
                                }}>
                                    ✅ ยืนยันการจ่ายแล้ว — กำลังดำเนินการซื้อสินค้า
                                </div>
                            )}

                            {/* Action buttons based on status */}
                            {order.status === 'pending_payment' && (
                                <Link
                                    href={`/order/payment?orderId=${order.id}`}
                                    className="btn btn-accent btn-full"
                                    style={{ marginTop: 12, fontSize: 13, padding: '10px 16px' }}
                                >
                                    💳 ชำระเงิน
                                </Link>
                            )}
                            {order.status === 'pending_slip' && (
                                <Link
                                    href={`/order/upload-slip?orderId=${order.id}`}
                                    className="btn btn-primary btn-full"
                                    style={{ marginTop: 12, fontSize: 13, padding: '10px 16px' }}
                                >
                                    📎 แนบสลิป
                                </Link>
                            )}
                            {order.status === 'rejected' && order.admin_note && (
                                <div style={{
                                    marginTop: 12,
                                    padding: '10px 12px',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: 'var(--danger)',
                                }}>
                                    ❌ เหตุผลที่ปฏิเสธ: {order.admin_note}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
