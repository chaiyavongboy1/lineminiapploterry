'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'react-qr-code';
import generatePayload from 'promptpay-qr';
import { ArrowLeft, Copy, Check, Upload, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Order } from '@/types';
import Link from 'next/link';

function PaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId');
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [qrData, setQrData] = useState('');
    const [bankSettings, setBankSettings] = useState({ bankName: '', accountNumber: '', accountHolderName: '', promptpayId: '' });
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        async function fetchOrder() {
            if (!orderId) return;
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('orders')
                    .select('*, lottery_type:lottery_types(name), order_lines(*)')
                    .eq('id', orderId)
                    .single();

                if (data) {
                    setOrder(data as unknown as Order);
                    // Load payment settings for QR
                    try {
                        const res = await fetch('/api/settings?key=payment_settings');
                        const result = await res.json();
                        let promptPayId = '0812345678';
                        if (result.success && result.data) {
                            setBankSettings(result.data);
                            promptPayId = result.data.promptpayId || promptPayId;
                        }
                        const payload = generatePayload(promptPayId, { amount: Number(data.total_amount) });
                        setQrData(payload);
                    } catch {
                        const payload = generatePayload('0812345678', { amount: Number(data.total_amount) });
                        setQrData(payload);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch order:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrder();
    }, [orderId]);

    const copyAccountNumber = () => {
        navigator.clipboard.writeText(bankSettings.accountNumber || '1234567890');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTransferClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmTransfer = () => {
        setShowConfirmModal(false);
        router.push(`/order/upload-slip?orderId=${order!.id}`);
    };

    const lotteryName = (order?.lottery_type as unknown as { name: string } | null)?.name || 'Lottery';

    if (loading) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <p>ไม่พบออร์เดอร์</p>
                <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>กลับหน้าหลัก</Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 12px' }}>
                <Link href="/" style={{ color: 'var(--text)', display: 'flex' }}>
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700 }}>💳 ชำระเงิน</h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {lotteryName} • {order.total_lines} Lines
                    </p>
                </div>
            </div>

            {/* QR Code */}
            <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
                <div style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    padding: '16px 20px',
                    textAlign: 'center',
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>สแกน QR Code เพื่อชำระเงิน</h2>
                </div>
                <div className="qr-container" style={{ margin: 20, borderRadius: 16 }}>
                    {qrData ? (
                        <QRCode value={qrData} size={220} level="M" />
                    ) : (
                        <div style={{ width: 220, height: 220, background: '#f0f0f0', borderRadius: 8 }} />
                    )}
                    <div style={{
                        textAlign: 'center',
                        color: '#333',
                        fontSize: 13,
                        fontWeight: 600,
                        marginTop: 4,
                    }}>
                        PromptPay QR Code
                    </div>
                </div>
            </div>

            {/* Amount Card */}
            <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ยอดที่ต้องชำระ</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>
                    {formatCurrency(order.total_amount)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {order.total_lines} Lines × {formatCurrency(order.subtotal / order.total_lines)} + ค่าบริการ {formatCurrency(order.service_fee)}
                </div>
            </div>

            {/* Bank Account Info */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                    🏦 ข้อมูลบัญชีรับโอน
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>ธนาคาร</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{bankSettings.bankName || 'กสิกรไทย (KBANK)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>เลขบัญชี</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>
                                {bankSettings.accountNumber || '123-4-56789-0'}
                            </span>
                            <button
                                onClick={copyAccountNumber}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: copied ? 'var(--success)' : 'var(--text-muted)',
                                    padding: 4,
                                }}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>ชื่อบัญชี</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{bankSettings.accountHolderName || 'American Lottery TH'}</span>
                    </div>
                </div>
            </div>

            {/* Selected Numbers */}
            {order.order_lines && order.order_lines.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
                        🎟️ เลขที่เลือก
                    </h3>
                    {order.order_lines.map((line) => (
                        <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 30 }}>L{line.line_number}:</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {line.numbers.map((n, i) => (
                                    <span key={i} className="number-ball mini selected">{n}</span>
                                ))}
                                {line.special_number !== null && (
                                    <span className="number-ball mini special selected">{line.special_number}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Warning */}
            <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
            }}>
                <p style={{ fontSize: 13, color: 'var(--warning)', lineHeight: 1.6 }}>
                    ⚠️ กรุณาโอนเงินตามยอดที่แสดง หลังโอนเงินแล้ว กดปุ่มด้านล่างเพื่อแนบสลิป
                </p>
            </div>

            {/* Upload Slip Button */}
            <button
                className="btn btn-accent btn-full"
                style={{ padding: '14px 24px', fontSize: 16, marginBottom: 16 }}
                onClick={handleTransferClick}
            >
                <Upload size={20} />
                โอนแล้ว → แนบสลิป
            </button>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 24px',
                }}>
                    <div className="card" style={{
                        width: '100%',
                        maxWidth: 360,
                        padding: 24,
                        borderRadius: 20,
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        {/* Close */}
                        <button
                            onClick={() => setShowConfirmModal(false)}
                            style={{
                                position: 'absolute',
                                top: 16, right: 16,
                                background: 'none', border: 'none',
                                cursor: 'pointer', color: 'var(--text-muted)',
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* Icon */}
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: 'rgba(230,126,34,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 12px',
                                fontSize: 30,
                            }}>
                                🎟️
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>ยืนยันการซื้อ</h3>
                            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                คุณกำลังซื้อ
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                                {lotteryName}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                {order.total_lines} Lines • {formatCurrency(order.total_amount)}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="btn btn-full"
                                style={{
                                    flex: 1,
                                    background: 'var(--bg)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    padding: '12px',
                                    fontSize: 14,
                                }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmTransfer}
                                className="btn btn-accent btn-full"
                                style={{ flex: 1, padding: '12px', fontSize: 14 }}
                            >
                                ตกลง → แนบสลิป
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div style={{ padding: '60px 0', textAlign: 'center' }}><div className="loading-spinner" /></div>}>
            <PaymentContent />
        </Suspense>
    );
}
