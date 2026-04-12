'use client';

import { useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Upload, Camera, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useImageUpload } from '@/hooks/useImageUpload';

function UploadSlipContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const imageUpload = useImageUpload({ maxSizeMB: 1, maxWidthPx: 1920 });
    const [amount, setAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!imageUpload.file || !orderId) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('orderId', orderId);
            formData.append('slip', imageUpload.file);
            if (amount) formData.append('amount', amount);
            if (bankName) formData.append('bankName', bankName);

            const res = await fetch('/api/upload-slip', {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();
            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/order/history');
                }, 2000);
            } else {
                alert(result.error || 'อัปโหลดไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setUploading(false);
        }
    };

    if (success) {
        return (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <div className="bounce-in" style={{ marginBottom: 20 }}>
                    <CheckCircle size={64} color="var(--success)" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                    แนบสลิปสำเร็จ!
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    กำลังรอแอดมินตรวจสอบ...
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 12px' }}>
                <Link
                    href={orderId ? `/order/payment?orderId=${orderId}` : '/'}
                    style={{ color: 'var(--text)', display: 'flex' }}
                >
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700 }}>📎 แนบสลิปการโอน</h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        อัปโหลดสลิปเพื่อยืนยันการชำระเงิน
                    </p>
                </div>
            </div>

            {/* Upload Area */}
            <div
                className={`upload-area ${imageUpload.preview ? 'active' : ''}`}
                style={{ marginBottom: 16, cursor: imageUpload.isCompressing ? 'wait' : 'pointer' }}
                onClick={() => !imageUpload.isCompressing && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={imageUpload.onInputChange}
                    style={{ display: 'none' }}
                />

                {imageUpload.isCompressing ? (
                    <>
                        <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>กำลังปรับขนาดรูป...</p>
                    </>
                ) : imageUpload.preview ? (
                    <div className="slip-preview" style={{ margin: '0 auto' }}>
                        <img src={imageUpload.preview} alt="slip preview" />
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

            {imageUpload.error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--danger)' }}>
                    ⚠️ {imageUpload.error}
                </div>
            )}

            {imageUpload.sizeHint && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
                    📦 {imageUpload.sizeHint}
                </div>
            )}

            {imageUpload.preview && (
                <button
                    className="btn btn-outline btn-full"
                    style={{ marginBottom: 16, fontSize: 13 }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={16} />
                    เปลี่ยนรูป
                </button>
            )}

            {/* Additional Info */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                    ข้อมูลเพิ่มเติม (ไม่บังคับ)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            จำนวนเงินที่โอน
                        </label>
                        <input
                            className="input"
                            type="number"
                            placeholder="เช่น 300"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            ธนาคารที่โอน
                        </label>
                        <select
                            className="select"
                            value={bankName}
                            onChange={e => setBankName(e.target.value)}
                        >
                            <option value="">เลือกธนาคาร</option>
                            <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                            <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                            <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                            <option value="กรุงไทย">กรุงไทย (KTB)</option>
                            <option value="กรุงศรี">กรุงศรี (BAY)</option>
                            <option value="ทหารไทยธนชาต">ทหารไทยธนชาต (ttb)</option>
                            <option value="PromptPay">PromptPay</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Submit */}
            <button
                className="btn btn-success btn-full"
                style={{ padding: '14px 24px', fontSize: 16, marginBottom: 24 }}
                onClick={handleSubmit}
                disabled={!imageUpload.file || uploading || imageUpload.isCompressing}
            >
                {uploading ? (
                    <>
                        <Loader2 size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                        กำลังอัปโหลด...
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

export default function UploadSlipPage() {
    return (
        <Suspense fallback={<div style={{ padding: '60px 0', textAlign: 'center' }}><div className="loading-spinner" /></div>}>
            <UploadSlipContent />
        </Suspense>
    );
}
