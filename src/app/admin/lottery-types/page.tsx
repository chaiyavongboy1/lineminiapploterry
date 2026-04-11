'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { LotteryType } from '@/types';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_LOTTERY_TYPES: LotteryType[] = [
    {
        id: 'powerball',
        name: 'Powerball',
        description: 'เลือก 5 จาก 69 + Powerball 1 จาก 26',
        price_per_line: 250,
        service_fee: 50,
        max_number: 69,
        max_special_number: 26,
        numbers_to_pick: 5,
        special_numbers_to_pick: 1,
        estimated_jackpot: '$500 Million',
        is_active: true,
        draw_days: ['wednesday', 'saturday'],
        next_draw_date: null,
        image_url: null,
        created_at: new Date().toISOString(),
    },
    {
        id: 'mega-millions',
        name: 'Mega Millions',
        description: 'เลือก 5 จาก 70 + Mega Ball 1 จาก 24',
        price_per_line: 250,
        service_fee: 50,
        max_number: 70,
        max_special_number: 24,
        numbers_to_pick: 5,
        special_numbers_to_pick: 1,
        estimated_jackpot: '$400 Million',
        is_active: true,
        draw_days: ['tuesday', 'friday'],
        next_draw_date: null,
        image_url: null,
        created_at: new Date().toISOString(),
    },
];

export default function AdminLotteryTypesPage() {
    const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<LotteryType>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchLotteryTypes();
    }, []);

    function fetchLotteryTypes() {
        try {
            const stored = localStorage.getItem('admin_lottery_types');
            if (stored) {
                let types: LotteryType[] = JSON.parse(stored);

                // Fix: Mega Ball should be 1-24, migrate old cached data
                types = types.map(t => {
                    if ((t.id === 'mega-millions' || t.id === 'megamillions') && t.max_special_number === 25) {
                        return { ...t, max_special_number: 24, description: (t.description || '').replace('1-25', '1-24').replace('จาก 25', 'จาก 24') };
                    }
                    return t;
                });
                localStorage.setItem('admin_lottery_types', JSON.stringify(types));

                // Ensure only Powerball and Mega Millions exist for the simple view
                const filtered = types.filter(t => ['powerball', 'mega-millions'].includes(t.id));
                if (filtered.length === 0) {
                    setLotteryTypes(DEFAULT_LOTTERY_TYPES);
                    localStorage.setItem('admin_lottery_types', JSON.stringify(DEFAULT_LOTTERY_TYPES));
                } else {
                    setLotteryTypes(filtered);
                }
            } else {
                setLotteryTypes(DEFAULT_LOTTERY_TYPES);
                localStorage.setItem('admin_lottery_types', JSON.stringify(DEFAULT_LOTTERY_TYPES));
            }
        } catch {
            setLotteryTypes(DEFAULT_LOTTERY_TYPES);
        }
        setLoading(false);
    }

    function saveLotteryTypes(types: LotteryType[]) {
        setLotteryTypes(types);
        localStorage.setItem('admin_lottery_types', JSON.stringify(types));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    function handleSave(id: string) {
        const updated = lotteryTypes.map(lt =>
            lt.id === id ? { ...lt, ...editForm } : lt
        );
        saveLotteryTypes(updated);
        setEditing(null);
    }

    function toggleActive(id: string) {
        const updated = lotteryTypes.map(lt =>
            lt.id === id ? { ...lt, is_active: !lt.is_active } : lt
        );
        saveLotteryTypes(updated);
    }

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>🎰 จัดการประเภทหวย</h2>
            </div>

            {saved && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 10, padding: '8px 14px', marginBottom: 12,
                    fontSize: 13, color: 'var(--success)', textAlign: 'center',
                }}>
                    ✅ บันทึกเรียบร้อย!
                </div>
            )}

            {/* Lottery Type Cards */}
            {lotteryTypes.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)' }}>ไม่พบประเภทหวย</p>
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
                                    <button className="btn btn-success" style={{ flex: 1, fontSize: 13 }} onClick={() => handleSave(lt.id)}>
                                        <Save size={14} /> บันทึกการเปลี่ยนแปลง
                                    </button>
                                    <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setEditing(null)}>
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
