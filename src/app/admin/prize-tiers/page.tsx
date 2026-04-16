'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Trophy, Coins, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Star, Zap, RefreshCw } from 'lucide-react';

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

type GroupedTiers = Record<string, { name: string; tiers: PrizeTier[] }>;

function formatPrizeDisplay(amount: number | null): string {
    if (amount === null || amount === 0) return 'แจ็คพอต';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function getTierIcon(tierOrder: number): string {
    switch (tierOrder) {
        case 1: return '🏆';
        case 2: return '🥈';
        case 3: return '🥉';
        case 4: return '🎯';
        case 5: return '⭐';
        default: return '🎫';
    }
}

function getTierGradient(tierOrder: number, isJackpot: boolean): { bg: string; border: string; iconBg: string; color: string; shadow: string } {
    if (isJackpot || tierOrder === 1) return {
        bg: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)',
        border: 'rgba(245,158,11,0.3)',
        iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: '#92400e',
        shadow: 'rgba(245,158,11,0.15)',
    };
    if (tierOrder === 2) return {
        bg: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: 'rgba(14,165,233,0.25)',
        iconBg: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        color: '#0c4a6e',
        shadow: 'rgba(14,165,233,0.12)',
    };
    if (tierOrder === 3) return {
        bg: 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)',
        border: 'rgba(16,185,129,0.25)',
        iconBg: 'linear-gradient(135deg, #10b981, #059669)',
        color: '#065f46',
        shadow: 'rgba(16,185,129,0.12)',
    };
    return {
        bg: 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)',
        border: 'rgba(100,116,139,0.15)',
        iconBg: 'linear-gradient(135deg, #64748b, #475569)',
        color: '#334155',
        shadow: 'rgba(100,116,139,0.08)',
    };
}

