'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Ticket, History, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLine } from '@/components/LineProvider';
import LoadingScreen from '@/components/LoadingScreen';

interface OrderData {
    id: string;
    order_number: string;
    lottery_type: { name: string };
    total_lines: number;
    total_amount: number;
    status: string;
    order_lines: {
        id: string;
        line_number: number;
        numbers: number[];
        special_number: number | null;
    }[];
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const { profile } = useLine();
    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrder() {
            if (!orderId) {
                setLoading(false);
                return;
            }

            // Fetch from API
            try {
                const res = await fetch(`/api/orders?lineUserId=${profile?.userId || ''}`);
                const result = await res.json();
                if (result.success && result.data) {
                    const found = result.data.find((o: OrderData) => o.id === orderId);
                    if (found) {
                        setOrder(found);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch order:', err);
            }

            setLoading(false);
        }

        fetchOrder();
    }, [orderId, profile?.userId]);

    if (loading) {
        return (
            <LoadingScreen title="สำเร็จ" subtitle="กำลังโหลดข้อมูล..." />
        );
    }

    if (!order) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>ไม่พบข้อมูลออร์เดอร์</p>
                <Link href="/order/history" className="btn btn-primary" style={{ marginTop: 16 }}>
                    ดูประวัติออร์เดอร์
                </Link>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
            {/* Success Icon */}
            <div className="bounce-in" style={{ marginBottom: 20 }}>
                <CheckCircle size={72} color="var(--success)" />
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
                ฝากซื้อสำเร็จ! 🎉
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                รอแอดมินตรวจสอบสลิปการโอน
            </p>

            {/* Order Summary Card */}
            <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--border)',
                }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {order.order_number}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                            {order.lottery_type?.name || 'Lottery'}
                        </div>
                    </div>
                    <span style={{
                        background: 'rgba(139, 92, 246, 0.12)',
                        color: '#8b5cf6',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                    }}>
                        🔍 รอตรวจสอบ
                    </span>
                </div>

                {/* Order Lines */}
                <div style={{ marginBottom: 14 }}>
                    {order.order_lines.map((line) => (
                        <div key={line.id || line.line_number} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 8,
                        }}>
                            <span style={{
                                fontSize: 11,
                                color: 'var(--text-muted)',
                                width: 36,
                                flexShrink: 0,
                            }}>
                                L{line.line_number}:
                            </span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {line.numbers.map((n, i) => (
                                    <span key={i} className="number-ball mini selected">{n}</span>
                                ))}
                                {line.special_number !== null && (
                                    <span className="number-ball mini special selected">
                                        {line.special_number}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                }}>
                    <span style={{ fontWeight: 600 }}>
                        {order.total_lines} Lines
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
                        {formatCurrency(order.total_amount)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/order/history" className="btn btn-primary btn-full" style={{ fontSize: 15, padding: '14px 24px' }}>
                    📋 ดูประวัติออร์เดอร์
                </Link>
                <Link href="/" className="btn btn-outline btn-full" style={{ fontSize: 15, padding: '14px 24px' }}>
                    🎫 ฝากซื้อ Lottery เพิ่ม
                </Link>
            </div>
        </div>
    );
}

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<LoadingScreen title="สำเร็จ" subtitle="กำลังโหลด..." />}>
            <SuccessContent />
        </Suspense>
    );
}
