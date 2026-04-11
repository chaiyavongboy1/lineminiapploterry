'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLine } from '@/components/LineProvider';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/types';
import type { Order, OrderStatus } from '@/types';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Camera, Upload, Package } from 'lucide-react';
import Link from 'next/link';

const statusBadgeClass: Record<OrderStatus, string> = {
    pending_payment: 'badge-pending',
    pending_slip: 'badge-pending',
    pending_review: 'badge-review',
    approved: 'badge-approved',
    completed: 'badge-approved',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled',
};

export default function AdminOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { profile } = useLine();
    const ticketInputRef = useRef<HTMLInputElement>(null);

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [adminNote, setAdminNote] = useState('');
    const [ticketPreviews, setTicketPreviews] = useState<string[]>([]);
    const [ticketFiles, setTicketFiles] = useState<File[]>([]);

    useEffect(() => {
        // Don't run until LINE profile is ready
        if (!profile?.userId) return;
        const userId = profile.userId;

        async function fetchOrder() {
            const orderId = params.id as string;

            try {
                const res = await fetch(
                    `/api/admin/orders/${orderId}?adminLineUserId=${userId}`
                );
                const result = await res.json();
                if (result.success && result.data) {
                    setOrder(result.data as Order);
                } else {
                    console.error('Order API error:', result.error);
                }
            } catch (err) {
                console.error('Failed to fetch order:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrder();
    }, [params.id, profile]);

    const handleApprove = async () => {
        if (!order) return;
        setProcessing(true);

        try {
            const res = await fetch('/api/admin/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    action: 'approve',
                    adminNote: adminNote || undefined,
                    adminLineUserId: profile?.userId,
                }),
            });
            const result = await res.json();
            if (result.success) {
                router.push('/admin/orders');
                router.refresh();
            } else {
                alert(result.error || 'เกิดข้อผิดพลาด');
            }
        } catch {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!order) return;
        setProcessing(true);

        try {
            const res = await fetch('/api/admin/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    action: 'reject',
                    adminNote: adminNote || undefined,
                    adminLineUserId: profile?.userId,
                }),
            });
            const result = await res.json();
            if (result.success) {
                router.push('/admin/orders');
                router.refresh();
            } else {
                alert(result.error || 'เกิดข้อผิดพลาด');
            }
        } catch {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setProcessing(false);
        }
    };

    const handleTicketUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setTicketFiles(prev => [...prev, ...files]);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => setTicketPreviews(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const removeTicketImage = (index: number) => {
        setTicketFiles(prev => prev.filter((_, i) => i !== index));
        setTicketPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleComplete = async () => {
        if (!order || ticketFiles.length === 0) return;
        setProcessing(true);

        try {
            const formData = new FormData();
            formData.append('orderId', order.id);
            ticketFiles.forEach(file => formData.append('ticketImages', file));
            if (adminNote) formData.append('adminNote', adminNote);
            formData.append('adminLineUserId', profile?.userId || '');

            const res = await fetch('/api/admin/complete', {
                method: 'POST',
                body: formData,
            });
            const result = await res.json();
            if (result.success) {
                router.push('/admin/orders');
                router.refresh();
            } else {
                alert(result.error || 'เกิดข้อผิดพลาด');
            }
        } catch {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p>ไม่พบออร์เดอร์</p>
                <Link href="/admin/orders" className="btn btn-primary" style={{ marginTop: 16 }}>
                    กลับ
                </Link>
            </div>
        );
    }

    const lotteryType = order.lottery_type as unknown as { name: string } | null;
    const paymentSlips = (order as unknown as { payment_slips?: { slip_image_url: string }[] }).payment_slips;
    const ticketImage = order.ticket_image;
    const ticketImages = order.ticket_images || [];
    const customerUser = order.user as unknown as { display_name: string; line_user_id: string } | null;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Link href="/admin/orders" style={{ color: 'var(--text)', display: 'flex' }}>
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 700 }}>รายละเอียดออร์เดอร์</h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.order_number}</p>
                </div>
                <span className={`badge ${statusBadgeClass[order.status]}`} style={{ marginLeft: 'auto' }}>
                    {ORDER_STATUS_LABELS[order.status]}
                </span>
            </div>

            {/* Order Info */}
            <div className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🎰 ข้อมูลออร์เดอร์</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {customerUser && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>ลูกค้า</span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{customerUser.display_name || customerUser.line_user_id}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>ประเภท</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{lotteryType?.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>งวด</span>
                        <span style={{ fontSize: 14 }}>{order.draw_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>จำนวน Lines</span>
                        <span style={{ fontSize: 14 }}>{order.total_lines}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>สั่งซื้อเมื่อ</span>
                        <span style={{ fontSize: 14 }}>{formatDateTime(order.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700 }}>ยอดรวม</span>
                        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>
                            {formatCurrency(order.total_amount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Selected Numbers */}
            {order.order_lines && order.order_lines.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🔢 เลขที่เลือก</h3>
                    {order.order_lines.map(line => (
                        <div key={line.id || line.line_number} style={{
                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                        }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 40 }}>
                                Line {line.line_number}:
                            </span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {line.numbers.map((n, i) => (
                                    <span key={i} className="number-ball mini selected">{n}</span>
                                ))}
                                {line.special_number !== null && (
                                    <span className="number-ball mini special selected">{line.special_number}</span>
                                )}
                            </div>
                            {line.is_quick_pick && (
                                <span style={{
                                    fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg)',
                                    padding: '2px 6px', borderRadius: 4,
                                }}>QP</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Slip from Supabase */}
            {paymentSlips && paymentSlips.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🧾 สลิปการโอน</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {paymentSlips.map((slip, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px',
                                background: 'rgba(59,130,246,0.06)',
                                border: '1px solid rgba(59,130,246,0.18)',
                                borderRadius: 10,
                            }}>
                                <span style={{ fontSize: 18 }}>🧾</span>
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    สลิป {i + 1}
                                </span>
                                <a
                                    href={slip.slip_image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                    style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
                                >
                                    🔍 เปิดดู
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ticket Images (multi-image for completed orders) */}
            {ticketImages.length > 0 ? (
                <div className="card" style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🎫 รูป Lottery ({ticketImages.length} รูป)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ticketImages.map((ti: { id: string; image_url: string }, i: number) => (
                            <div key={ti.id || i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px',
                                background: 'rgba(16,185,129,0.06)',
                                border: '1px solid rgba(16,185,129,0.18)',
                                borderRadius: 10,
                            }}>
                                <span style={{ fontSize: 18 }}>🎫</span>
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    รูปที่ {i + 1}
                                </span>
                                <a
                                    href={ti.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                    style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
                                >
                                    🔍 เปิดดู
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            ) : ticketImage ? (
                <div className="card" style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🎫 รูป Lottery</h3>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        background: 'rgba(16,185,129,0.06)',
                        border: '1px solid rgba(16,185,129,0.18)',
                        borderRadius: 10,
                    }}>
                        <span style={{ fontSize: 18 }}>🎫</span>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>รูป Lottery</span>
                        <a
                            href={ticketImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
                        >
                            🔍 เปิดดู
                        </a>
                    </div>
                </div>
            ) : null}

            {/* ===== ADMIN ACTIONS ===== */}

            {/* Step 1: pending_review → approve or reject */}
            {order.status === 'pending_review' && (
                <div className="card" style={{
                    marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(139, 92, 246, 0.02))',
                    border: '2px solid rgba(139, 92, 246, 0.2)',
                }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                        ⚡ ตรวจสอบและดำเนินการ
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                        ตรวจสอบสลิปการโอนแล้วเลือกดำเนินการ
                    </p>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            หมายเหตุ (ไม่บังคับ)
                        </label>
                        <textarea
                            className="input"
                            placeholder="เช่น สลิปถูกต้อง, ยอดไม่ตรง ฯลฯ"
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            className="btn btn-success"
                            style={{ flex: 1, padding: '12px 16px' }}
                            onClick={handleApprove}
                            disabled={processing}
                        >
                            {processing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                            ✅ ยืนยันการจ่าย
                        </button>
                        <button
                            className="btn btn-danger"
                            style={{ flex: 1, padding: '12px 16px' }}
                            onClick={handleReject}
                            disabled={processing}
                        >
                            {processing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={16} />}
                            ❌ ปฏิเสธการจ่าย
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: approved → complete + attach ticket image */}
            {order.status === 'approved' && (
                <div className="card" style={{
                    marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(37, 99, 235, 0.02))',
                    border: '2px solid rgba(37, 99, 235, 0.2)',
                }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                        🎫 ซื้อหวยจริงและแนบรูป
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        ไปซื้อหวยตามเลขที่ลูกค้าเลือก แล้วถ่ายรูป Lottery แนบ
                    </p>

                    {/* Multi-Ticket Upload */}
                    <div
                        onClick={() => ticketInputRef.current?.click()}
                        className="upload-area"
                        style={{ marginBottom: 12 }}
                    >
                        <input
                            ref={ticketInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleTicketUpload}
                            style={{ display: 'none' }}
                        />
                        <Camera size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            📸 แตะเพื่อแนบรูป Lottery (หลายรูปได้)
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            เลือกได้หลายรูปพร้อมกัน
                        </p>
                    </div>

                    {/* File list preview (no image preload) */}
                    {ticketPreviews.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                            {ticketFiles.map((file, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 12px',
                                    background: 'rgba(59,130,246,0.06)',
                                    border: '1px solid rgba(59,130,246,0.18)',
                                    borderRadius: 10,
                                }}>
                                    <span style={{ fontSize: 16 }}>📄</span>
                                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {file.name}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeTicketImage(i); }}
                                        style={{
                                            width: 28, height: 28, borderRadius: '50%',
                                            background: 'rgba(239,68,68,0.9)',
                                            border: 'none', color: '#fff',
                                            cursor: 'pointer', fontSize: 14,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {ticketPreviews.length > 0 && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' }}>
                            📎 {ticketFiles.length} รูป — แตะด้านบนเพื่อเพิ่มอีก
                        </p>
                    )}

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            หมายเหตุ (ไม่บังคับ)
                        </label>
                        <textarea
                            className="input"
                            placeholder="เช่น ซื้อจาก 7-Eleven สาขา..."
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <button
                        className="btn btn-success btn-full"
                        style={{ padding: '14px 24px', fontSize: 15 }}
                        onClick={handleComplete}
                        disabled={processing || ticketFiles.length === 0}
                    >
                        {processing ? (
                            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> กำลังบันทึก...</>
                        ) : (
                            <><Package size={18} /> 🎉 ซื้อสินค้าแล้ว ({ticketFiles.length} รูป)</>
                        )}
                    </button>

                    {ticketFiles.length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--warning)', textAlign: 'center', marginTop: 8 }}>
                            ⚠️ กรุณาแนบรูป Lottery อย่างน้อย 1 รูปก่อนกดซื้อสินค้าแล้ว
                        </p>
                    )}
                </div>
            )}

            {/* Completed status display */}
            {order.status === 'completed' && (
                <div className="card" style={{
                    marginBottom: 24,
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                    <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={18} color="var(--success)" />
                        <span style={{ fontWeight: 600 }}>ซื้อสินค้าแล้ว</span>
                        {order.purchased_at && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>เมื่อ {formatDateTime(order.purchased_at)}</span>}
                    </div>
                    {order.admin_note && (
                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                            💬 {order.admin_note}
                        </div>
                    )}
                </div>
            )}

            {/* Rejected status display */}
            {order.status === 'rejected' && (
                <div className="card" style={{
                    marginBottom: 24,
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                }}>
                    <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <XCircle size={18} color="var(--danger)" />
                        <span style={{ fontWeight: 600 }}>ปฏิเสธการจ่าย</span>
                        {order.reviewed_at && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>เมื่อ {formatDateTime(order.reviewed_at)}</span>}
                    </div>
                    {order.admin_note && (
                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                            💬 {order.admin_note}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
