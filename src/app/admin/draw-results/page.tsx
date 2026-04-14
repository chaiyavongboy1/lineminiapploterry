'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLine } from '@/components/LineProvider';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Trophy, Download, RefreshCw, Eye, AlertCircle, CheckCircle2, Clock, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { LotteryType } from '@/types';

interface PreviewResult {
    drawDate: string;
    numbers: number[];
    specialNumber: number;
    multiplier?: string;
    alreadyExists: boolean;
}

interface PreviewData {
    lotteryName: string;
    sourceUrl: string;
    results: PreviewResult[];
}

interface DrawResultWithStats {
    id: string;
    lottery_type_id: string;
    draw_date: string;
    winning_numbers: number[];
    special_number: number | null;
    jackpot_amount: string | null;
    created_at: string;
    totalChecked: number;
    totalWinners: number;
    totalPrizeAmount: number;
    lottery_type?: { id: string; name: string };
}

function formatDateTimeThai(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}



export default function AdminDrawResultsPage() {
    const { profile } = useLine();
    const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
    const [drawResults, setDrawResults] = useState<DrawResultWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [fetchMessage, setFetchMessage] = useState('');
    const [selectedLotteryId, setSelectedLotteryId] = useState('');

    // Manual input form
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualForm, setManualForm] = useState({
        lottery_type_id: '',
        draw_date: '',
        numbers: ['', '', '', '', ''],
        special_number: '',
    });
    const [saving, setSaving] = useState(false);
    
    // Edit state
    const [editModeId, setEditModeId] = useState<string | null>(null);

    // Preview state (verification before save)
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [confirming, setConfirming] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันลบผลรางวัลนี้? (ข้อมูลการตรวจรางวัลจะถูกลบรวดเร็วด้วย)')) return;
        try {
            const res = await fetch(`/api/admin/draw-results/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setFetchMessage('✅ ลบผลรางวัลเรียบร้อย');
                loadResults();
            } else {
                setFetchMessage('❌ ลบไม่สำเร็จ');
            }
        } catch {
            setFetchMessage('❌ การลบผิดพลาด');
        }
    };

    const handleRecheck = async (drawResultId: string) => {
        setFetchMessage('🔄 กำลังตรวจซ้ำ...');
        try {
            const res = await fetch('/api/admin/draw-results', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draw_result_id: drawResultId }),
            });
            const result = await res.json();
            if (result.success) {
                setFetchMessage(`✅ ตรวจซ้ำเรียบร้อย — ตรวจ ${result.checkResults.totalChecked} lines, ถูกรางวัล ${result.checkResults.totalWinners} lines`);
                loadResults();
            } else {
                setFetchMessage(`❌ ${result.error}`);
            }
        } catch {
            setFetchMessage('❌ เกิดข้อผิดพลาด');
        }
    };

    // Load lottery types — MUST use Supabase (needs real UUIDs for API calls)
    useEffect(() => {
        async function loadLotteryTypes() {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('lottery_types')
                    .select('*')
                    .eq('is_active', true)
                    .order('name');
                if (data && data.length > 0) {
                    setLotteryTypes(data);
                    setSelectedLotteryId(data[0].id);
                    setManualForm(f => ({ ...f, lottery_type_id: data[0].id }));
                }
            } catch (err) {
                console.warn('Failed to fetch lottery types from Supabase:', err);
            }
        }
        loadLotteryTypes();
    }, []);

    // Load draw results — via Supabase client (same pattern)
    const loadResults = useCallback(async () => {
        if (!selectedLotteryId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('draw_results')
                .select(`*, lottery_type:lottery_types(id, name)`)
                .eq('lottery_type_id', selectedLotteryId)
                .order('draw_date', { ascending: false })
                .limit(50);

            if (error) throw error;

            // For each draw result, count winners
            const resultsWithStats = await Promise.all(
                (data || []).map(async (draw) => {
                    const { data: lineResults } = await supabase
                        .from('order_line_results')
                        .select('is_winner, prize_amount')
                        .eq('draw_result_id', draw.id);

                    return {
                        ...draw,
                        totalChecked: lineResults?.length || 0,
                        totalWinners: lineResults?.filter((r: { is_winner: boolean }) => r.is_winner).length || 0,
                        totalPrizeAmount: lineResults?.reduce((sum: number, r: { prize_amount: number }) => sum + (r.prize_amount || 0), 0) || 0,
                    };
                })
            );

            setDrawResults(resultsWithStats as DrawResultWithStats[]);
        } catch (err) {
            console.warn('Failed to load results from Supabase:', err);
            setDrawResults([]);
        } finally {
            setLoading(false);
        }
    }, [selectedLotteryId]);

    useEffect(() => {
        if (selectedLotteryId) loadResults();
    }, [selectedLotteryId, loadResults]);

    // Auto-fetch from API — now fetches PREVIEW first
    const handleAutoFetch = async (lotteryTypeId: string) => {
        setFetching(true);
        setFetchMessage('');
        setPreviewData(null);
        try {
            const res = await fetch('/api/admin/draw-results/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lottery_type_id: lotteryTypeId, preview: true }),
            });
            const result = await res.json();
            if (result.success && result.preview) {
                const newResults = result.results.filter((r: PreviewResult) => !r.alreadyExists);
                if (newResults.length === 0) {
                    setFetchMessage('✅ ผลรางวัลเป็นข้อมูลล่าสุดแล้ว ไม่มีงวดใหม่');
                } else {
                    setPreviewData({
                        lotteryName: result.lotteryName,
                        sourceUrl: result.sourceUrl,
                        results: result.results,
                    });
                }
            } else {
                setFetchMessage(`❌ ${result.error || 'ไม่สามารถดึงข้อมูลได้'}`);
            }
        } catch {
            setFetchMessage('❌ เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setFetching(false);
        }
    };

    // Confirm and save previewed results
    const handleConfirmSave = async () => {
        if (!previewData) return;
        const newResults = previewData.results.filter(r => !r.alreadyExists);
        if (newResults.length === 0) {
            setFetchMessage('✅ ไม่มีงวดใหม่ให้บันทึก');
            setPreviewData(null);
            return;
        }

        setConfirming(true);
        try {
            const res = await fetch('/api/admin/draw-results/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lottery_type_id: selectedLotteryId,
                    confirmed_results: newResults.map(r => ({
                        drawDate: r.drawDate,
                        numbers: r.numbers,
                        specialNumber: r.specialNumber,
                    })),
                }),
            });
            const result = await res.json();
            if (result.success) {
                setFetchMessage(`✅ ${result.message || `บันทึกผลรางวัลใหม่ ${result.newCount} งวด`}`);
                setPreviewData(null);
                loadResults();
            } else {
                setFetchMessage(`❌ ${result.error}`);
            }
        } catch {
            setFetchMessage('❌ เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setConfirming(false);
        }
    };

    // Manual submit
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const numbers = manualForm.numbers.map(Number).filter(n => !isNaN(n) && n > 0);
            const special = parseInt(manualForm.special_number, 10);

            if (numbers.length !== 5) {
                alert('กรุณากรอกตัวเลข 5 ตัว');
                setSaving(false);
                return;
            }

            const payload = {
                lottery_type_id: manualForm.lottery_type_id,
                draw_date: manualForm.draw_date,
                winning_numbers: numbers.sort((a, b) => a - b),
                special_number: isNaN(special) ? null : special,
                jackpot_amount: 'MANUAL',
            };

            try {
                const res = await fetch('/api/admin/draw-results', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const result = await res.json();
                if (result.success) {
                    setFetchMessage(`✅ บันทึกผลรางวัลสำเร็จ — ตรวจ ${result.checkResults?.totalChecked || 0} lines, ถูกรางวัล ${result.checkResults?.totalWinners || 0} lines`);
                    setShowManualForm(false);
                    loadResults();
                } else {
                    setFetchMessage(`❌ ${result.error}`);
                }
            } catch {
                setFetchMessage('❌ ไม่สามารถบันทึกผลรางวัลได้');
            }
        } finally {
            setSaving(false);
        }
    };

    const selectedLottery = lotteryTypes.find(lt => lt.id === selectedLotteryId);
    const specialLabel = selectedLottery?.name === 'Powerball' ? 'Powerball' : 'Mega Ball';

    // Schedule info per lottery (Thai timezone)
    const scheduleInfo: Record<string, string> = {
        'Powerball': 'ออกรางวัลทุกวัน จ./พ./ส. เวลา 09:59 น. (ไทย) — ดึงอัตโนมัติ 11:00 น.',
        'Mega Millions': 'ออกรางวัลทุกวัน อ./ศ. เวลา 10:00 น. (ไทย) — ดึงอัตโนมัติ 11:30 น.',
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>🏆 ผลรางวัลลอตเตอรี่</h2>
            </div>

            {/* Lottery Type Selector */}
            {lotteryTypes.length > 0 ? (
                <div className="tabs" style={{ marginBottom: 16 }}>
                    {lotteryTypes.map(lt => (
                        <button
                            key={lt.id}
                            className={`tab ${selectedLotteryId === lt.id ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedLotteryId(lt.id);
                                setManualForm(f => ({ ...f, lottery_type_id: lt.id }));
                            }}
                        >
                            {lt.name === 'Powerball' ? '🔴' : '🟡'} {lt.name}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="skeleton" style={{ height: 40, marginBottom: 16 }} />
            )}

            {/* Schedule Info */}
            {selectedLottery && scheduleInfo[selectedLottery.name] && (
                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(59,89,152,0.06), rgba(59,89,152,0.02))',
                    border: '1px solid rgba(59,89,152,0.15)',
                    marginBottom: 16,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <Clock size={16} color="var(--primary)" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {scheduleInfo[selectedLottery.name]}
                    </span>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => handleAutoFetch(selectedLotteryId)}
                    disabled={fetching || !selectedLotteryId}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 16px' }}
                >
                    {fetching ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
                    {fetching ? 'กำลังดึง...' : 'ดึงผลรางวัลล่าสุด'}
                </button>
                <button
                    className="btn"
                    onClick={() => setShowManualForm(!showManualForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                    ✏️ กรอกผลด้วยตัวเอง
                </button>
            </div>

            {/* Fetch Message */}
            {fetchMessage && (
                <div className="card" style={{
                    marginBottom: 16,
                    padding: '10px 14px',
                    fontSize: 13,
                    background: fetchMessage.startsWith('❌') ? 'rgba(231,76,60,0.08)' : 'rgba(39,174,96,0.08)',
                    border: `1px solid ${fetchMessage.startsWith('❌') ? 'rgba(231,76,60,0.2)' : 'rgba(39,174,96,0.2)'}`,
                    color: fetchMessage.startsWith('❌') ? 'var(--danger)' : 'var(--success)',
                }}>
                    {fetchMessage}
                </div>
            )}

            {/* ── PREVIEW VERIFICATION PANEL ── */}
            {previewData && (
                <div style={{
                    marginBottom: 20,
                    borderRadius: 14,
                    border: '2px solid rgba(245,158,11,0.4)',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.01))',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 18px',
                        background: 'rgba(245,158,11,0.08)',
                        borderBottom: '1px solid rgba(245,158,11,0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={18} color="#f59e0b" />
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>
                                    ตรวจสอบผลรางวัลก่อนบันทึก
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    ข้อมูลจาก data.ny.gov — กรุณาตรวจสอบความถูกต้อง
                                </div>
                            </div>
                        </div>
                        <a
                            href={previewData.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                padding: '4px 10px',
                                borderRadius: 6,
                                background: 'rgba(59,89,152,0.08)',
                                border: '1px solid rgba(59,89,152,0.15)',
                                fontWeight: 600,
                            }}
                        >
                            <ExternalLink size={12} />
                            ดูผลจากแหล่งข้อมูล
                        </a>
                    </div>

                    {/* Results List */}
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {previewData.results.map((r, idx) => {
                            const isExisting = r.alreadyExists;
                            const isJackpot = previewData.lotteryName === 'Powerball';

                            return (
                                <div key={idx} style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    background: isExisting
                                        ? 'rgba(0,0,0,0.02)'
                                        : 'rgba(39,174,96,0.04)',
                                    border: isExisting
                                        ? '1px dashed var(--border)'
                                        : '1px solid rgba(39,174,96,0.2)',
                                    opacity: isExisting ? 0.6 : 1,
                                }}>
                                    {/* Date row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700 }}>
                                                📅 {formatDate(r.drawDate)}
                                            </span>
                                            {r.multiplier && (
                                                <span style={{
                                                    fontSize: 10,
                                                    background: 'rgba(59,89,152,0.1)',
                                                    color: 'var(--primary)',
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    fontWeight: 600,
                                                }}>
                                                    x{r.multiplier}
                                                </span>
                                            )}
                                        </div>
                                        {isExisting ? (
                                            <span style={{
                                                fontSize: 10,
                                                background: 'var(--bg)',
                                                color: 'var(--text-muted)',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                border: '1px solid var(--border)',
                                            }}>
                                                มีอยู่แล้ว
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: 10,
                                                background: 'rgba(39,174,96,0.12)',
                                                color: 'var(--success)',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                fontWeight: 700,
                                            }}>
                                                ✨ งวดใหม่
                                            </span>
                                        )}
                                    </div>

                                    {/* Numbers */}
                                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {r.numbers.map((num, i) => (
                                            <span key={i} style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: 14,
                                                background: isExisting
                                                    ? 'var(--bg)'
                                                    : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                                color: isExisting ? 'var(--text-muted)' : '#fff',
                                                border: isExisting ? '1px solid var(--border)' : 'none',
                                                boxShadow: isExisting ? 'none' : '0 2px 6px rgba(59,89,152,0.25)',
                                            }}>
                                                {num}
                                            </span>
                                        ))}
                                        <span style={{ color: 'var(--text-muted)', fontSize: 16, margin: '0 2px' }}>+</span>
                                        <span style={{
                                            width: 36, height: 36, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: 14,
                                            background: isExisting
                                                ? 'var(--bg)'
                                                : isJackpot
                                                    ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                            color: isExisting
                                                ? 'var(--text-muted)'
                                                : isJackpot ? '#fff' : '#1a1a1a',
                                            border: isExisting ? '1px solid var(--border)' : 'none',
                                            boxShadow: isExisting ? 'none'
                                                : isJackpot ? '0 2px 6px rgba(231,76,60,0.3)' : '0 2px 6px rgba(217,119,6,0.3)',
                                        }}>
                                            {r.specialNumber}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                        padding: '12px 18px 16px',
                        display: 'flex',
                        gap: 8,
                        borderTop: '1px solid rgba(245,158,11,0.15)',
                    }}>
                        <button
                            className="btn btn-accent"
                            onClick={handleConfirmSave}
                            disabled={confirming || previewData.results.filter(r => !r.alreadyExists).length === 0}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                fontSize: 13,
                                padding: '10px 16px',
                                fontWeight: 700,
                            }}
                        >
                            {confirming ? (
                                <><RefreshCw size={14} className="spin" /> กำลังบันทึก...</>
                            ) : (
                                <><CheckCircle2 size={14} /> ✅ ยืนยัน — บันทึกผลรางวัล ({previewData.results.filter(r => !r.alreadyExists).length} งวดใหม่)</>
                            )}
                        </button>
                        <button
                            className="btn"
                            onClick={() => setPreviewData(null)}
                            disabled={confirming}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                fontSize: 13,
                                padding: '10px 16px',
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <XCircle size={14} />
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            {/* Manual Input Form */}
            {showManualForm && (
                <form onSubmit={handleManualSubmit} className="card" style={{ marginBottom: 20, padding: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>✏️ กรอกผลรางวัลด้วยตัวเอง</h3>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                            วันที่ออกรางวัล
                        </label>
                        <input
                            type="date"
                            value={manualForm.draw_date}
                            onChange={e => setManualForm(f => ({ ...f, draw_date: e.target.value }))}
                            required
                            style={{
                                width: '100%', padding: '8px 12px', borderRadius: 8,
                                border: '1px solid var(--border)', fontSize: 14,
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                            ตัวเลข 5 ตัว
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {manualForm.numbers.map((n, i) => (
                                <input
                                    key={i}
                                    type="number"
                                    min={1}
                                    max={selectedLottery?.max_number || 69}
                                    value={n}
                                    onChange={e => {
                                        const nums = [...manualForm.numbers];
                                        nums[i] = e.target.value;
                                        setManualForm(f => ({ ...f, numbers: nums }));
                                    }}
                                    required
                                    style={{
                                        width: 50, padding: '8px', borderRadius: 8,
                                        border: '1px solid var(--border)', fontSize: 14,
                                        textAlign: 'center',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                            {specialLabel}
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={selectedLottery?.max_special_number || 26}
                            value={manualForm.special_number}
                            onChange={e => setManualForm(f => ({ ...f, special_number: e.target.value }))}
                            required
                            style={{
                                width: 60, padding: '8px', borderRadius: 8,
                                border: '1px solid var(--accent)', fontSize: 14,
                                textAlign: 'center',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="submit"
                            className="btn btn-accent"
                            disabled={saving}
                            style={{ fontSize: 13, padding: '8px 20px' }}
                        >
                            {saving ? 'กำลังบันทึก...' : '💾 บันทึกผล'}
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setShowManualForm(false)}
                            style={{ fontSize: 13, padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)' }}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            )}

            {/* Results List */}
            {loading ? (
                <div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: 100, marginBottom: 12 }} />
                    ))}
                </div>
            ) : drawResults.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <AlertCircle size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>ยังไม่มีผลรางวัล</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                        กดปุ่ม &ldquo;ดึงผลรางวัลล่าสุด&rdquo; เพื่อดึงข้อมูลจาก API
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {drawResults.map((draw, index) => {
                        const lotteryName = (draw.lottery_type as unknown as { name: string })?.name || '';
                        const isJackpot = lotteryName === 'Powerball';
                        const isManual = draw.jackpot_amount === 'MANUAL';
                        const isEditingThis = editModeId === draw.id;

                        if (isEditingThis) {
                            return (
                                <div key={draw.id} className="card" style={{ padding: 16, border: '2px solid var(--accent)' }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>แก้ไขผลรางวัล ({formatDate(draw.draw_date)})</h4>
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                        {manualForm.numbers.map((n, i) => (
                                            <input
                                                key={i} type="number" min={1} max={selectedLottery?.max_number || 69}
                                                value={n}
                                                onChange={e => {
                                                    const nums = [...manualForm.numbers];
                                                    nums[i] = e.target.value;
                                                    setManualForm(f => ({ ...f, numbers: nums }));
                                                }}
                                                style={{ width: 44, padding: '6px', borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center' }}
                                            />
                                        ))}
                                        <span style={{ padding: '6px 0', fontWeight: 700 }}>+</span>
                                        <input
                                            type="number" min={1} max={selectedLottery?.max_special_number || 26}
                                            value={manualForm.special_number}
                                            onChange={e => setManualForm(f => ({ ...f, special_number: e.target.value }))}
                                            style={{ width: 50, padding: '6px', borderRadius: 6, border: '1px solid var(--accent)', textAlign: 'center' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={async () => {
                                            const nums = manualForm.numbers.map(Number).filter(n => !isNaN(n) && n > 0);
                                            const sp = parseInt(manualForm.special_number, 10);
                                            if (nums.length !== 5) return alert('กรอกตัวเลขให้ครบ');
                                            await fetch(`/api/admin/draw-results/${draw.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ winning_numbers: nums.sort((a,b)=>a-b), special_number: isNaN(sp) ? null : sp })
                                            });
                                            setEditModeId(null);
                                            loadResults();
                                        }} className="btn btn-accent" style={{ padding: '6px 14px', fontSize: 12 }}>บันทึก</button>
                                        <button onClick={() => setEditModeId(null)} className="btn" style={{ padding: '6px 14px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>ยกเลิก</button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={draw.id} className="card fade-in" style={{
                                animationDelay: `${index * 0.05}s`,
                                borderLeft: draw.totalWinners > 0 
                                    ? '4px solid var(--success)' 
                                    : isManual ? '4px solid var(--accent)' : '4px solid var(--border)',
                                borderTop: isManual ? '1px dashed var(--accent)' : '1px solid var(--border)',
                                borderRight: isManual ? '1px dashed var(--accent)' : '1px solid var(--border)',
                                borderBottom: isManual ? '1px dashed var(--accent)' : '1px solid var(--border)',
                                background: isManual ? 'rgba(59,89,152,0.02)' : 'var(--bg-card)'
                            }}>
                                {/* Date & Status */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <Link href={`/admin/draw-results/${draw.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700 }}>
                                                📅 {formatDate(draw.draw_date)}
                                            </div>
                                            {isManual && <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>กรอกเอง</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            บันทึกเมื่อ: {formatDateTimeThai(draw.created_at)}
                                        </div>
                                    </Link>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                        {draw.totalWinners > 0 ? (
                                            <span className="badge badge-approved" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <CheckCircle2 size={12} />
                                                ถูกรางวัล {draw.totalWinners}
                                            </span>
                                        ) : (
                                            <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                                ตรวจแล้ว {draw.totalChecked} lines
                                            </span>
                                        )}
                                        <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRecheck(draw.id); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--success)', padding: 0, fontWeight: 600 }}
                                            >
                                                🔄 ตรวจซ้ำ
                                            </button>
                                            {isManual && (
                                                <>
                                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualForm({ lottery_type_id: draw.lottery_type_id, draw_date: draw.draw_date, numbers: draw.winning_numbers.map(String), special_number: draw.special_number ? String(draw.special_number) : '' }); setEditModeId(draw.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--primary)', padding: 0 }}>แก้ไข</button>
                                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(draw.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--danger)', padding: 0 }}>ลบ</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Winning Numbers */}
                                <Link href={`/admin/draw-results/${draw.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {(draw.winning_numbers || []).map((num: number, i: number) => (
                                            <span key={i} style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: 13,
                                                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                                color: '#fff',
                                            }}>
                                                {num}
                                            </span>
                                        ))}
                                        {draw.special_number !== null && (
                                            <>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 16, margin: '0 2px' }}>+</span>
                                                <span style={{
                                                    width: 32, height: 32, borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: 13,
                                                    background: isJackpot
                                                        ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                    color: isJackpot ? '#fff' : '#1a1a1a',
                                                }}>
                                                    {draw.special_number}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: 8,
                                        borderTop: '1px solid var(--border)',
                                    }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            ตรวจแล้ว {draw.totalChecked} lines
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {draw.totalWinners > 0 && (
                                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>
                                                    🎉 ถูกรางวัล {draw.totalWinners} lines
                                                </span>
                                            )}
                                            <span style={{ fontSize: 13, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Eye size={14} /> ดู
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
