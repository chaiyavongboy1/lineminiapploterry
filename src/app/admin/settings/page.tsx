'use client';

import { useState, useEffect } from 'react';
import { Save, CreditCard, Building2, User, Phone, CheckCircle, Loader2, Percent, DollarSign } from 'lucide-react';

interface PaymentSettings {
    promptpayId: string;
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
}

interface TaxSettings {
    taxRate: string;       // % เช่น "30" = 30%
    exchangeRate: string;  // 1 USD = ? THB เช่น "35.5"
}

const defaultSettings: PaymentSettings = {
    promptpayId: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
};

const defaultTaxSettings: TaxSettings = {
    taxRate: '',
    exchangeRate: '',
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
    const [taxSettings, setTaxSettings] = useState<TaxSettings>(defaultTaxSettings);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [taxSaved, setTaxSaved] = useState(false);
    const [taxSaving, setTaxSaving] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            try {
                const [resPayment, resTax] = await Promise.all([
                    fetch('/api/settings?key=payment_settings'),
                    fetch('/api/settings?key=tax_settings'),
                ]);
                const resultPayment = await resPayment.json();
                const resultTax = await resTax.json();
                if (resultPayment.success && resultPayment.data) {
                    setSettings(resultPayment.data);
                }
                if (resultTax.success && resultTax.data) {
                    setTaxSettings(resultTax.data);
                }
            } catch (err) {
                console.warn('Failed to load settings:', err);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'payment_settings', value: settings }),
            });
            const result = await res.json();
            if (result.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            } else {
                alert('บันทึกไม่สำเร็จ: ' + result.error);
            }
        } catch {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveTax = async () => {
        setTaxSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'tax_settings', value: taxSettings }),
            });
            const result = await res.json();
            if (result.success) {
                setTaxSaved(true);
                setTimeout(() => setTaxSaved(false), 2500);
            } else {
                alert('บันทึกไม่สำเร็จ: ' + result.error);
            }
        } catch {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setTaxSaving(false);
        }
    };

    const update = (field: keyof PaymentSettings, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const updateTax = (field: keyof TaxSettings, value: string) => {
        setTaxSettings(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                ⚙️ ตั้งค่าการชำระเงิน
            </h2>

            {/* PromptPay Settings */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <CreditCard size={18} color="var(--primary)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>PromptPay</h3>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                        <Phone size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        หมายเลข PromptPay (เบอร์โทร / เลขบัตรประชาชน)
                    </label>
                    <input
                        className="input"
                        type="text"
                        placeholder="เช่น 0812345678"
                        value={settings.promptpayId}
                        onChange={e => update('promptpayId', e.target.value)}
                    />
                </div>
            </div>

            {/* Bank Account Settings */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Building2 size={18} color="var(--primary)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>บัญชีธนาคาร</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            ชื่อธนาคาร
                        </label>
                        <select
                            className="select"
                            value={settings.bankName}
                            onChange={e => update('bankName', e.target.value)}
                        >
                            <option value="">เลือกธนาคาร</option>
                            <option value="กสิกรไทย (KBANK)">กสิกรไทย (KBANK)</option>
                            <option value="ไทยพาณิชย์ (SCB)">ไทยพาณิชย์ (SCB)</option>
                            <option value="กรุงเทพ (BBL)">กรุงเทพ (BBL)</option>
                            <option value="กรุงไทย (KTB)">กรุงไทย (KTB)</option>
                            <option value="กรุงศรี (BAY)">กรุงศรี (BAY)</option>
                            <option value="ทหารไทยธนชาต (ttb)">ทหารไทยธนชาต (ttb)</option>
                            <option value="ออมสิน (GSB)">ออมสิน (GSB)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            เลขบัญชี
                        </label>
                        <input
                            className="input"
                            type="text"
                            placeholder="เช่น 123-4-56789-0"
                            value={settings.accountNumber}
                            onChange={e => update('accountNumber', e.target.value)}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            <User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            ชื่อเจ้าของบัญชี
                        </label>
                        <input
                            className="input"
                            type="text"
                            placeholder="เช่น บริษัท America Lottery TH"
                            value={settings.accountHolderName}
                            onChange={e => update('accountHolderName', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Save Payment Button */}
            <button
                className="btn btn-primary btn-full"
                style={{ padding: '14px 24px', fontSize: 15, marginBottom: 16 }}
                onClick={handleSave}
                disabled={saving}
            >
                {saved ? (
                    <>
                        <CheckCircle size={18} />
                        บันทึกเรียบร้อย!
                    </>
                ) : saving ? (
                    <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        กำลังบันทึก...
                    </>
                ) : (
                    <>
                        <Save size={18} />
                        บันทึกการตั้งค่า
                    </>
                )}
            </button>

            {/* Info Note */}
            <div style={{
                background: 'rgba(59, 89, 152, 0.06)',
                border: '1px solid rgba(59, 89, 152, 0.15)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                marginBottom: 24,
            }}>
                💡 ข้อมูลเหล่านี้จะแสดงให้ลูกค้าเห็นในหน้าชำระเงิน และใช้สร้าง QR Code PromptPay อัตโนมัติ
            </div>

            {/* ---- Tax & Exchange Rate Settings ---- */}
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                💰 ตั้งค่าภาษีและเรทเงิน
            </h2>

            {/* Tax Rate */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Percent size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>อัตราภาษี</h3>
                </div>

                <div>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                        ภาษีหัก ณ ที่จ่าย / ภาษีรางวัล (%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            className="input"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="เช่น 30"
                            value={taxSettings.taxRate}
                            onChange={e => updateTax('taxRate', e.target.value)}
                            style={{ maxWidth: 160 }}
                        />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                        ใช้แสดงข้อมูลในออร์เดอร์ที่ถูกรางวัล เพื่อแจ้งผู้ใช้ว่าต้องเสียภาษีเท่าไหร่
                    </p>
                </div>
            </div>

            {/* Exchange Rate */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <DollarSign size={18} color="var(--success)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>เรทเงิน USD → THB</h3>
                </div>

                <div>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                        1 USD เท่ากับกี่บาท (฿)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)' }}>$1 =</span>
                        <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="เช่น 35.50"
                            value={taxSettings.exchangeRate}
                            onChange={e => updateTax('exchangeRate', e.target.value)}
                            style={{ maxWidth: 160 }}
                        />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)' }}>฿</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                        ใช้แสดงในออร์เดอร์ที่ถูกรางวัล เพื่อบอกผู้ใช้ว่าเรทปัจจุบันเป็นเท่าไหร่
                    </p>
                </div>
            </div>

            {/* Preview */}
            {(taxSettings.taxRate || taxSettings.exchangeRate) && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 16,
                    fontSize: 13,
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--success)' }}>👁️ ตัวอย่างที่จะแสดงในออร์เดอร์ที่ถูกรางวัล:</div>
                    {taxSettings.taxRate && (
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
                            🧾 ภาษี: <strong>{taxSettings.taxRate}%</strong> ของมูลค่ารางวัล
                        </div>
                    )}
                    {taxSettings.exchangeRate && (
                        <div style={{ color: 'var(--text-muted)' }}>
                            💱 เรทเงิน: <strong>$1 = ฿{taxSettings.exchangeRate}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* Save Tax Button */}
            <button
                className="btn btn-full"
                style={{
                    padding: '14px 24px',
                    fontSize: 15,
                    marginBottom: 16,
                    background: 'linear-gradient(135deg, var(--success), #27ae60)',
                    color: '#fff',
                    border: 'none',
                }}
                onClick={handleSaveTax}
                disabled={taxSaving}
            >
                {taxSaved ? (
                    <>
                        <CheckCircle size={18} />
                        บันทึกเรียบร้อย!
                    </>
                ) : taxSaving ? (
                    <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        กำลังบันทึก...
                    </>
                ) : (
                    <>
                        <Save size={18} />
                        บันทึกภาษีและเรทเงิน
                    </>
                )}
            </button>

            <div style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
            }}>
                💡 ภาษีและเรทเงินจะแสดงเป็น memo ในหน้าออร์เดอร์ที่ถูกรางวัล เพื่อให้ผู้ใช้ทราบข้อมูลที่จำเป็น
            </div>
        </div>
    );
}
