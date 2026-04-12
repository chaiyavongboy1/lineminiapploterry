'use client';

import { useEffect, useState } from 'react';
import { useLine } from '@/components/LineProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Zap, Calendar, DollarSign, ChevronRight, Ticket, Star, ChevronDown, BookOpen, Sparkles, Gift, Shield, TrendingUp, Clock } from 'lucide-react';
import LotteryLogo from '@/components/LotteryLogo';
import Modal from '@/components/Modal';
import type { LotteryType } from '@/types';
import { getContentSections, type ContentSection } from '@/lib/content-data';
import Link from 'next/link';

function getNextDrawDate(drawDays: string[]): string {
    const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
    };
    const now = new Date();
    const today = now.getDay();
    const drawDayNumbers = drawDays.map(d => dayMap[d.toLowerCase()]).filter(n => n !== undefined);
    if (drawDayNumbers.length === 0) return 'TBD';
    let minDays = 8;
    for (const dayNum of drawDayNumbers) {
        let diff = dayNum - today;
        if (diff <= 0) diff += 7;
        if (diff < minDays) minDays = diff;
    }
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + minDays);
    return nextDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getDrawDaysLabel(drawDays: string[]): string {
    const dayLabels: Record<string, string> = {
        monday: 'จันทร์', tuesday: 'อังคาร', wednesday: 'พุธ',
        thursday: 'พฤหัสบดี', friday: 'ศุกร์', saturday: 'เสาร์', sunday: 'อาทิตย์',
    };
    return drawDays.map(d => dayLabels[d.toLowerCase()] || d).join(', ');
}

