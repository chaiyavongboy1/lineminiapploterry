'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

type PrizeTier = {
    id: string;
    lottery_type_id: string;
    match_count: number;
    match_special: boolean;
    prize_name: string;
    prize_amount: number | null;
    tier_order: number;
    lottery_types: { name: string } | null;
};

export default function AdminPrizeTiersPage() {
    const [tiers, setTiers] = useState<PrizeTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchTiers();
    }, []);

    async function fetchTiers() {
        try {
            const res = await fetch('/api/admin/prize-tiers');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTiers(data);
            }
        } catch (error) {
            console.error('Error fetching tiers', error);
        } finally {
            setLoading(false);
        }
    }

    // Group by lottery name
    const groupedTiers = tiers.reduce((acc, tier) => {
        const name = tier.lottery_types?.name || 'Unknown';
        if (!acc[name]) acc[name] = [];
        acc[name].push(tier);
        return acc;
    }, {} as Record<string, PrizeTier[]>);

    const handleAmountChange = (id: string, value: string) => {
        setTiers(prev => prev.map(t => 
            t.id === id ? { ...t, prize_amount: value === '' ? null : Number(value) } : t
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/prize-tiers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tiers)
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                alert('Failed to save');
            }
        } catch (error) {
            console.error('Save error', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>💰 ตั้งค่าเงินรางวัล</h2>
                <button 
                    className="btn btn-primary" 
                    style={{ fontSize: 13, gap: 4, padding: '8px 12px' }}
                    onClick={handleSave}
                    disabled={saving}
                >
                    <Save size={16} /> 
                    {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
                </button>
            </div>

            {saved && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 10, padding: '8px 14px', marginBottom: 12,
                    fontSize: 13, color: 'var(--success)', textAlign: 'center',
                }}>
                    ✅ บันทึกยอดเงินรางวัลเรียบร้อย
                </div>
            )}

            {Object.keys(groupedTiers).map(groupName => (
                <div key={groupName} className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
                        {groupName}
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {groupedTiers[groupName].sort((a, b) => a.tier_order - b.tier_order).map(tier => (
                            <div key={tier.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 12px', background: 'var(--bg)', borderRadius: 8,
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{tier.prize_name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        ตรง {tier.match_count} เลข {tier.match_special ? ' + Special' : ''}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>$</span>
                                    <input 
                                        type="number"
                                        className="input"
                                        style={{ width: 120, textAlign: 'right', padding: '6px 10px' }}
                                        value={tier.prize_amount === null ? '' : tier.prize_amount}
                                        onChange={(e) => handleAmountChange(tier.id, e.target.value)}
                                        placeholder={tier.prize_name.toLowerCase().includes('jackpot') ? '0 = แจ็คพอต' : '0'}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
