'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { formatDate, formatDrawDate } from '@/lib/utils';
import { ArrowLeft, User, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { compressImage, validateImageFile } from '@/lib/image-compress';

interface DrawResultDetail {
    id: string;
    draw_date: string;
    winning_numbers: number[];
    special_number: number | null;
    jackpot_amount: string | null;
    created_at: string;
    lottery_type: { id: string; name: string } | null;
}

interface LineResultRow {
    id: string;
    matched_numbers: number[];
    matched_special: boolean;
    match_count: number;
    prize_amount: number;
    is_winner: boolean;
    transfer_slip_url: string | null;
    transferred_at: string | null;
    prize_tier: { prize_name: string; tier_order: number } | null;
    order_line: {
        id: string;
        line_number: number;
        numbers: number[];
        special_number: number | null;
        order_id: string;
    } | null;
    order_info?: {
        order_number: string;
        purchased_at: string | null;
        user: { display_name: string | null; line_user_id: string } | null;
        profile?: {
            bank_name: string | null;
            bank_account_number: string | null;
            promptpay_number: string | null;
        } | null;
    };
}

interface TaxSettings {
    taxRate: string;
    exchangeRate: string;
}

interface OrderGroup {
    orderId: string;
    orderNumber: string;
    user: { display_name: string | null; line_user_id: string } | null;
    profile?: {
        bank_name: string | null;
        bank_account_number: string | null;
        promptpay_number: string | null;
    } | null;
    purchasedAt: string | null;
    lines: LineResultRow[];
    totalPrizeUSD: number;
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

// For draw_date (YYYY-MM-DD strings), use formatDrawDate to avoid timezone shifts.
// For timestamps (ISO strings with time), use formatDateTimeThai above.

export default function DrawResultDetailPage() {
    const params = useParams();
    const drawId = params.id as string;

    const [drawResult, setDrawResult] = useState<DrawResultDetail | null>(null);
    const [lineResults, setLineResults] = useState<LineResultRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [taxSettings, setTaxSettings] = useState<TaxSettings>({ taxRate: '', exchangeRate: '' });
    const [uploadingSlip, setUploadingSlip] = useState<string | null>(null);
    const [viewBankInfo, setViewBankInfo] = useState<string | null>(null);

    const handleUploadSlip = async (resultId: string, file: File) => {
        if (!file) return;

        // Validate + compress before upload
        const validationError = validateImageFile(file);
        if (validationError) { alert(validationError); return; }

        setUploadingSlip(resultId);
        try {
            const { file: compressed } = await compressImage(file, { maxSizeMB: 1, maxWidthPx: 1920 });

            const formData = new FormData();
            formData.append('orderLineResultId', resultId);
            formData.append('slip', compressed);

            const res = await fetch('/api/admin/prize-transfer', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success && data.data?.slipUrl) {
                // Update local state
                setLineResults(prev => prev.map(r =>
                    r.id === resultId
                        ? { ...r, transfer_slip_url: data.data.slipUrl, transferred_at: new Date().toISOString() }
                        : r
                ));
            } else {
                alert(data.error || 'Failed to upload slip');
            }
        } catch (err) {
            console.error(err);
            alert('Error during upload');
        } finally {
            setUploadingSlip(null);
        }
    };

    useEffect(() => {
        async function loadDetail() {
            try {
                // Load draw result (with enriched line results) + tax settings in parallel
                const [drawRes, taxRes] = await Promise.all([
                    fetch(`/api/admin/draw-results/${drawId}`),
                    fetch('/api/settings?key=tax_settings'),
                ]);

                if (drawRes.ok) {
                    const drawJson = await drawRes.json();
                    if (drawJson.success && drawJson.data) {
                        setDrawResult(drawJson.data.drawResult as unknown as DrawResultDetail);
                        setLineResults(drawJson.data.lineResults as LineResultRow[]);
                    }
                }

                if (taxRes.ok) {
                    const taxJson = await taxRes.json();
                    if (taxJson.success && taxJson.data) {
                        setTaxSettings(taxJson.data);
                    }
                }
            } catch (err) {
                console.error('Failed to load draw result detail', err);
            }

            setLoading(false);
        }

        if (drawId) loadDetail();
    }, [drawId]);

    if (loading) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!drawResult) {
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'var(--text-muted)' }}>ไม่พบข้อมูลผลรางวัล</p>
                <Link href="/admin/draw-results" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
                    กลับ
                </Link>
            </div>
        );
    }

    const lotteryName = drawResult.lottery_type?.name || '';
    const isJackpot = lotteryName === 'Powerball';
    const specialLabel = isJackpot ? 'Powerball' : 'Mega Ball';
    const winners = lineResults.filter(r => r.is_winner);
    const losers = lineResults.filter(r => !r.is_winner);


    // Tax threshold: prizes of $600 or more total per order are taxable
    const TAX_THRESHOLD = 600;
    const taxR = parseFloat(taxSettings.taxRate) || 0;
    const exR = parseFloat(taxSettings.exchangeRate) || 0;

    // ── Group winners by order ──
    const orderGroupsMap = new Map<string, OrderGroup>();
    for (const w of winners) {
        const orderId = w.order_line?.order_id || 'unknown';
        if (!orderGroupsMap.has(orderId)) {
            orderGroupsMap.set(orderId, {
                orderId,
                orderNumber: w.order_info?.order_number || 'N/A',
                user: w.order_info?.user || null,
                profile: w.order_info?.profile || null,
                purchasedAt: w.order_info?.purchased_at || null,
                lines: [],
                totalPrizeUSD: 0,
            });
        }
        const group = orderGroupsMap.get(orderId)!;
        group.lines.push(w);
        group.totalPrizeUSD += (w.prize_amount || 0);
    }
    const orderGroups = Array.from(orderGroupsMap.values());



    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Link href="/admin/draw-results" style={{ color: 'var(--text)', display: 'flex' }}>
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                        {lotteryName === 'Powerball' ? '🔴' : '🟡'} ผลรางวัล {lotteryName}
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        วันที่ {formatDrawDate(drawResult.draw_date)} — บันทึก {formatDateTimeThai(drawResult.created_at)}
                    </p>
                </div>
            </div>

            {/* Winning Numbers Display */}
            <div className="card" style={{
                textAlign: 'center',
                padding: 20,
                marginBottom: 20,
                background: 'linear-gradient(135deg, rgba(59,89,152,0.04), rgba(59,89,152,0.01))',
            }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
                    ตัวเลขที่ออก
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {drawResult.winning_numbers.map((num, i) => (
                        <span key={i} style={{
                            width: 44, height: 44, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 16,
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(59,89,152,0.3)',
                        }}>
                            {num}
                        </span>
                    ))}
                    {drawResult.special_number !== null && (
                        <>
                            <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>+</span>
                            <span style={{
                                width: 44, height: 44, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 16,
                                background: isJackpot
                                    ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: isJackpot ? '#fff' : '#1a1a1a',
                                boxShadow: isJackpot ? '0 2px 8px rgba(231,76,60,0.3)' : '0 2px 8px rgba(217,119,6,0.35)',
                            }}>
                                {drawResult.special_number}
                            </span>
                        </>
                    )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    {specialLabel}: {drawResult.special_number}
                </div>
            </div>



            {/* ── Per-Order Prize Sections ── */}
            {orderGroups.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                    {orderGroups.map((og) => {
                        const orderTaxable = og.totalPrizeUSD >= TAX_THRESHOLD;
                        const orderTax = orderTaxable && taxR > 0 ? og.totalPrizeUSD * (taxR / 100) : 0;
                        const orderNet = og.totalPrizeUSD - orderTax;
                        const orderTHB = exR > 0 ? orderNet * exR : 0;

                        return (
                            <div key={og.orderId} style={{
                                border: '1px solid var(--border)',
                                borderRadius: 14,
                                overflow: 'hidden',
                            }}>
                                {/* ── Order Header ── */}
                                <div style={{
                                    background: orderTaxable
                                        ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))'
                                        : 'linear-gradient(135deg, rgba(39,174,96,0.06), rgba(39,174,96,0.02))',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <ShoppingCart size={14} color="var(--primary)" />
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700 }}>
                                                    {og.user?.display_name || 'ไม่ทราบชื่อ'}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                    {og.orderNumber}
                                                    {og.purchasedAt && ` • ซื้อเมื่อ ${formatDateTimeThai(og.purchasedAt)}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                ถูกรางวัล {og.lines.length} Line{og.lines.length > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Individual winning lines ── */}
                                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {og.lines.map((w) => (
                                        <div key={w.id} className="card" style={{
                                            borderLeft: '4px solid var(--success)',
                                            padding: 14,
                                        }}>
                                            {/* Prize Info */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                                    🎯 {w.prize_tier?.prize_name || ''}
                                                </div>
                                                <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
                                                    {w.prize_tier?.prize_name?.toLowerCase().includes('jackpot') && (w.prize_amount || 0) === 0
                                                        ? 'JACKPOT!'
                                                        : `$${(w.prize_amount || 0).toLocaleString()}`}
                                                </div>
                                            </div>

                                            {/* Numbers with highlight */}
                                            <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                                                {w.order_line?.numbers.map((num, i) => {
                                                    const isMatched = w.matched_numbers.includes(num);
                                                    return (
                                                        <span key={i} style={{
                                                            width: 26, height: 26, borderRadius: '50%',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 11, fontWeight: 700,
                                                            background: isMatched
                                                                ? 'linear-gradient(135deg, var(--success), #27ae60)'
                                                                : 'var(--bg)',
                                                            color: isMatched ? '#fff' : 'var(--text-muted)',
                                                            border: isMatched ? 'none' : '1px solid var(--border)',
                                                        }}>
                                                            {num}
                                                        </span>
                                                    );
                                                })}
                                                {w.order_line?.special_number !== null && (
                                                    <>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>+</span>
                                                        <span style={{
                                                            width: 26, height: 26, borderRadius: '50%',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 11, fontWeight: 700,
                                                            background: w.matched_special
                                                                ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                                                : 'var(--bg)',
                                                            color: w.matched_special ? '#fff' : 'var(--text-muted)',
                                                            border: w.matched_special ? 'none' : '1px solid var(--border)',
                                                        }}>
                                                            {w.order_line?.special_number}
                                                        </span>
                                                    </>
                                                )}
                                                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                                                    ({w.match_count} ตรง{w.matched_special ? ` + ${specialLabel}` : ''})
                                                </span>
                                            </div>

                                            {/* ── PRIZE TRANSFER SECTION ── */}
                                            <div style={{ marginTop: 4 }}>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ fontSize: 11, padding: '4px 10px', flex: 1 }}
                                                        onClick={() => setViewBankInfo(viewBankInfo === w.id ? null : w.id)}
                                                    >
                                                        💳 ดูบัญชีเพื่อโอนเงิน
                                                    </button>
                                                    <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                                                        {w.transfer_slip_url ? (
                                                            <a
                                                                href={w.transfer_slip_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-success"
                                                                style={{ fontSize: 11, padding: '4px 10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}
                                                            >
                                                                ✅ ดูสลิป (โอนเมื่อ {formatDate(w.transferred_at!)})
                                                            </a>
                                                        ) : (
                                                            <label className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', width: '100%', textAlign: 'center', cursor: uploadingSlip === w.id ? 'not-allowed' : 'pointer' }}>
                                                                {uploadingSlip === w.id ? 'กำลังแนบสลิป...' : '📤 แนบสลิปการโอนเงิน'}
                                                                <input
                                                                    type="file"
                                                                    accept="image/jpeg,image/png,image/webp"
                                                                    style={{ display: 'none' }}
                                                                    onChange={(e) => {
                                                                        if (e.target.files && e.target.files.length > 0) {
                                                                            handleUploadSlip(w.id, e.target.files[0]);
                                                                        }
                                                                    }}
                                                                    disabled={uploadingSlip === w.id}
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>

                                                {viewBankInfo === w.id && (
                                                    <div style={{
                                                        marginTop: 8,
                                                        padding: '10px 12px',
                                                        background: '#f8fafc',
                                                        borderRadius: 8,
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: 12
                                                    }}>
                                                        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--primary)' }}>ข้อมูลการรับเงิน:</div>
                                                        {og.profile?.bank_name ? (
                                                            <>
                                                                <div style={{ marginBottom: 2 }}><strong>ธนาคาร:</strong> {og.profile.bank_name}</div>
                                                                <div style={{ marginBottom: 2 }}><strong>เลขที่บัญชี:</strong> {og.profile.bank_account_number || '-'}</div>
                                                                <div><strong>เลขพร้อมเพย์:</strong> {og.profile.promptpay_number || '-'}</div>
                                                            </>
                                                        ) : (
                                                            <div style={{ color: 'var(--danger)', fontSize: 11 }}>!! ผู้ใช้งานยังไม่ได้ตั้งค่าข้อมูลบัญชี !!</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Order Financial Summary Footer ── */}
                                <div style={{
                                    background: orderTaxable
                                        ? 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(239,68,68,0.01))'
                                        : 'linear-gradient(135deg, rgba(39,174,96,0.06), rgba(39,174,96,0.02))',
                                    borderTop: '1px solid var(--border)',
                                    padding: '12px 16px',
                                }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        💰 สรุปรางวัล — {og.orderNumber}
                                    </div>

                                    {/* Prize list */}
                                    {og.lines.map((line) => (
                                        <div key={line.id} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            fontSize: 12, color: 'var(--text-muted)', paddingLeft: 4, marginBottom: 3,
                                        }}>
                                            <span>• {line.prize_tier?.prize_name || `${line.match_count} Match`}</span>
                                            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                                                ${(line.prize_amount || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Subtotal + Tax + Net */}
                                    <div style={{ borderTop: '1px dashed var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>รวมเงินรางวัล ({og.lines.length} Line{og.lines.length > 1 ? 's' : ''})</span>
                                            <strong style={{ color: 'var(--text)' }}>
                                                ${og.totalPrizeUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </strong>
                                        </div>

                                        {orderTaxable && taxR > 0 ? (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                        หักภาษี {taxSettings.taxRate}%
                                                        <span style={{ fontSize: 10 }}> (ยอดรวม ≥ ${TAX_THRESHOLD.toLocaleString()})</span>
                                                    </span>
                                                    <strong style={{ color: 'var(--danger)' }}>
                                                        -${orderTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                                                    <span style={{ color: 'var(--text)' }}>ยอดสุทธิ (หลังหักภาษี)</span>
                                                    <span style={{ color: 'var(--success)' }}>
                                                        ${orderNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>
                                                    ✅ ยอดรวมไม่ถึง ${TAX_THRESHOLD.toLocaleString()} — ไม่หักภาษี
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                                                    <span style={{ color: 'var(--text)' }}>ยอดสุทธิ</span>
                                                    <span style={{ color: 'var(--success)' }}>
                                                        ${og.totalPrizeUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {exR > 0 && (
                                            <>
                                                <div style={{ borderTop: '1px dashed var(--border)', margin: '4px 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                                    <span>เรทเงิน</span>
                                                    <span>$1 = ฿{exR}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                                                    <span style={{ color: 'var(--success)' }}>ยอดที่ต้องโอน (THB)</span>
                                                    <span style={{ color: 'var(--success)', fontSize: 17 }}>
                                                        ฿{orderTHB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* No winners message */}
            {winners.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 20, color: 'var(--text-muted)' }}>
                    ไม่มีผู้ถูกรางวัลในงวดนี้
                </div>
            )}

            {/* Non-winners Section */}
            {losers.length > 0 && (
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)' }}>
                        ไม่ถูกรางวัล ({losers.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {losers.slice(0, 20).map((l) => (
                            <div key={l.id} className="card" style={{ padding: 10, opacity: 0.7 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User size={12} color="var(--text-muted)" />
                                        <span style={{ fontSize: 12 }}>
                                            {l.order_info?.user?.display_name || 'ไม่ทราบชื่อ'}
                                        </span>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                            (ID: {l.order_info?.user?.line_user_id?.slice(0, 8)}...)
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        {l.order_line?.numbers.map((num, i) => {
                                            const isMatched = l.matched_numbers.includes(num);
                                            return (
                                                <span key={i} style={{
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 9, fontWeight: 600,
                                                    background: isMatched ? 'rgba(39,174,96,0.15)' : 'var(--bg)',
                                                    color: isMatched ? 'var(--success)' : 'var(--text-muted)',
                                                    border: '1px solid var(--border)',
                                                }}>
                                                    {num}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {losers.length > 20 && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                                +{losers.length - 20} รายการอื่นๆ
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
