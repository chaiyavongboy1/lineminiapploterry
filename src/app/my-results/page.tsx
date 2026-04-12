'use client';

import { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Trophy, Calendar, DollarSign, ArrowLeft, FileText, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import LotteryLogo from '@/components/LotteryLogo';
import Modal from '@/components/Modal';
import Link from 'next/link';
import type { DrawResult, OrderLineResult, TicketImage, PrizeTransferSlip } from '@/types';

interface ResultItem {
    draw_result: DrawResult & { lottery_type: { name: string; id: string } };
    order_line_results: (OrderLineResult & {
        order_line: { numbers: number[]; special_number: number | null; order_id: string };
        prize_tier: { prize_name: string } | null;
    })[];
    ticket_images: TicketImage[];
    prize_transfer_slips: PrizeTransferSlip[];
    order_number: string;
}

// Determine if a prize tier is taxable based on lottery type and tier
// Powerball: Tier 1 (Jackpot), Tier 2 (5 Match), Tier 3 (4+PB) → taxable
// Mega Millions: Tier 1 (Jackpot), Tier 2 (5 Match) → taxable
function isTaxablePrize(lotteryName: string, tierOrder: number | undefined): boolean {
    if (!tierOrder) return false;
    if (lotteryName === 'Powerball') return tierOrder <= 3;
    if (lotteryName === 'Mega Millions') return tierOrder <= 2;
    return false;
}

export default function MyResultsPage() {
    const { profile, isLoggedIn, isReady } = useLine();
    const [results, setResults] = useState<ResultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedResult, setExpandedResult] = useState<string | null>(null);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [exchangeRate, setExchangeRate] = useState<number>(0);
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImages, setModalImages] = useState<string[]>([]);
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        if (!isReady) return;
        if (!profile?.userId) {
            setLoading(false);
            return;
        }

        async function fetchResults() {
            try {
                // Fetch user results via API bypassing RLS
                const response = await fetch(`/api/results?lineUserId=${profile!.userId}`);
                const resData = await response.json();

                if (!resData.success) {
                    throw new Error(resData.error || 'Failed to fetch results');
                }

                const { userResults, ticketImages, prizeTransferSlips, settings } = resData.data;

                // Group by draw_result
                const grouped = new Map<string, ResultItem>();

                for (const r of userResults) {
                    const dr = r.draw_result as ResultItem['draw_result'];
                    const ol = r.order_line as ResultItem['order_line_results'][0]['order_line'];
                    const orderData = (r.order_line as Record<string, unknown>)?.order as Record<string, unknown>;
                    const key = dr.id;

                    if (!grouped.has(key)) {
                        const orderId = ol.order_id;
                        grouped.set(key, {
                            draw_result: dr,
                            order_line_results: [],
                            ticket_images: ticketImages.filter((t: any) => t.order_id === orderId) as TicketImage[],
                            prize_transfer_slips: prizeTransferSlips.filter((s: any) => s.order_id === orderId) as PrizeTransferSlip[],
                            order_number: (orderData?.order_number as string) || '',
                        });
                    }

                    grouped.get(key)!.order_line_results.push({
                        ...r,
                        order_line: ol,
                        prize_tier: r.prize_tier as ResultItem['order_line_results'][0]['prize_tier'],
                    } as ResultItem['order_line_results'][0]);
                }

                setResults(Array.from(grouped.values()));

                if (settings) {
                    setTaxRate(settings.taxRate || 0);
                    setExchangeRate(settings.exchangeRate || 0);
                }
            } catch (err) {
                console.error('Failed to fetch results:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [isReady, profile]);

    const showImages = (images: string[], title: string) => {
        setModalImages(images);
        setModalTitle(title);
        setShowImageModal(true);
    };

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
                <Trophy size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>กรุณาเข้าสู่ระบบ</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>เปิดผ่าน LINE Mini App เพื่อดูผลรางวัล</p>
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
                    <h1 style={{ fontSize: 20, fontWeight: 700 }}>ผลรางวัล</h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>ตรวจผลรางวัลของคุณ</p>
                </div>
            </div>

            {results.length === 0 ? (
                <div className="card-static" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <Trophy size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>ยังไม่มีผลรางวัล</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                        เมื่อมีการออกรางวัลและเลขของคุณตรง ผลจะแสดงที่นี่
                    </p>
                    <Link href="/" className="btn btn-primary" style={{ fontSize: 14 }}>
                        ไปซื้อหวย
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {results.map((result, idx) => {
                        const isExpanded = expandedResult === result.draw_result.id;
                        const totalPrize = result.order_line_results.reduce(
                            (sum, r) => sum + (r.prize_amount || 0), 0
                        );
                        const lotteryName = result.draw_result.lottery_type?.name || '';
                        // Check if any line result in this group is taxable
                        const taxableLines = result.order_line_results.filter(r => {
                            const tierOrder = (r.prize_tier as any)?.tier_order;
                            return isTaxablePrize(lotteryName, tierOrder);
                        });
                        const hasTaxableWin = taxableLines.length > 0;
                        const taxablePrizeTotal = taxableLines.reduce((sum, r) => sum + (r.prize_amount || 0), 0);
                        const nonTaxablePrizeTotal = totalPrize - taxablePrizeTotal;

                        return (
                            <div
                                key={result.draw_result.id}
                                className="winner-card"
                                style={{
                                    animation: `slideUp 0.4s ease-out ${idx * 0.1}s both`,
                                }}
                            >
                                {/* Header Row */}
                                <button
                                    onClick={() => setExpandedResult(isExpanded ? null : result.draw_result.id)}
                                    style={{
                                        all: 'unset',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        width: '100%',
                                    }}
                                >
                                    <LotteryLogo type={lotteryName} size={44} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{lotteryName}</h3>
                                            <span style={{
                                                fontSize: 10,
                                                padding: '2px 8px',
                                                borderRadius: 8,
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                color: '#34d399',
                                                fontWeight: 600,
                                            }}>
                                                🏆 ถูกรางวัล
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 12,
                                            color: 'var(--text-muted)',
                                            marginTop: 2,
                                        }}>
                                            <Calendar size={11} />
                                            งวดวันที่ {new Date(result.draw_result.draw_date).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </div>
                                        {result.order_number && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                ออร์เดอร์: {result.order_number}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: 18,
                                            fontWeight: 800,
                                            color: 'var(--success)',
                                        }}>
                                            {result.order_line_results.some(r => r.prize_tier?.prize_name?.toLowerCase().includes('jackpot') && r.prize_amount === 0) 
                                                ? 'JACKPOT!' 
                                                : `$${totalPrize.toLocaleString()}`}
                                        </div>
                                        {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                                        {/* Winning Numbers */}
                                        <div style={{ marginBottom: 12 }}>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                                                ผลลอตเตอรี่ ({new Date(result.draw_result.draw_date).toLocaleDateString('en-US')})
                                            </p>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {result.draw_result.winning_numbers.map((n, i) => (
                                                    <div key={i} className="number-ball mini selected">{n}</div>
                                                ))}
                                                {result.draw_result.special_number !== null && (
                                                    <div className="number-ball mini special selected">
                                                        {result.draw_result.special_number}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Each winning line */}
                                        {result.order_line_results.map((olr, i) => (
                                            <div key={olr.id} style={{
                                                background: 'rgba(16, 185, 129, 0.06)',
                                                borderRadius: 10,
                                                padding: '10px 12px',
                                                marginBottom: 8,
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 6,
                                                }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                                                        🎯 {olr.prize_tier?.prize_name || `ถูก ${olr.match_count} ตัว`}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 14,
                                                        fontWeight: 700,
                                                        color: 'var(--success)',
                                                    }}>
                                                        {olr.prize_tier?.prize_name?.toLowerCase().includes('jackpot') && olr.prize_amount === 0 
                                                            ? 'JACKPOT!' 
                                                            : `$${olr.prize_amount.toLocaleString()}`}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    {olr.order_line.numbers.map((n, j) => (
                                                        <span key={j} style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: olr.matched_numbers.includes(n)
                                                                ? 'var(--success)'
                                                                : 'rgba(148, 163, 184, 0.2)',
                                                            color: olr.matched_numbers.includes(n) ? '#fff' : 'var(--text-muted)',
                                                        }}>
                                                            {n}
                                                        </span>
                                                    ))}
                                                    {olr.order_line.special_number !== null && (
                                                        <span style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: olr.matched_special
                                                                ? 'var(--accent)'
                                                                : 'rgba(148, 163, 184, 0.2)',
                                                            color: olr.matched_special ? '#ffffff' : 'var(--text-muted)',
                                                        }}>
                                                            {olr.order_line.special_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Tax & Currency Section */}
                                        {(hasTaxableWin || exchangeRate > 0) && (
                                            <div style={{
                                                background: hasTaxableWin ? 'rgba(239, 68, 68, 0.06)' : 'rgba(59,130,246,0.06)',
                                                border: `1px solid ${hasTaxableWin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59,130,246,0.15)'}`,
                                                borderRadius: 10,
                                                padding: '12px',
                                                marginTop: 8,
                                            }}>
                                                <p style={{
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    marginBottom: 8,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    <FileText size={14} color={hasTaxableWin ? 'var(--danger)' : 'var(--primary)'} />
                                                    {hasTaxableWin ? 'ข้อมูลภาษี & สกุลเงิน' : 'ข้อมูลสกุลเงิน'}
                                                </p>

                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: 12,
                                                    marginBottom: 4,
                                                }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>เงินรางวัล (USD)</span>
                                                    <span style={{ fontWeight: 600 }}>${totalPrize.toLocaleString()}</span>
                                                </div>

                                                {hasTaxableWin && taxRate > 0 && (
                                                    <>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontSize: 12,
                                                            marginBottom: 4,
                                                        }}>
                                                            <span style={{ color: 'var(--text-muted)' }}>ส่วนที่เสียภาษี</span>
                                                            <span style={{ fontWeight: 600 }}>${taxablePrizeTotal.toLocaleString()}</span>
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontSize: 12,
                                                            marginBottom: 4,
                                                        }}>
                                                            <span style={{ color: 'var(--text-muted)' }}>ภาษี ({taxRate}%)</span>
                                                            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                                                                -${(taxablePrizeTotal * taxRate / 100).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}

                                                {exchangeRate > 0 && (() => {
                                                    const taxDeduct = hasTaxableWin && taxRate > 0 ? (taxablePrizeTotal * taxRate / 100) : 0;
                                                    const netTotal = totalPrize - taxDeduct;
                                                    const thbAmount = netTotal * exchangeRate;
                                                    return (
                                                        <>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                fontSize: 12,
                                                                marginBottom: 4,
                                                            }}>
                                                                <span style={{ color: 'var(--text-muted)' }}>อัตราแลกเปลี่ยน</span>
                                                                <span style={{ fontWeight: 600 }}>1 USD = {exchangeRate} THB</span>
                                                            </div>
                                                            <div className="divider" style={{ margin: '8px 0' }} />
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                fontSize: 13,
                                                            }}>
                                                                <span style={{ fontWeight: 600 }}>ยอดรับ (โดยประมาณ)</span>
                                                                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                                                                    ฿{thbAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}

                                                {hasTaxableWin && (
                                                    <p style={{
                                                        fontSize: 10,
                                                        color: 'var(--text-muted)',
                                                        marginTop: 8,
                                                        lineHeight: 1.4,
                                                    }}>
                                                        ⚠️ ภาษีหักเฉพาะรางวัลขั้นสูง ตามกฎของ {lotteryName} จำนวนเงินที่แสดงเป็นการประมาณการเท่านั้น
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Ticket Images */}
                                        {result.ticket_images.length > 0 && (
                                            <button
                                                onClick={() => showImages(
                                                    result.ticket_images.map(t => t.image_url),
                                                    '🎫 รูป Lottery'
                                                )}
                                                className="btn btn-outline btn-full"
                                                style={{ marginTop: 10, fontSize: 13, padding: '10px' }}
                                            >
                                                <ImageIcon size={14} />
                                                ดูรูป Lottery ({result.ticket_images.length} รูป)
                                            </button>
                                        )}

                                        {/* Prize Transfer Slips */}
                                        {(() => {
                                            const slipUrls = [
                                                ...result.prize_transfer_slips.map(s => s.image_url),
                                                ...result.order_line_results.map(r => (r as any).transfer_slip_url).filter(Boolean)
                                            ];
                                            if (slipUrls.length === 0) return null;
                                            return (
                                                <div style={{ marginTop: 10 }}>
                                                    <button
                                                        onClick={() => showImages(
                                                            slipUrls,
                                                            '💸 สลิปโอนเงินรางวัล'
                                                        )}
                                                        className="btn btn-success btn-full"
                                                        style={{ fontSize: 13, padding: '10px' }}
                                                    >
                                                        <DollarSign size={14} />
                                                        ดูสลิปโอนเงิน ({slipUrls.length})
                                                    </button>
                                                    {result.prize_transfer_slips.length > 0 && result.prize_transfer_slips[0].transfer_note && (
                                                        <p style={{
                                                            fontSize: 12,
                                                            color: 'var(--text-muted)',
                                                            marginTop: 6,
                                                            textAlign: 'center',
                                                        }}>
                                                            💬 {result.prize_transfer_slips[0].transfer_note}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Image Modal */}
            <Modal
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
                title={modalTitle}
                size="lg"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {modalImages.map((url, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px',
                            background: 'rgba(59,130,246,0.06)',
                            border: '1px solid rgba(59,130,246,0.18)',
                            borderRadius: 10,
                        }}>
                            <span style={{ fontSize: 20 }}>📄</span>
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                ไฟล์ที่ {i + 1}
                            </span>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ fontSize: 13, padding: '8px 18px', whiteSpace: 'nowrap' }}
                            >
                                🔍 เปิดดู
                            </a>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