/* ── CMS Content Preview ── */
function ContentSectionsPreview() {
    const [sections, setSections] = useState<ContentSection[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const all = getContentSections();
        setSections(all.filter(s => s.is_visible).sort((a, b) => a.sort_order - b.sort_order).slice(0, 4));
    }, []);

    if (sections.length === 0) return null;

    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="icon-box icon-box-grad-blue" style={{ width: 32, height: 32, borderRadius: 10 }}>
                        <BookOpen size={15} color="#fff" />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>ข้อมูลสำคัญ</h2>
                </div>
                <Link href="/info" style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue-500)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                    ดูทั้งหมด <ChevronRight size={13} />
                </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sections.map((section) => {
                    const isExpanded = expandedId === section.id;
                    return (
                        <div key={section.id} style={{
                            background: isExpanded ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(16px)',
                            borderRadius: 16, overflow: 'hidden',
                            border: isExpanded ? '2px solid rgba(74,158,255,0.22)' : '1.5px solid rgba(74,158,255,0.08)',
                            boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                            transition: 'all 0.3s ease',
                        }}>
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    gap: 12, padding: '14px 16px',
                                    background: isExpanded ? 'linear-gradient(135deg, rgba(224,239,255,0.5), rgba(199,226,255,0.3))' : 'transparent',
                                    border: 'none', cursor: 'pointer', textAlign: 'left',
                                    transition: 'background 0.3s ease',
                                }}
                            >
                                <span style={{
                                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18,
                                    background: isExpanded ? 'var(--grad-primary)' : 'rgba(74,158,255,0.06)',
                                    transition: 'all 0.3s ease',
                                }}>
                                    {section.icon}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: isExpanded ? 'var(--blue-600)' : 'var(--text)' }}>
                                        {section.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {section.subtitle}
                                    </div>
                                </div>
                                <ChevronDown size={16} color="var(--text-dim)"
                                    style={{ transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                                />
                            </button>
                            <div style={{ maxHeight: isExpanded ? 2000 : 0, overflow: 'hidden', transition: 'max-height 0.4s ease' }}>
                                <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(74,158,255,0.06)' }}>
                                    <div style={{ paddingTop: 12, fontSize: 13, lineHeight: 1.75, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                                        {section.content.split(/(\[IMG:[^\]]+\])/g).map((part, i) => {
                                            const imgMatch = part.match(/^\[IMG:(.+)\]$/);
                                            if (imgMatch) return <img key={i} src={imgMatch[1]} alt="" style={{ maxWidth: '100%', borderRadius: 12, margin: '8px 0', display: 'block' }} />;
                                            return <span key={i}>{part}</span>;
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function HomePage() {
    const { profile, isLoggedIn, isReady } = useLine();
    const router = useRouter();
    const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLottery, setSelectedLottery] = useState<LotteryType | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        async function fetchLotteryTypes() {
            try {
                const supabase = createClient();
                const { data } = await supabase.from('lottery_types').select('*').eq('is_active', true).order('created_at', { ascending: true });
                if (data && data.length > 0) setLotteryTypes(data as LotteryType[]);
            } catch (err) {
                console.error('Failed to fetch lottery types:', err);
            } finally { setLoading(false); }
        }
        fetchLotteryTypes();
    }, []);

    const handleSelectLottery = (lottery: LotteryType) => { setSelectedLottery(lottery); setShowModal(true); };
    const handleProceed = () => { if (!selectedLottery) return; setShowModal(false); router.push(`/lottery/${selectedLottery.id}`); };

    if (!isReady) return (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div className="loading-spinner" />
        </div>
    );

    /* Lottery card configs - pastel themed */
    const cardStyles: Record<string, { bg: string; glow: string; chip: string; chipText: string; accent: string; borderColor: string }> = {
        powerball: {
            bg: 'linear-gradient(150deg, rgba(255,240,242,0.9) 0%, rgba(255,228,232,0.85) 50%, rgba(255,245,246,0.8) 100%)',
            glow: 'rgba(240,96,112,0.10)',
            chip: 'linear-gradient(135deg, rgba(255,228,232,0.95), rgba(255,200,210,0.9))',
            chipText: '#c02040',
            accent: '#e84060',
            borderColor: 'rgba(240,96,112,0.15)',
        },
        megamillions: {
            bg: 'linear-gradient(150deg, rgba(255,252,240,0.9) 0%, rgba(255,248,219,0.85) 50%, rgba(255,250,230,0.8) 100%)',
            glow: 'rgba(240,180,41,0.10)',
            chip: 'linear-gradient(135deg, rgba(255,248,219,0.95), rgba(255,230,170,0.9))',
            chipText: '#a07008',
            accent: '#d99a06',
            borderColor: 'rgba(240,180,41,0.15)',
        },
    };

    return (
        <div className="fade-in">

            {/* ═══════ Hero — Glassmorphism ═══════ */}
            <div style={{
                background: 'linear-gradient(160deg, rgba(224,239,255,0.9) 0%, rgba(240,247,255,0.85) 30%, rgba(230,243,255,0.8) 60%, rgba(240,250,255,0.85) 100%)',
                backdropFilter: 'blur(20px) saturate(1.3)',
                border: '2px solid rgba(74,158,255,0.12)',
                borderRadius: 26,
                padding: '24px 20px',
                marginBottom: 22,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
            }}>
                {/* Decorative floating orbs */}
                <div style={{ position: 'absolute', top: -50, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,158,255,0.20) 0%, transparent 65%)', pointerEvents: 'none', animation: 'float 6s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: -35, left: 0, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(92,194,255,0.15) 0%, transparent 65%)', pointerEvents: 'none', animation: 'float 8s ease-in-out infinite 1s' }} />
                <div style={{ position: 'absolute', top: 25, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,131,239,0.10) 0%, transparent 65%)', pointerEvents: 'none', animation: 'float 7s ease-in-out infinite 0.5s' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Logo & Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 20,
                            background: 'var(--grad-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: 'var(--shadow-blue)',
                            animation: 'float 3s ease-in-out infinite',
                        }}>
                            <Ticket size={28} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: 24, fontWeight: 900,
                                background: 'linear-gradient(135deg, #3085f0, #4a9eff, #5cc2ff)',
                                backgroundSize: '200% auto',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.02em', lineHeight: 1.15,
                            }}>
                                American Lottery
                            </h1>
                            <p style={{ fontSize: 13, color: 'var(--blue-600)', fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                🇺🇸 ซื้อหวยอเมริกาผ่าน LINE
                            </p>
                        </div>
                    </div>

                    {/* Greeting Pill */}
                    {isLoggedIn && profile && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '6px 14px',
                            background: 'rgba(255,255,255,0.80)',
                            borderRadius: 30,
                            border: '1.5px solid rgba(74,158,255,0.12)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 2px 10px rgba(74,158,255,0.06)',
                        }}>
                            {profile.pictureUrl ? (
                                <img src={profile.pictureUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(74,158,255,0.15)' }} />
                            ) : (
                                <div style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: 'var(--grad-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, color: '#fff', fontWeight: 800,
                                }}>
                                    {profile.displayName?.charAt(0) || '?'}
                                </div>
                            )}
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-600)' }}>
                                สวัสดี, {profile.displayName}! 👋
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════ Lottery Cards ═══════ */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div className="icon-box icon-box-grad-blue" style={{ width: 32, height: 32, borderRadius: 10 }}>
                        <Star size={15} color="#fff" />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 800 }}>เลือกหวยที่ต้องการ</h2>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 20 }} />)}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {lotteryTypes.map((lottery, idx) => {
                            const key = lottery.name.toLowerCase().includes('powerball') ? 'powerball' : 'megamillions';
                            const s = cardStyles[key] || cardStyles.megamillions;

                            return (
                                <button key={lottery.id} onClick={() => handleSelectLottery(lottery)}
                                    style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', animation: `slideUp 0.5s cubic-bezier(0.22,0.61,0.36,1) ${idx * 0.12}s both` }}>
                                    <div style={{
                                        background: s.bg,
                                        backdropFilter: 'blur(16px)',
                                        border: `2px solid ${s.borderColor}`,
                                        borderRadius: 22, padding: '18px 18px',
                                        display: 'flex', gap: 16, alignItems: 'center',
                                        position: 'relative', overflow: 'hidden',
                                        boxShadow: `0 6px 24px ${s.glow}, var(--shadow-sm)`,
                                        transition: 'all 0.3s cubic-bezier(0.22,0.61,0.36,1)',
                                    }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 36px ${s.glow}, var(--shadow-md)`; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${s.glow}, var(--shadow-sm)`; }}
                                    >
                                        {/* Glass shine */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)', borderRadius: '22px 22px 0 0', pointerEvents: 'none' }} />
                                        <div style={{ position: 'absolute', right: -25, top: -25, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${s.glow} 0%, transparent 65%)`, pointerEvents: 'none' }} />

                                        <LotteryLogo type={lottery.name} size={60} />

                                        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                                            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6, color: '#1a2740' }}>{lottery.name}</h3>

                                            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Calendar size={11} color={s.accent} />
                                                    {getDrawDaysLabel(lottery.draw_days)}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <DollarSign size={11} color={s.accent} />
                                                    ฿{(lottery.price_per_line + lottery.service_fee).toLocaleString()}/Line
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{
                                            width: 34, height: 34, borderRadius: 11,
                                            background: `rgba(74,158,255,0.06)`,
                                            border: `1.5px solid rgba(74,158,255,0.12)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <ChevronRight size={18} color={s.accent} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ═══════ How To Play — Glass Card ═══════ */}
            <div style={{
                background: 'linear-gradient(150deg, rgba(224,239,255,0.7) 0%, rgba(240,250,255,0.6) 100%)',
                backdropFilter: 'blur(16px)',
                border: '2px solid rgba(74,158,255,0.10)',
                borderRadius: 22, padding: '20px 18px',
                marginBottom: 24, boxShadow: 'var(--shadow-md)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div className="icon-box icon-box-grad-sky" style={{ width: 32, height: 32, borderRadius: 10 }}>
                        <Zap size={15} color="#fff" />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 800 }}>วิธีการเล่น</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        { step: '01', label: 'เลือกหวย', icon: <Ticket size={20} />, bg: 'linear-gradient(135deg, rgba(224,239,255,0.85), rgba(199,226,255,0.7))', border: 'rgba(74,158,255,0.15)', color: '#3085f0' },
                        { step: '02', label: 'เลือกเลข', icon: <Sparkles size={20} />, bg: 'linear-gradient(135deg, rgba(255,252,240,0.9), rgba(255,248,219,0.8))', border: 'rgba(240,180,41,0.18)', color: '#a07008' },
                        { step: '03', label: 'ชำระเงิน', icon: <Shield size={20} />,   bg: 'linear-gradient(135deg, rgba(216,251,230,0.85), rgba(240,253,246,0.8))', border: 'rgba(34,201,112,0.18)', color: '#10a85c' },
                        { step: '04', label: 'รอผลรางวัล', icon: <Gift size={20} />,   bg: 'linear-gradient(135deg, rgba(224,244,255,0.85), rgba(194,234,255,0.7))', border: 'rgba(54,176,240,0.18)', color: '#0c7ab0' },
                    ].map(item => (
                        <div key={item.step} style={{
                            background: item.bg, border: `1.5px solid ${item.border}`,
                            borderRadius: 16, padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
                            boxShadow: 'var(--shadow-xs)',
                            backdropFilter: 'blur(8px)',
                        }}>
                            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
                                {item.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 800, color: item.color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>STEP {item.step}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{item.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════ CMS Content ═══════ */}
            <ContentSectionsPreview />

            {/* ═══════ Modal — Glass Style ═══════ */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedLottery?.name || ''}>
                {selectedLottery && (() => {
                    const key = selectedLottery.name.toLowerCase().includes('powerball') ? 'powerball' : 'megamillions';
                    const s = cardStyles[key] || cardStyles.megamillions;

                    return (
                        <div>
                            {/* Modal hero */}
                            <div style={{
                                borderRadius: 20, marginBottom: 18,
                                border: `2px solid ${s.borderColor}`, position: 'relative', overflow: 'hidden',
                                height: 180, background: s.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '16px 24px',
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedLottery.name.toLowerCase().includes('powerball') ? '/powerball-logo.png' : '/megamillions-logo.png'}
                                    alt={selectedLottery.name}
                                    style={{
                                        width: '100%', height: '100%',
                                        objectFit: 'contain',
                                        objectPosition: 'center',
                                        display: 'block',
                                    }}
                                />
                            </div>

                            {/* Draw info */}
                            <div className="card-blue" style={{ marginBottom: 14, boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <div className="icon-box icon-box-grad-blue" style={{ width: 30, height: 30, borderRadius: 9 }}>
                                        <Clock size={14} color="#fff" />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รอบรางวัลถัดไป</span>
                                </div>
                                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--blue-600)', paddingLeft: 2 }}>{getNextDrawDate(selectedLottery.draw_days)}</p>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 2 }}>ออกรางวัลทุกวัน{getDrawDaysLabel(selectedLottery.draw_days)}</p>
                            </div>

                            {/* Price */}
                            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(74,158,255,0.08)', borderRadius: 16, padding: '16px', marginBottom: 18 }}>
                                {[
                                    { label: 'ราคาต่อ Line', value: `฿${selectedLottery.price_per_line.toLocaleString()}`, icon: '💰' },
                                    { label: 'ค่าบริการ',   value: `฿${selectedLottery.service_fee.toLocaleString()}`,    icon: '🛎️' },
                                    { label: 'เลือกเลข', value: `${selectedLottery.numbers_to_pick} ตัว (1-${selectedLottery.max_number})${selectedLottery.max_special_number ? ` + พิเศษ (1-${selectedLottery.max_special_number})` : ''}`, icon: '🔢' },
                                ].map((row, i, arr) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        paddingBottom: i < arr.length - 1 ? 12 : 0,
                                        marginBottom: i < arr.length - 1 ? 12 : 0,
                                        borderBottom: i < arr.length - 1 ? '1px solid rgba(74,158,255,0.05)' : 'none',
                                    }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><span>{row.icon}</span>{row.label}</span>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="btn btn-primary btn-full" style={{ padding: '16px 24px', fontSize: 15, fontWeight: 800, borderRadius: 16 }} onClick={handleProceed} disabled={!isLoggedIn}>
                                <Ticket size={18} /> เลือกเลข →
                            </button>

                            {!isLoggedIn && (
                                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--rose-500)', marginTop: 12, fontWeight: 600 }}>
                                    ⚠️ กรุณาเปิดผ่าน LINE Mini App เพื่อเข้าสู่ระบบ
                                </p>
                            )}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
