'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { LotteryType } from '@/types';
import { Edit2, Save, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function AdminLotteryTypesPage() {
    const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<LotteryType>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLotteryTypes();
    }, []);

    async function fetchLotteryTypes() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/lottery-types');
            const result = await res.json();

            if (result.success && result.data) {
                setLotteryTypes(result.data as LotteryType[]);
            } else {
                setError(result.error || 'ไม่สามารถโหลดข้อมูลได้');
            }
        } catch (err) {
            console.error('Failed to fetch lottery types:', err);
            setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(id: string) {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/lottery-types', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...editForm }),
            });

            const result = await res.json();

            if (result.success && result.data) {
                // Update local state with the response from DB
                setLotteryTypes(prev =>
                    prev.map(lt => lt.id === id ? { ...lt, ...result.data } : lt)
                );
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                setEditing(null);
            } else {
                setError(result.error || 'บันทึกไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Failed to save lottery type:', err);
            setError('ไม่สามารถบันทึกได้ กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(id: string) {
        const current = lotteryTypes.find(lt => lt.id === id);
        if (!current) return;

        try {
            const res = await fetch('/api/admin/lottery-types', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: !current.is_active }),
            });

            const result = await res.json();

            if (result.success) {
                setLotteryTypes(prev =>
                    prev.map(lt => lt.id === id ? { ...lt, is_active: !lt.is_active } : lt)
                );
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                setError(result.error || 'อัพเดทไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Failed to toggle active:', err);
            setError('ไม่สามารถอัพเดทได้');
        }
    }

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>🎰 จัดการประเภท Lottery</h2>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10, padding: '8px 14px', marginBottom: 12,
                    fontSize: 13, color: 'var(--danger)', textAlign: 'center',
                }}>
                    ❌ {error}
                </div>
            )}

            {saved && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 10, padding: '8px 14px', marginBottom: 12,
                    fontSize: 13, color: 'var(--success)', textAlign: 'center',
                }}>
                    ✅ บันทึกลงฐานข้อมูลเรียบร้อย! ราคาจะอัพเดทในหน้าผู้ใช้ทันที
                </div>
            )}

            {/* Lottery Type Cards */}
            {lotteryTypes.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)' }}>ไม่พบประเภท Lottery</p>
                </div>
            ) : (
                lotteryTypes.map(lt => (
                    <div key={lt.id} className="card" style={{
                        marginBottom: 12,
                        borderLeft: lt.is_active ? '4px solid var(--success)' : '4px solid var(--border)',
                        opacity: lt.is_active ? 1 : 0.6,
                    }}>
                        {editing === lt.id ? (
                            /* === EDITING MODE === */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>✏️ แก้ไข {lt.name}</h3>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>คำอธิบาย</label>
                                    <textarea 
                                        className="input" 
                                        rows={2}
                                        style={{ height: 'auto', padding: '10px' }}
                                        value={editForm.description || ''} 
                                        onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} 
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>💰 ราคาต่อ Line (บาท)</label>
                                        <input className="input" type="number" value={editForm.price_per_line || 0} onChange={e => setEditForm(p => ({ ...p, price_per_line: Number(e.target.value) }))} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>🔧 ค่าบริการ (บาท)</label>
                                        <input className="input" type="number" value={editForm.service_fee || 0} onChange={e => setEditForm(p => ({ ...p, service_fee: Number(e.target.value) }))} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <button className="btn btn-success" style={{ flex: 1, fontSize: 13 }} onClick={() => handleSave(lt.id)} disabled={saving}>
                                        {saving ? (
                                            <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> กำลังบันทึก...</>
                                        ) : (
                                            <><Save size={14} /> บันทึกลงฐานข้อมูล</>
                                        )}
                                    </button>
                                    <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setEditing(null)} disabled={saving}>
                                        <X size={14} /> ยกเลิก
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* === VIEW MODE === */
                            <>
                                <div
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setExpandedId(expandedId === lt.id ? null : lt.id)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{lt.name}</h3>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{lt.description}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleActive(lt.id); }}
                                                style={{
                                                    background: lt.is_active ? 'var(--success)' : 'var(--border)',
                                                    color: '#fff', border: 'none', borderRadius: 20,
                                                    padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                }}
                                            >
                                                {lt.is_active ? '✅ เปิดบริการ' : '⛔ ปิดบริการ'}
                                            </button>
                                            {expandedId === lt.id ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                                        </div>
                                    </div>

                                    {/* Price highlight */}
                                    <div style={{
                                        display: 'flex', gap: 12, marginTop: 10,
                                        padding: '8px 12px', background: 'rgba(59, 89, 152, 0.06)',
                                        borderRadius: 8,
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ราคาต่อ Line</div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                                                {formatCurrency(lt.price_per_line)}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ค่าบริการ</div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                                                {formatCurrency(lt.service_fee)}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>รวม/Line</div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>
                                                {formatCurrency(lt.price_per_line + lt.service_fee)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {expandedId === lt.id && (
                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                            <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>รูปแบบการเล่น</div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>เลือก {lt.numbers_to_pick} จาก {lt.max_number} + Special {lt.special_numbers_to_pick} จาก {lt.max_special_number}</div>
                                            </div>
                                            <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Jackpot ประมาณการ</div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#e67e22' }}>{lt.estimated_jackpot || 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ flex: 1, fontSize: 13, padding: '10px 14px' }}
                                                onClick={() => { setEditing(lt.id); setEditForm(lt); }}
                                            >
                                                <Edit2 size={14} /> แก้ไขราคาและคำอธิบาย
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
