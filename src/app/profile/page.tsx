'use client';

import { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import { ArrowLeft, Save, CheckCircle, Building2, CreditCard, Smartphone, User } from 'lucide-react';
import Link from 'next/link';
import type { UserProfile } from '@/types';

const BANK_OPTIONS = [
    'ธนาคารกสิกรไทย (KBANK)',
    'ธนาคารกรุงเทพ (BBL)',
    'ธนาคารกรุงไทย (KTB)',
    'ธนาคารไทยพาณิชย์ (SCB)',
    'ธนาคารกรุงศรีอยุธยา (BAY)',
    'ธนาคารทหารไทยธนชาต (TTB)',
    'ธนาคารออมสิน (GSB)',
    'ธนาคารเกียรตินาคินภัทร (KKP)',
    'ธนาคารซีไอเอ็มบี ไทย (CIMB)',
    'ธนาคารยูโอบี (UOB)',
    'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LHBANK)',
    'อื่นๆ',
];

export default function ProfilePage() {
    const { profile: lineProfile, isLoggedIn, isReady } = useLine();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [profileData, setProfileData] = useState<UserProfile | null>(null);

    // Form state
    const [fullName, setFullName] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [promptpayNumber, setPromptpayNumber] = useState('');

    useEffect(() => {
        async function fetchProfile() {
            if (!lineProfile?.userId) return;

            try {
                const res = await fetch(`/api/profile?lineUserId=${lineProfile.userId}`);
                const result = await res.json();

                if (result.success && result.data?.profile) {
                    const p = result.data.profile as UserProfile;
                    setProfileData(p);
                    setFullName(p.full_name || '');
                    setBankName(p.bank_name || '');
                    setBankAccountNumber(p.bank_account_number || '');
                    setPromptpayNumber(p.promptpay_number || '');
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            } finally {
                setLoading(false);
            }
        }

        if (isReady) {
            fetchProfile();
        }
    }, [isReady, lineProfile]);

    const handleSave = async () => {
        if (!lineProfile?.userId) return;
        setSaving(true);
        setSaved(false);

        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineUserId: lineProfile.userId,
                    fullName,
                    bankName,
                    bankAccountNumber,
                    promptpayNumber,
                }),
            });

            const result = await res.json();
            if (result.success) {
                setProfileData(result.data);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                alert(result.error || 'เกิดข้อผิดพลาด');
            }
        } catch {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    const isProfileComplete = fullName && bankName && (bankAccountNumber || promptpayNumber);

    if (!isReady || loading) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div className="loading-spinner" />
                <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 14 }}>กำลังโหลด...</p>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <User size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>กรุณาเข้าสู่ระบบ</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>เปิดผ่าน LINE Mini App เพื่อใช้งาน</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '20px 0 16px',
            }}>
                <Link href="/" style={{ color: 'var(--text)', display: 'flex' }}>
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700 }}>โปรไฟล์</h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>ข้อมูลส่วนตัวและธนาคาร</p>
                </div>
            </div>

            {/* LINE Profile Card */}
            <div className="card" style={{
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--bg-card)',
            }}>
                {lineProfile?.pictureUrl ? (
                    <img
                        src={lineProfile.pictureUrl}
                        alt={lineProfile.displayName}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid var(--primary)',
                        }}
                    />
                ) : (
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <User size={28} color="#fff" />
                    </div>
                )}
                <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{lineProfile?.displayName}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {lineProfile?.statusMessage || 'LINE User'}
                    </p>
                    {isProfileComplete ? (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--success)',
                            fontWeight: 600,
                            marginTop: 4,
                        }}>
                            <CheckCircle size={12} /> ข้อมูลครบถ้วน
                        </span>
                    ) : (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--warning)',
                            fontWeight: 600,
                            marginTop: 4,
                        }}>
                            ⚠️ กรุณากรอกข้อมูลธนาคาร
                        </span>
                    )}
                </div>
            </div>

            {/* Banking Information Form */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{
                    fontSize: 15,
                    fontWeight: 700,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <Building2 size={18} color="var(--primary)" />
                    ข้อมูลธนาคาร
                </h3>

                {/* Full Name */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        <User size={14} />
                        ชื่อ-สกุล (ตามบัญชีธนาคาร) <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                        className="input"
                        type="text"
                        placeholder="เช่น สมชาย สุขใจ"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                    />
                </div>

                {/* Bank Name */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        <Building2 size={14} />
                        ธนาคาร <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                        className="input"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                    >
                        <option value="">-- เลือกธนาคาร --</option>
                        {BANK_OPTIONS.map(bank => (
                            <option key={bank} value={bank}>{bank}</option>
                        ))}
                    </select>
                </div>

                {/* Bank Account Number */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        <CreditCard size={14} />
                        หมายเลขบัญชี
                    </label>
                    <input
                        className="input"
                        type="text"
                        placeholder="เช่น 123-456-7890"
                        value={bankAccountNumber}
                        onChange={e => setBankAccountNumber(e.target.value)}
                        inputMode="numeric"
                    />
                </div>

                {/* PromptPay */}
                <div style={{ marginBottom: 6 }}>
                    <label style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        <Smartphone size={14} />
                        หมายเลข PromptPay
                    </label>
                    <input
                        className="input"
                        type="text"
                        placeholder="เช่น 0812345678 หรือ 1234567890123"
                        value={promptpayNumber}
                        onChange={e => setPromptpayNumber(e.target.value)}
                        inputMode="numeric"
                    />
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
                    * กรุณากรอกหมายเลขบัญชี หรือ PromptPay อย่างน้อย 1 อย่าง
                </p>
            </div>

            {/* Save Button */}
            <button
                className="btn btn-primary btn-full"
                style={{ padding: '14px 24px', fontSize: 15, marginBottom: 40 }}
                onClick={handleSave}
                disabled={saving || !fullName || !bankName || (!bankAccountNumber && !promptpayNumber)}
            >
                {saving ? (
                    <>กำลังบันทึก...</>
                ) : saved ? (
                    <><CheckCircle size={18} /> บันทึกสำเร็จ!</>
                ) : (
                    <><Save size={18} /> บันทึกข้อมูล</>
                )}
            </button>

            {saved && (
                <div style={{
                    textAlign: 'center',
                    padding: '12px 16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 12,
                    color: 'var(--success)',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 20,
                }}>
                    ✅ บันทึกข้อมูลธนาคารเรียบร้อยแล้ว
                </div>
            )}
        </div>
    );
}
