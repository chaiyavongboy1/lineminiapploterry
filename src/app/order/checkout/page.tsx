'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import generatePayload from 'promptpay-qr';
import {
    ArrowLeft, Copy, Check, Camera, Upload,
    CheckCircle, Loader2, Ticket, History
} from 'lucide-react';
import { formatCurrency, formatDrawDate } from '@/lib/utils';
import { useImageUpload } from '@/hooks/useImageUpload';
import LoadingScreen from '@/components/LoadingScreen';

interface CheckoutLine {
    lineNumber: number;
    numbers: number[];
    specialNumber: number | null;
    isQuickPick: boolean;
}

interface CheckoutData {
    lotteryId: string;
    lotteryName: string;
    pricePerLine: number;
    serviceFee: number;
    lines: CheckoutLine[];
    drawDate: string;
    userId: string;
}

interface PaymentSettings {
    promptpayId: string;
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [step, setStep] = useState<'payment' | 'slip' | 'success'>('payment');
    const [data, setData] = useState<CheckoutData | null>(null);
    const [settings, setSettings] = useState<PaymentSettings | null>(null);
    const [copied, setCopied] = useState(false);
    const slipUpload = useImageUpload({ maxSizeMB: 1, maxWidthPx: 1920 });
    const [submitting, setSubmitting] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderCreated, setOrderCreated] = useState(false);
    const submittingRef = useRef(false);

    // Parse checkout data
    useEffect(() => {
        const raw = searchParams.get('data');
        if (!raw) {
            // No checkout data — redirect to home (prevents stale page access)
            if (!orderId) {
                router.replace('/');
            }
            return;
        }
        try {
            const decoded = JSON.parse(decodeURIComponent(atob(raw)));
            setData(decoded);
        } catch (err) {
            console.error('Failed to decode checkout data:', err);
            router.replace('/');
        }
    }, [searchParams, orderId, router]);

    // Load payment settings from Supabase
    useEffect(() => {
        async function loadSettings() {
            try {
                const res = await fetch('/api/settings?key=payment_settings');
                const result = await res.json();
                if (result.success && result.data) {
                    setSettings(result.data);
                } else {
                    // Fallback default
                    setSettings({
                        promptpayId: '0812345678',
                        bankName: 'กสิกรไทย (KBANK)',
                        accountNumber: '123-4-56789-0',
                        accountHolderName: 'America Lottery TH',
                    });
                }
            } catch {
                setSettings({
                    promptpayId: '0812345678',
                    bankName: 'กสิกรไทย (KBANK)',
                    accountNumber: '123-4-56789-0',
                    accountHolderName: 'America Lottery TH',
                });
            }
        }
        loadSettings();
    }, []);

    // useCallback MUST be before conditional returns (Rules of Hooks)
    const handleConfirmSlip = useCallback(async () => {
        // Guard: prevent double-clicks and re-submissions
        if (!slipUpload.file || !data || !settings || submittingRef.current || orderCreated) return;
        submittingRef.current = true;
        setSubmitting(true);

        // Compute totalAmount inside callback to avoid stale closures
        const lines = data.lines.length;
        const calcTotal = lines * data.pricePerLine + lines * data.serviceFee;

        try {
            // Step 1: Create order in Supabase
            const orderRes = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineUserId: data.userId,
                    lotteryTypeId: data.lotteryId,
                    drawDate: data.drawDate,
                    lines: data.lines.map(line => ({
                        numbers: line.numbers,
                        specialNumber: line.specialNumber,
                        isQuickPick: line.isQuickPick,
                    })),
                }),
            });

            const orderResult = await orderRes.json();
            if (!orderResult.success || !orderResult.data) {
                alert(orderResult.error || 'ไม่สามารถสร้างออร์เดอร์ได้');
                submittingRef.current = false;
                setSubmitting(false);
                return;
            }

            const createdOrder = orderResult.data;

            // Mark order as created to prevent re-submission
            setOrderCreated(true);

            // Step 2: Upload payment slip
            const formData = new FormData();
            formData.append('orderId', createdOrder.id);
            formData.append('slip', slipUpload.file!);
            formData.append('amount', String(calcTotal));
            formData.append('bankName', settings.bankName || '');

            const slipRes = await fetch('/api/upload-slip', {
                method: 'POST',
                body: formData,
            });

            const slipResult = await slipRes.json();
            if (!slipResult.success) {
                console.warn('Slip upload failed:', slipResult.error);
                // Order is still created, just mark as pending_payment
            }

            setOrderId(createdOrder.id);
            setOrderNumber(createdOrder.order_number);
            setStep('success');

            // Clear URL data to prevent refresh re-submission
            window.history.replaceState({}, '', '/order/checkout');
        } catch (err) {
            console.error('Checkout error:', err);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
            submittingRef.current = false;
        } finally {
            setSubmitting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, slipUpload.file, orderCreated, settings]);

    // Show loading while data/settings are not yet loaded
    if (!data || !settings) {
        return (
            <LoadingScreen title="ชำระเงิน" subtitle="กำลังโหลดข้อมูล..." />
        );
    }

    const totalLines = data.lines.length;
    const subtotal = totalLines * data.pricePerLine;
    const serviceFee = totalLines * data.serviceFee;
    const totalAmount = subtotal + serviceFee;

    // Generate PromptPay QR
    let qrData = '';
    try {
        qrData = generatePayload(settings.promptpayId, { amount: totalAmount });
    } catch {
        // If PromptPay generation fails, leave empty
    }

    const copyAccountNumber = () => {
        navigator.clipboard.writeText(settings.accountNumber.replace(/-/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ============ STEP 1: PAYMENT ============
    if (step === 'payment') {
        return (
            <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 12px' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700 }}>💳 ชำระเงิน</h1>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {data.lotteryName} • {totalLines} Lines
                        </p>
                    </div>
                </div>

                {/* Step Indicator */}
                <div style={{
                    display: 'flex', gap: 4, marginBottom: 20,
                }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                </div>

                {/* QR Code */}
                <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        padding: '14px 20px',
                        textAlign: 'center',
                    }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                            สแกน QR Code เพื่อชำระเงิน
                        </h2>
                    </div>
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: 20, background: '#fff',
                    }}>
                        {qrData ? (
                            <QRCode value={qrData} size={200} level="M" />
                        ) : (
                            <div style={{ width: 200, height: 200, background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                                กรุณาตั้งค่า PromptPay
                            </div>
                        )}
                        <div style={{
                            textAlign: 'center', color: '#666',
                            fontSize: 13, fontWeight: 600, marginTop: 8,
                        }}>
                            PromptPay QR Code
                        </div>
                    </div>
                </div>

                {/* Amount */}
                <div style={{
                    background: 'rgba(230, 126, 34, 0.08)',
                    border: '2px solid rgba(230, 126, 34, 0.25)',
                    borderRadius: 14,
                    padding: '14px 18px',
                    marginBottom: 16,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>ยอดที่ต้องชำระ</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
                        {formatCurrency(totalAmount)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>
                        คุณกำลังฝากซื้อ {data.lotteryName} ประจำงวดวันที่ {formatDrawDate(data.drawDate)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {totalLines} Lines × ฿{data.pricePerLine} + ค่าบริการ ฿{serviceFee}
                    </div>
                </div>

                {/* Bank Info */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                        🏦 ข้อมูลบัญชีรับโอน
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>ธนาคาร</span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{settings.bankName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>เลขบัญชี</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>
                                    {settings.accountNumber}
                                </span>
                                <button
                                    onClick={copyAccountNumber}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: copied ? 'var(--success)' : 'var(--text-muted)', padding: 4,
                                    }}
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>ชื่อบัญชี</span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{settings.accountHolderName}</span>
                        </div>
                    </div>
                </div>

                {/* Selected Numbers Summary */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                        🎫 เลขที่เลือก
                    </h3>
                    {data.lines.map(line => (
                        <div key={line.lineNumber} style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                        }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 30 }}>
                                L{line.lineNumber}:
                            </span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {line.numbers.map((n, i) => (
                                    <span key={i} className="number-ball mini selected">{n}</span>
                                ))}
                                {line.specialNumber !== null && (
                                    <span className="number-ball mini special selected">{line.specialNumber}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Warning */}
                <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                }}>
                    <p style={{ fontSize: 13, color: 'var(--warning)', lineHeight: 1.6 }}>
                        ⚠️ กรุณาโอนเงินตามยอดที่แสดง หลังโอนเงินแล้ว กดปุ่มด้านล่างเพื่อแนบสลิป
                    </p>
                </div>

                {/* Next Step */}
                <button
                    className="btn btn-accent btn-full"
                    style={{ padding: '14px 24px', fontSize: 16, marginBottom: 24 }}
                    onClick={() => setShowConfirmModal(true)}
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
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>ยืนยันการฝากซื้อ</h3>
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                    คุณกำลังฝากซื้อ
                                </p>
                                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                                    {data.lotteryName}
                                </p>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {totalLines} Lines • {formatCurrency(totalAmount)}
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
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        setStep('slip');
                                    }}
                                    className="btn btn-accent btn-full"
                                    style={{ flex: 1, padding: '12px', fontSize: 14 }}
                                >
                                    ตกลง
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============ STEP 2: UPLOAD SLIP ============
    if (step === 'slip') {
        return (
            <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 12px' }}>
                    <button onClick={() => setStep('payment')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700 }}>📎 แนบสลิปการโอน</h1>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            ยอดชำระ: {formatCurrency(totalAmount)}
                        </p>
                    </div>
                </div>

                {/* Step Indicator */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--success)' }} />
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                </div>

                {/* Upload Area */}
                <div
                    className={`upload-area ${slipUpload.preview ? 'active' : ''}`}
                    style={{ marginBottom: 16, cursor: slipUpload.isCompressing ? 'wait' : 'pointer' }}
                    onClick={() => !slipUpload.isCompressing && fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={slipUpload.onInputChange}
                        style={{ display: 'none' }}
                    />

                    {slipUpload.isCompressing ? (
                        <>
                            <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>กำลังปรับขนาดรูป...</p>
                        </>
                    ) : slipUpload.preview ? (
                        <div className="slip-preview" style={{ margin: '0 auto' }}>
                            <img src={slipUpload.preview} alt="slip preview" />
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 12 }}>
                                <Camera size={40} color="var(--text-muted)" />
                            </div>
                            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                                แตะเพื่อเลือกรูปสลิป
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                รองรับ JPG, PNG, WEBP (สูงสุด 15MB — ระบบจะปรับขนาดอัตโนมัติ)
                            </p>
                        </>
                    )}
                </div>

                {slipUpload.error && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--danger)' }}>
                        ⚠️ {slipUpload.error}
                    </div>
                )}

                {slipUpload.sizeHint && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
                        📦 {slipUpload.sizeHint}
                    </div>
                )}

                {slipUpload.preview && (
                    <button
                        className="btn btn-outline btn-full"
                        style={{ marginBottom: 16, fontSize: 13 }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={16} />
                        เปลี่ยนรูป
                    </button>
                )}

                {/* Submit */}
                <button
                    className="btn btn-success btn-full"
                    style={{ padding: '14px 24px', fontSize: 16, marginBottom: 24 }}
                    onClick={handleConfirmSlip}
                    disabled={!slipUpload.file || submitting || slipUpload.isCompressing || orderCreated}
                >
                    {submitting ? (
                        <>
                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                            กำลังบันทึก...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={20} />
                            ยืนยันแนบสลิป
                        </>
                    )}
                </button>
            </div>
        );
    }

    // ============ STEP 3: SUCCESS ============
    return (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
            {/* Step Indicator */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 30 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--success)' }} />
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--success)' }} />
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--success)' }} />
            </div>

            <div className="bounce-in" style={{ marginBottom: 20 }}>
                <CheckCircle size={72} color="var(--success)" />
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
                ฝากซื้อสำเร็จ! 🎉
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                รอแอดมินตรวจสอบสลิปการโอน
            </p>

            {/* Order Summary */}
            <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)',
                }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{orderNumber}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{data.lotteryName}</div>
                    </div>
                    <span style={{
                        background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6',
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    }}>
                        🔍 รอตรวจสอบ
                    </span>
                </div>

                {data.lines.map(line => (
                    <div key={line.lineNumber} style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                    }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36 }}>
                            L{line.lineNumber}:
                        </span>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {line.numbers.map((n, i) => (
                                <span key={i} className="number-ball mini selected">{n}</span>
                            ))}
                            {line.specialNumber !== null && (
                                <span className="number-ball mini special selected">{line.specialNumber}</span>
                            )}
                        </div>
                    </div>
                ))}

                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 12, borderTop: '1px solid var(--border)',
                }}>
                    <span style={{ fontWeight: 600 }}>{totalLines} Lines</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
                        {formatCurrency(totalAmount)}
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

export default function CheckoutPage() {
    return (
        <Suspense fallback={<LoadingScreen title="ชำระเงิน" subtitle="กำลังโหลด..." />}>
            <CheckoutContent />
        </Suspense>
    );
}