export default function AdminPrizeTiersPage() {
    const [tiers, setTiers] = useState<PrizeTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [editedIds, setEditedIds] = useState<Set<string>>(new Set());

    const fetchTiers = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/prize-tiers');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTiers(data);
                // Expand all groups by default
                const groups: Record<string, boolean> = {};
                for (const tier of data) {
                    const name = tier.lottery_types?.name || 'Unknown';
                    groups[name] = true;
                }
                setExpandedGroups(groups);
            }
        } catch (error) {
            console.error('Error fetching tiers', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTiers();
    }, [fetchTiers]);

    // Group by lottery type
    const groupedTiers: GroupedTiers = tiers.reduce((acc, tier) => {
        const name = tier.lottery_types?.name || 'Unknown';
        if (!acc[name]) acc[name] = { name, tiers: [] };
        acc[name].tiers.push(tier);
        return acc;
    }, {} as GroupedTiers);

    const handleAmountChange = (id: string, value: string) => {
        setTiers(prev => prev.map(t =>
            t.id === id ? { ...t, prize_amount: value === '' ? null : Number(value) } : t
        ));
        setEditedIds(prev => new Set(prev).add(id));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            const res = await fetch('/api/admin/prize-tiers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tiers),
            });
            if (res.ok) {
                setSaveStatus('success');
                setEditedIds(new Set());
                setTimeout(() => setSaveStatus('idle'), 4000);
            } else {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 4000);
            }
        } catch (error) {
            console.error('Save error', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 4000);
        } finally {
            setSaving(false);
        }
    };

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const hasEdits = editedIds.size > 0;

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="skeleton" style={{ height: 80, borderRadius: 18 }} />
                <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
                <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 80 }}>

            {/* ═══ Header ═══ */}
            <div className="fade-in" style={{
                background: 'var(--grad-hero)',
                border: '2px solid rgba(245,158,11,0.18)',
                borderRadius: 22, padding: '18px 18px',
                position: 'relative', overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
            }}>
                <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -15, left: 20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,179,8,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(245,158,11,0.3)', flexShrink: 0,
                    }}>
                        <Coins size={22} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: '#111827' }}>ตั้งค่าเทียร์รางวัล</div>
                        <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginTop: 2 }}>
                            กำหนดเงินรางวัลแต่ละระดับ · {tiers.length} เทียร์
                        </div>
                    </div>
                    <Trophy size={20} color="rgba(245,158,11,0.3)" />
                </div>
            </div>

            {/* ═══ Save Status Banner ═══ */}
            {saveStatus === 'success' && (
                <div className="fade-in" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
                    border: '1.5px solid rgba(16,185,129,0.25)',
                }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 10,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <CheckCircle2 size={16} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>บันทึกสำเร็จ!</div>
                        <div style={{ fontSize: 11, color: '#10b981' }}>ยอดเงินรางวัลถูกอัพเดทเรียบร้อยแล้ว</div>
                    </div>
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="fade-in" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
                    border: '1.5px solid rgba(239,68,68,0.25)',
                }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 10,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <AlertCircle size={16} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>เกิดข้อผิดพลาด</div>
                        <div style={{ fontSize: 11, color: '#ef4444' }}>ไม่สามารถบันทึกได้ กรุณาลองใหม่</div>
                    </div>
                </div>
            )}

            {/* ═══ Lottery Groups ═══ */}
            {Object.entries(groupedTiers).map(([groupName, group], groupIdx) => {
                const isExpanded = expandedGroups[groupName] !== false;
                const isPowerball = groupName.toLowerCase().includes('powerball');
                const sortedTiers = [...group.tiers].sort((a, b) => a.tier_order - b.tier_order);
                const headerGrad = isPowerball
                    ? 'linear-gradient(135deg, rgba(231,76,60,0.08), rgba(231,76,60,0.02))'
                    : 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.02))';
                const headerBorder = isPowerball ? 'rgba(231,76,60,0.2)' : 'rgba(234,179,8,0.2)';
                const headerColor = isPowerball ? '#e74c3c' : '#d97706';
                const headerIcon = isPowerball ? '🔴' : '🟡';

                return (
                    <div key={groupName} className="fade-in" style={{
                        animationDelay: `${groupIdx * 0.1}s`,
                        borderRadius: 18,
                        overflow: 'hidden',
                        border: `1.5px solid ${headerBorder}`,
                        boxShadow: `0 4px 16px ${isPowerball ? 'rgba(231,76,60,0.06)' : 'rgba(234,179,8,0.06)'}`,
                    }}>
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(groupName)}
                            style={{
                                width: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 18px',
                                background: headerGrad,
                                border: 'none', cursor: 'pointer',
                                borderBottom: isExpanded ? `1px solid ${headerBorder}` : 'none',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 11,
                                    background: isPowerball
                                        ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16,
                                    boxShadow: isPowerball
                                        ? '0 3px 10px rgba(231,76,60,0.25)'
                                        : '0 3px 10px rgba(245,158,11,0.25)',
                                }}>
                                    {headerIcon}
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{groupName}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{sortedTiers.length} ระดับรางวัล</div>
                                </div>
                            </div>
                            <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: 'rgba(0,0,0,0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'transform 0.2s ease',
                                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            }}>
                                <ChevronDown size={16} color={headerColor} />
                            </div>
                        </button>

                        {/* Tier Items */}
                        {isExpanded && (
                            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
                                {sortedTiers.map((tier, tierIdx) => {
                                    const isJackpot = tier.prize_name.toLowerCase().includes('jackpot') || tier.prize_name.toLowerCase().includes('grand');
                                    const style = getTierGradient(tier.tier_order, isJackpot);
                                    const isEdited = editedIds.has(tier.id);

                                    return (
                                        <div key={tier.id} className="fade-in" style={{
                                            animationDelay: `${tierIdx * 0.04}s`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 14px',
                                            background: style.bg,
                                            borderRadius: 14,
                                            border: `1.5px solid ${isEdited ? 'rgba(59,130,246,0.4)' : style.border}`,
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isEdited ? '0 0 0 2px rgba(59,130,246,0.1)' : `0 2px 8px ${style.shadow}`,
                                        }}>
                                            {/* Shine effect */}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
                                                background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
                                                borderRadius: '14px 14px 0 0', pointerEvents: 'none',
                                            }} />

                                            {/* Left: Tier info */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: 10,
                                                    background: style.iconBg,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 15, flexShrink: 0,
                                                    boxShadow: `0 2px 8px ${style.shadow}`,
                                                }}>
                                                    {getTierIcon(tier.tier_order)}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: 13, fontWeight: 700, color: style.color,
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    }}>
                                                        {tier.prize_name}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginTop: 1 }}>
                                                        ตรง {tier.match_count} ตัว{tier.match_special ? ' + Special' : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Amount input */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', flexShrink: 0 }}>
                                                <span style={{
                                                    fontSize: 15, fontWeight: 800, color: style.color, opacity: 0.5,
                                                }}>$</span>
                                                <input
                                                    type="number"
                                                    value={tier.prize_amount === null ? '' : tier.prize_amount}
                                                    onChange={(e) => handleAmountChange(tier.id, e.target.value)}
                                                    placeholder={isJackpot ? 'Jackpot' : '0'}
                                                    style={{
                                                        width: 110,
                                                        padding: '8px 10px',
                                                        borderRadius: 10,
                                                        border: `1.5px solid ${isEdited ? 'rgba(59,130,246,0.4)' : 'rgba(0,0,0,0.08)'}`,
                                                        background: 'rgba(255,255,255,0.8)',
                                                        fontSize: 14,
                                                        fontWeight: 700,
                                                        textAlign: 'right',
                                                        color: '#1f2937',
                                                        outline: 'none',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onFocus={(e) => {
                                                        (e.target as HTMLInputElement).style.borderColor = 'rgba(59,130,246,0.5)';
                                                        (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                                                    }}
                                                    onBlur={(e) => {
                                                        (e.target as HTMLInputElement).style.borderColor = isEdited ? 'rgba(59,130,246,0.4)' : 'rgba(0,0,0,0.08)';
                                                        (e.target as HTMLInputElement).style.boxShadow = 'none';
                                                    }}
                                                />
                                                {isEdited && (
                                                    <div style={{
                                                        width: 6, height: 6, borderRadius: '50%',
                                                        background: '#3b82f6',
                                                        position: 'absolute', top: 2, right: 2,
                                                    }} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Group Summary */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(0,0,0,0.02)',
                                    border: '1px dashed rgba(0,0,0,0.08)',
                                    marginTop: 2,
                                }}>
                                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                                        รวมทุกเทียร์ (ยกเว้น Jackpot)
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>
                                        {formatPrizeDisplay(
                                            sortedTiers
                                                .filter(t => t.prize_amount !== null && t.prize_amount > 0)
                                                .reduce((sum, t) => sum + (t.prize_amount || 0), 0)
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* ═══ Sticky Save Button ═══ */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)',
                background: 'linear-gradient(0deg, rgba(255,255,255,0.98) 80%, rgba(255,255,255,0) 100%)',
                zIndex: 50,
            }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '14px 20px',
                        borderRadius: 16,
                        border: 'none',
                        background: hasEdits
                            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                            : 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 800,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: hasEdits
                            ? '0 6px 20px rgba(59,130,246,0.35)'
                            : '0 6px 20px rgba(16,185,129,0.3)',
                        transition: 'all 0.25s ease',
                        opacity: saving ? 0.7 : 1,
                        letterSpacing: '0.02em',
                    }}
                >
                    {saving ? (
                        <>
                            <RefreshCw size={18} className="spin" />
                            กำลังบันทึก...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            {hasEdits ? `บันทึกการเปลี่ยนแปลง (${editedIds.size})` : 'บันทึกทั้งหมด'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
