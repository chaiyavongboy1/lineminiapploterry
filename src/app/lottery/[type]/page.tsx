'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLine } from '@/components/LineProvider';
import { createClient } from '@/lib/supabase/client';
import { generateQuickPick, formatCurrency, computeNextDrawDate } from '@/lib/utils';
import { ArrowLeft, Shuffle, Trash2, ShoppingCart, Dices, AlertCircle, User } from 'lucide-react';
import type { LotteryType, NumberSelection } from '@/types';
import Link from 'next/link';
import Modal from '@/components/Modal';
import LoadingScreen from '@/components/LoadingScreen';
import styles from './lottery.module.css';

const LINE_OPTIONS = [1, 2, 3, 5, 7, 10, 15];

function createEmptyLines(count: number): NumberSelection[] {
    return Array.from({ length: count }, (_, i) => ({
        lineNumber: i + 1,
        numbers: [],
        specialNumber: null,
        isQuickPick: false,
    }));
}

export default function LotteryPage() {
    const params = useParams();
    const router = useRouter();
    const { profile, isLoggedIn } = useLine();
    const [lottery, setLottery] = useState<LotteryType | null>(null);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState<NumberSelection[]>([]);
    const [lineCount, setLineCount] = useState(1);
    const [showProfileAlert, setShowProfileAlert] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(false);

    useEffect(() => {
        async function fetchLottery() {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('lottery_types')
                    .select('*')
                    .eq('id', params.type)
                    .single();

                if (data) {
                    setLottery(data as LotteryType);
                    setSelections(createEmptyLines(lineCount));
                }
            } catch (err) {
                console.error('Failed to fetch lottery:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchLottery();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.type]);

    // Update line count
    const handleLineCountChange = useCallback((count: number) => {
        setLineCount(count);
        setSelections(prev => {
            if (count > prev.length) {
                // Add more lines
                const extra = Array.from({ length: count - prev.length }, (_, i) => ({
                    lineNumber: prev.length + i + 1,
                    numbers: [],
                    specialNumber: null,
                    isQuickPick: false,
                }));
                return [...prev, ...extra];
            } else {
                // Trim lines
                return prev.slice(0, count).map((s, i) => ({ ...s, lineNumber: i + 1 }));
            }
        });
    }, []);

    const toggleNumber = useCallback((lineIndex: number, num: number) => {
        if (!lottery) return;
        setSelections(prev => {
            const updated = [...prev];
            const line = { ...updated[lineIndex] };
            const idx = line.numbers.indexOf(num);

            if (idx > -1) {
                line.numbers = line.numbers.filter(n => n !== num);
            } else if (line.numbers.length < lottery.numbers_to_pick) {
                line.numbers = [...line.numbers, num].sort((a, b) => a - b);
            }

            line.isQuickPick = false;
            updated[lineIndex] = line;
            return updated;
        });
    }, [lottery]);

    const toggleSpecialNumber = useCallback((lineIndex: number, num: number) => {
        setSelections(prev => {
            const updated = [...prev];
            const line = { ...updated[lineIndex] };
            line.specialNumber = line.specialNumber === num ? null : num;
            line.isQuickPick = false;
            updated[lineIndex] = line;
            return updated;
        });
    }, []);

    const handleQuickPick = useCallback((lineIndex: number) => {
        if (!lottery) return;
        const { numbers, specialNumber } = generateQuickPick(
            lottery.numbers_to_pick,
            lottery.max_number,
            lottery.max_special_number
        );

        setSelections(prev => {
            const updated = [...prev];
            updated[lineIndex] = {
                ...updated[lineIndex],
                numbers,
                specialNumber,
                isQuickPick: true,
            };
            return updated;
        });
    }, [lottery]);

    const handleQuickPickNumbers = useCallback((lineIndex: number) => {
        if (!lottery) return;
        const { numbers } = generateQuickPick(
            lottery.numbers_to_pick,
            lottery.max_number,
            null
        );

        setSelections(prev => {
            const updated = [...prev];
            updated[lineIndex] = {
                ...updated[lineIndex],
                numbers,
                isQuickPick: false,
            };
            return updated;
        });
    }, [lottery]);

    const handleQuickPickSpecial = useCallback((lineIndex: number) => {
        if (!lottery) return;
        if (!lottery.max_special_number) return;
        const specialNumber = Math.floor(Math.random() * lottery.max_special_number) + 1;

        setSelections(prev => {
            const updated = [...prev];
            updated[lineIndex] = {
                ...updated[lineIndex],
                specialNumber,
                isQuickPick: false,
            };
            return updated;
        });
    }, [lottery]);

    const handleQuickPickAll = useCallback(() => {
        if (!lottery) return;
        setSelections(prev =>
            prev.map(sel => {
                const { numbers, specialNumber } = generateQuickPick(
                    lottery.numbers_to_pick,
                    lottery.max_number,
                    lottery.max_special_number
                );
                return { ...sel, numbers, specialNumber, isQuickPick: true };
            })
        );
    }, [lottery]);

    const clearLine = useCallback((lineIndex: number) => {
        setSelections(prev => {
            const updated = [...prev];
            updated[lineIndex] = {
                ...updated[lineIndex],
                numbers: [],
                specialNumber: null,
                isQuickPick: false,
            };
            return updated;
        });
    }, []);

    const isLineComplete = (sel: NumberSelection) => {
        if (!lottery) return false;
        const hasNumbers = sel.numbers.length === lottery.numbers_to_pick;
        const hasSpecial = !lottery.max_special_number || sel.specialNumber !== null;
        return hasNumbers && hasSpecial;
    };

    const allComplete = selections.length > 0 && selections.every(isLineComplete);
    const completedCount = selections.filter(isLineComplete).length;

    const handleSubmit = async () => {
        if (!lottery || !profile || !allComplete) return;

        // Check profile banking info before proceeding
        setCheckingProfile(true);
        try {
            const res = await fetch(`/api/profile?lineUserId=${profile.userId}`);
            const result = await res.json();

            if (!result.success || !result.data?.profile) {
                setShowProfileAlert(true);
                setCheckingProfile(false);
                return;
            }

            const p = result.data.profile;
            if (!p.full_name || !p.bank_name || (!p.bank_account_number && !p.promptpay_number)) {
                setShowProfileAlert(true);
                setCheckingProfile(false);
                return;
            }
        } catch {
            // If profile check fails, allow anyway (don't block purchase)
            console.warn('Profile check failed, proceeding anyway');
        }
        setCheckingProfile(false);

        const drawDate = computeNextDrawDate(lottery.draw_days || []);

        const checkoutData = {
            lotteryId: lottery.id,
            lotteryName: lottery.name,
            pricePerLine: lottery.price_per_line,
            serviceFee: lottery.service_fee,
            lines: selections.map((s, i) => ({
                lineNumber: i + 1,
                numbers: s.numbers,
                specialNumber: s.specialNumber,
                isQuickPick: s.isQuickPick,
            })),
            drawDate,
            userId: profile.userId,
        };

        const encoded = btoa(encodeURIComponent(JSON.stringify(checkoutData)));
        router.push(`/order/checkout?data=${encoded}`);
    };

    if (loading) {
        return (
            <LoadingScreen title="เลือกเลข" subtitle="กำลังโหลดข้อมูล Lottery..." />
        );
    }

    if (!lottery) {
        return (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <p>ไม่พบข้อมูล Lottery</p>
                <Link href="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>กลับหน้าหลัก</Link>
            </div>
        );
    }

    const totalPrice = selections.length * (lottery.price_per_line + lottery.service_fee);
    const specialLabel = lottery.name === 'Powerball' ? 'Powerball' : 'Mega Ball';

    return (
        <div style={{ paddingBottom: 120 }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '20px 0 12px',
            }}>
                <Link href="/" style={{ color: 'var(--text)', display: 'flex' }}>
                    <ArrowLeft size={24} />
                </Link>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700 }}>
                        {lottery.name === 'Powerball' ? '🔴' : '🟡'} {lottery.name}
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {lottery.description || `เลือก ${lottery.numbers_to_pick} ตัวเลข (1-${lottery.max_number})${lottery.max_special_number ? ` + ${specialLabel} (1-${lottery.max_special_number})` : ''}`}
                    </p>
                    <div style={{ display: 'inline-block', background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                        รวม {formatCurrency(lottery.price_per_line + (lottery.service_fee || 0))} / Line
                    </div>
                </div>
            </div>

            {/* Login prompt */}
            {!isLoggedIn && (
                <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>กรุณาเปิดผ่าน LINE Mini App เพื่อเข้าสู่ระบบ</p>
                </div>
            )}

            {/* Lines Selector */}
            <div className={styles.linesSelector}>
                {LINE_OPTIONS.map(count => (
                    <button
                        key={count}
                        className={lineCount === count ? styles.linesOptionActive : styles.linesOption}
                        onClick={() => handleLineCountChange(count)}
                    >
                        {count} Lines
                    </button>
                ))}
            </div>

            {/* Quick Pick All */}
            <button className={styles.qpAllBtn} onClick={handleQuickPickAll}>
                <Dices size={18} />
                Quick Pick ทั้งหมด ({selections.length} Lines)
            </button>

            {/* Lines Grid */}
            <div className={styles.linesGrid}>
                {selections.map((sel, lineIndex) => (
                    <LineCard
                        key={lineIndex}
                        lineIndex={lineIndex}
                        selection={sel}
                        lottery={lottery}
                        specialLabel={specialLabel}
                        isComplete={isLineComplete(sel)}
                        onToggleNumber={toggleNumber}
                        onToggleSpecial={toggleSpecialNumber}
                        onQuickPick={handleQuickPick}
                        onQuickPickNumbers={handleQuickPickNumbers}
                        onQuickPickSpecial={handleQuickPickSpecial}
                        onClear={clearLine}
                    />
                ))}
            </div>

            {/* Sticky Order Summary */}
            <div className={styles.stickySummary}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {completedCount}/{selections.length} Lines เลือกครบ
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>
                        {formatCurrency(totalPrice)}
                    </span>
                </div>
                <button
                    className="btn btn-accent btn-full"
                    style={{ padding: '14px 24px', fontSize: 15 }}
                    onClick={handleSubmit}
                    disabled={!allComplete || !isLoggedIn}
                >
                    <ShoppingCart size={18} />
                    {checkingProfile ? 'กำลังตรวจสอบ...' : `ฝากซื้อ ${selections.length} Lines — ${formatCurrency(totalPrice)}`}
                </button>
            </div>

            {/* Profile Alert Modal */}
            <Modal
                isOpen={showProfileAlert}
                onClose={() => setShowProfileAlert(false)}
                title="กรุณากรอกข้อมูลธนาคาร"
                size="sm"
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'rgba(245, 158, 11, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <AlertCircle size={32} color="var(--warning)" />
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                        กรุณากรอกข้อมูลธนาคารก่อนทำรายการ เพื่อใช้ในการรับเงินรางวัล
                    </p>
                    <Link
                        href="/profile"
                        className="btn btn-primary btn-full"
                        style={{ padding: '14px 24px', fontSize: 15 }}
                        onClick={() => setShowProfileAlert(false)}
                    >
                        <User size={18} />
                        ไปหน้าโปรไฟล์
                    </Link>
                </div>
            </Modal>
        </div>
    );
}

/* ============================
   Line Card Component
   ============================ */
interface LineCardProps {
    lineIndex: number;
    selection: NumberSelection;
    lottery: LotteryType;
    specialLabel: string;
    isComplete: boolean;
    onToggleNumber: (lineIndex: number, num: number) => void;
    onToggleSpecial: (lineIndex: number, num: number) => void;
    onQuickPick: (lineIndex: number) => void;
    onQuickPickNumbers: (lineIndex: number) => void;
    onQuickPickSpecial: (lineIndex: number) => void;
    onClear: (lineIndex: number) => void;
}

function LineCard({
    lineIndex,
    selection,
    lottery,
    specialLabel,
    isComplete,
    onToggleNumber,
    onToggleSpecial,
    onQuickPick,
    onQuickPickNumbers,
    onQuickPickSpecial,
    onClear,
}: LineCardProps) {
    const remainingMain = lottery.numbers_to_pick - selection.numbers.length;
    const remainingSpecial = selection.specialNumber === null ? 1 : 0;

    return (
        <div className={isComplete ? styles.lineCardComplete : styles.lineCard}>
            {/* Header */}
            <div className={styles.lineCardHeader}>
                <span className={styles.lineCardTitle}>
                    Line {lineIndex + 1} {isComplete && '✓'}
                </span>
                <div className={styles.lineCardActions}>
                    <button
                        className={styles.lineCardBtnQp}
                        onClick={() => onQuickPick(lineIndex)}
                        title="Quick Pick ทั้งหมด"
                    >
                        <Shuffle size={12} />
                        QP
                    </button>
                    <button
                        className={styles.lineCardBtnClear}
                        onClick={() => onClear(lineIndex)}
                        title="Clear"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Main Numbers Label */}
            <div className={styles.gridLabelRow}>
                <div className={styles.gridLabel}>
                    {remainingMain > 0 ? `+ เลือก ${remainingMain}` : `✓ เลือกครบ ${lottery.numbers_to_pick}`}
                </div>
                <button
                    className={styles.qpSectionBtn}
                    onClick={() => onQuickPickNumbers(lineIndex)}
                    title="QP เลขด้านบน"
                >
                    <Shuffle size={10} />
                    QP
                </button>
            </div>

            {/* Main Number Grid */}
            <div className={styles.numberGridCompact}>
                {Array.from({ length: lottery.max_number }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        className={selection.numbers.includes(num) ? styles.numberCellSelected : styles.numberCell}
                        onClick={() => onToggleNumber(lineIndex, num)}
                    >
                        {num}
                    </button>
                ))}
            </div>

            {/* Separator */}
            {lottery.max_special_number && (
                <>
                    <hr className={styles.gridSeparator} />

                    {/* Special Number Label */}
                    <div className={styles.gridLabelRow}>
                        <div className={styles.gridLabel}>
                            {remainingSpecial > 0 ? `+ เลือก ${specialLabel} 1` : `✓ ${specialLabel}`}
                        </div>
                        <button
                            className={styles.qpSectionBtnSpecial}
                            onClick={() => onQuickPickSpecial(lineIndex)}
                            title={`QP ${specialLabel}`}
                        >
                            <Shuffle size={10} />
                            QP
                        </button>
                    </div>

                    {/* Special Number Grid */}
                    <div className={styles.numberGridCompact}>
                        {Array.from({ length: lottery.max_special_number }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                className={selection.specialNumber === num ? styles.numberCellSpecialSelected : styles.numberCellSpecial}
                                onClick={() => onToggleSpecial(lineIndex, num)}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
