'use client';

import { useEffect, useState } from 'react';
import { getContentSections, type ContentSection } from '@/lib/content-data';
import { ChevronDown, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function InfoPage() {
    const [sections, setSections] = useState<ContentSection[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const all = getContentSections();
        setSections(all.filter(s => s.is_visible).sort((a, b) => a.sort_order - b.sort_order));
        setLoading(false);
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    if (loading) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: 80 }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                borderRadius: 16,
                padding: '28px 20px',
                marginBottom: 20,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{
                    position: 'absolute', right: -20, top: -20,
                    width: 100, height: 100, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                }} />
                <div style={{
                    position: 'absolute', right: 40, bottom: -30,
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                    <Link href="/" style={{ color: '#fff', display: 'flex' }}>
                        <ArrowLeft size={22} />
                    </Link>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={22} color="#fff" />
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
                                ข้อมูลสำคัญ
                            </h1>
                        </div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
                            ทุกสิ่งที่คุณต้องรู้เกี่ยวกับ American Lottery
                        </p>
                    </div>
                </div>
            </div>

            {/* Section Accordion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sections.map((section, index) => {
                    const isExpanded = expandedId === section.id;

                    return (
                        <div
                            key={section.id}
                            className="fade-in"
                            style={{
                                animationDelay: `${index * 0.04}s`,
                                borderRadius: 14,
                                overflow: 'hidden',
                                border: isExpanded
                                    ? '1.5px solid var(--primary)'
                                    : '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                transition: 'all 0.3s ease',
                                boxShadow: isExpanded
                                    ? '0 4px 20px rgba(59,89,152,0.12)'
                                    : '0 1px 4px rgba(0,0,0,0.04)',
                            }}
                        >
                            {/* Section Header */}
                            <button
                                onClick={() => toggleExpand(section.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '16px 18px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                {/* Icon */}
                                <span style={{
                                    width: 40, height: 40,
                                    borderRadius: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20,
                                    background: isExpanded
                                        ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                                        : 'linear-gradient(135deg, rgba(59,89,152,0.08), rgba(59,89,152,0.04))',
                                    flexShrink: 0,
                                    transition: 'all 0.3s ease',
                                }}>
                                    {section.icon}
                                </span>

                                {/* Title */}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: 15, fontWeight: 700,
                                        color: isExpanded ? 'var(--primary)' : 'var(--text)',
                                        transition: 'color 0.3s ease',
                                    }}>
                                        {section.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                        {section.subtitle}
                                    </div>
                                </div>

                                {/* Chevron */}
                                <ChevronDown
                                    size={18}
                                    color="var(--text-muted)"
                                    style={{
                                        transition: 'transform 0.3s ease',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        flexShrink: 0,
                                    }}
                                />
                            </button>

                            {/* Expand Content */}
                            <div style={{
                                maxHeight: isExpanded ? 2000 : 0,
                                overflow: 'hidden',
                                transition: 'max-height 0.4s ease',
                            }}>
                                <div style={{
                                    padding: '0 18px 18px',
                                    borderTop: '1px solid var(--border)',
                                }}>
                                    <div style={{
                                        paddingTop: 14,
                                        fontSize: 13.5,
                                        lineHeight: 1.8,
                                        color: 'var(--text)',
                                    }}>
                                        {/* Render content with image support */}
                                        {section.content.split(/(\[IMG:[^\]]+\])/g).map((part, i) => {
                                            const imgMatch = part.match(/^\[IMG:(.+)\]$/);
                                            if (imgMatch) {
                                                return (
                                                    <img
                                                        key={i}
                                                        src={imgMatch[1]}
                                                        alt=""
                                                        style={{
                                                            maxWidth: '100%',
                                                            borderRadius: 10,
                                                            margin: '10px 0',
                                                            display: 'block',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                        }}
                                                    />
                                                );
                                            }
                                            return (
                                                <span key={i} style={{ whiteSpace: 'pre-line' }}>
                                                    {part}
                                                </span>
                                            );
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
