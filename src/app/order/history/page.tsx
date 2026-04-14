'use client';

import React, { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Ticket, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Order, OrderStatus, LotteryType } from '@/types';
import { ORDER_STATUS_LABELS } from '@/types';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

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
    const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
    const [selectedLotteryId, setSelectedLotteryId] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 10;

    // Load lottery types
    useEffect(() => {
        async function loadTypes() {
            const supabase = createClient();
            const { data } = await supabase.from('lottery_types').select('*').eq('is_active', true).order('name');
            if (data) setLotteryTypes(data);
        }
        loadTypes();
    }, []);

    // Fetch orders with server-side pagination
    useEffect(() => {
        if (!isReady) return;
        if (!profile?.userId) {
            setLoading(false);
            return;
        }

        async function fetchOrders() {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    lineUserId: profile!.userId,
                    page: String(currentPage),
                    limit: String(ITEMS_PER_PAGE),
                });
                if (selectedLotteryId !== 'all') {
                    params.set('lotteryTypeId', selectedLotteryId);
                }
                const res = await fetch(`/api/orders?${params}`);
                const result = await res.json();
                if (result.success) {
                    setOrders((result.data || []) as Order[]);
                    setTotalItems(result.pagination?.total || 0);
                }
            } catch (err) {
                console.warn('Failed to fetch orders from API:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [isReady, profile, currentPage, selectedLotteryId]);

    // Reset page when filter changes
    const handleLotteryFilter = (id: string) => {
        setSelectedLotteryId(id);
        setCurrentPage(1);
    };

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
                        ดูรายการฝากซื้อทั้งหมดของคุณ
                    </p>
                </div>
            </div>

            {/* Lottery Type Tabs */}
            {!loading && lotteryTypes.length > 0 && (
                <div style={{
                    display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto',
                    padding: '2px 0',
                }}>
                    <button
                        onClick={() => handleLotteryFilter('all')}
                        style={{
                            padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                            border: selectedLotteryId === 'all' ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: selectedLotteryId === 'all' ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--bg-card)',
                            color: selectedLotteryId === 'all' ? '#fff' : 'var(--text)',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: selectedLotteryId === 'all' ? '0 2px 8px rgba(59,89,152,0.25)' : 'none',
                        }}
                    >
                        🎰 ทั้งหมด
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


                        return (
                            <button
                                key={lt.id}
                                onClick={() => handleLotteryFilter(lt.id)}
                                style={{
                                    padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                    border: isActive ? 'none' : '1px solid var(--border)',
                                    background: isActive ? activeGrad : 'var(--bg-card)',
                                    color: isActive ? '#fff' : 'var(--text)',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    boxShadow: isActive ? activeShadow : 'none',
                                }}
                            >
                                {emoji} {lt.name}
                            </button>
                        );
                    })}
                </div>
            )}

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
                        ฝากซื้อ Lottery เลย!
                    </Link>
                </div>
            ) : (
                <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    {orders.map((order: Order, index: number): React.JSX.Element => {
                        const lotteryType = order.lottery_type as unknown as { name: string } | null;
                        const isPowerball = lotteryType?.name === 'Powerball';

                        return (
                        <div
                            key={order.id}
                            className="card fade-in"
                            style={{
                                animationDelay: `${index * 0.08}s`,
                                borderLeft: `4px solid ${isPowerball ? '#e74c3c' : '#f59e0b'}`,
                            }}
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
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                        {lotteryType?.name || 'Lottery'}
                                    </div>
                                </div>
                                <span className={`badge ${statusBadgeClass[order.status]}`}>
                                    {statusIcons[order.status]}
                                    {ORDER_STATUS_LABELS[order.status]}
                                </span>
                            </div>

                            {/* Draw date info */}
                            {order.draw_date && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    📅 งวดวันที่: {new Date(order.draw_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            )}

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
                                                    <span
                                                        className="number-ball mini special selected"
                                                        style={{
                                                            background: isPowerball
                                                                ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                                                : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                            color: isPowerball ? '#fff' : '#1a1a1a',
                                                        }}
                                                    >
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
                                            {order.draw_date && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                                    📅 งวดวันที่: {new Date(order.draw_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </div>
                                            )}
                                            {order.purchased_at && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    🛒 ซื้อเมื่อ: {formatDateTime(order.purchased_at)}
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
                                    ✅ ยืนยันการจ่ายแล้ว — กำลังดำเนินการซื้อ
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
                        );
                    })}
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={(page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
                </>
            )}
        </div>
    );
}
