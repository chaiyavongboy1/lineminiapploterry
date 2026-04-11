'use client';

import { useEffect, useState, useRef } from 'react';
import { getContentSections, saveContentSections, DEFAULT_CONTENT, type ContentSection } from '@/lib/content-data';
import { Save, X, Edit2, Eye, EyeOff, RotateCcw, ChevronDown, ChevronUp, ImagePlus, Link2, Upload } from 'lucide-react';

// Render content with image support: [IMG:url] → <img>
function ContentPreview({ content, muted }: { content: string; muted?: boolean }) {
    const parts = content.split(/(\[IMG:[^\]]+\])/g);
    return (
        <>
            {parts.map((part, i) => {
                const imgMatch = part.match(/^\[IMG:(.+)\]$/);
                if (imgMatch) {
                    return (
                        <img
                            key={i}
                            src={imgMatch[1]}
                            alt=""
                            style={{
                                maxWidth: '100%',
                                borderRadius: 8,
                                margin: '8px 0',
                                display: 'block',
                                border: '1px solid var(--border)',
                            }}
                        />
                    );
                }
                return (
                    <span key={i} style={{
                        whiteSpace: 'pre-line',
                        fontSize: muted ? 12 : 13,
                        color: muted ? 'var(--text-muted)' : 'inherit',
                        lineHeight: 1.6,
                    }}>
                        {part}
                    </span>
                );
            })}
        </>
    );
}

export default function AdminContentPage() {
    const [sections, setSections] = useState<ContentSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editSubtitle, setEditSubtitle] = useState('');
    const [editIcon, setEditIcon] = useState('');
    const [saved, setSaved] = useState(false);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const data = getContentSections();
        setSections(data.sort((a, b) => a.sort_order - b.sort_order));
        setLoading(false);
    }, []);

    const handleSave = () => {
        const updated = sections.map(s =>
            s.id === editingId ? { ...s, content: editContent, title: editTitle, subtitle: editSubtitle, icon: editIcon } : s
        );
        setSections(updated);
        saveContentSections(updated);
        setEditingId(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const toggleVisibility = (id: string) => {
        const updated = sections.map(s =>
            s.id === id ? { ...s, is_visible: !s.is_visible } : s
        );
        setSections(updated);
        saveContentSections(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const startEdit = (section: ContentSection) => {
        setEditingId(section.id);
        setEditContent(section.content);
        setEditTitle(section.title);
        setEditSubtitle(section.subtitle);
        setEditIcon(section.icon);
    };

    const handleReset = () => {
        if (confirm('รีเซ็ตเนื้อหาทั้งหมดเป็นค่าเริ่มต้น?')) {
            saveContentSections(DEFAULT_CONTENT);
            setSections([...DEFAULT_CONTENT]);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const moveSection = (id: string, direction: 'up' | 'down') => {
        const idx = sections.findIndex(s => s.id === id);
        if (direction === 'up' && idx > 0) {
            const newSections = [...sections];
            [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
            newSections.forEach((s, i) => s.sort_order = i + 1);
            setSections(newSections);
            saveContentSections(newSections);
        } else if (direction === 'down' && idx < sections.length - 1) {
            const newSections = [...sections];
            [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
            newSections.forEach((s, i) => s.sort_order = i + 1);
            setSections(newSections);
            saveContentSections(newSections);
        }
    };

    // Insert image tag at cursor position in textarea
    const insertImageTag = (url: string) => {
        const tag = `[IMG:${url}]`;
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = editContent.substring(0, start);
            const after = editContent.substring(end);
            const newContent = before + '\n' + tag + '\n' + after;
            setEditContent(newContent);
            // Set cursor after the inserted tag
            setTimeout(() => {
                textarea.focus();
                const newPos = start + tag.length + 2;
                textarea.setSelectionRange(newPos, newPos);
            }, 50);
        } else {
            setEditContent(prev => prev + '\n' + tag + '\n');
        }
        setShowImageModal(false);
        setImageUrl('');
    };

    // Handle URL insert
    const handleInsertUrl = () => {
        if (!imageUrl.trim()) return;
        insertImageTag(imageUrl.trim());
    };

    // Handle file upload → base64
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            return;
        }

        // Validate file size (max 2MB for localStorage safety)
        if (file.size > 2 * 1024 * 1024) {
            alert('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
            return;
        }

        setUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            insertImageTag(base64);
            setUploading(false);
        };
        reader.onerror = () => {
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
            setUploading(false);
        };
        reader.readAsDataURL(file);

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>📝 จัดการเนื้อหา</h2>
                <button
                    onClick={handleReset}
                    className="btn"
                    style={{
                        fontSize: 12, padding: '6px 12px',
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <RotateCcw size={12} /> รีเซ็ต
                </button>
            </div>

            {/* Saved Toast */}
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

            {/* Info */}
            <div className="card" style={{
                padding: '10px 14px', marginBottom: 16, fontSize: 12,
                color: 'var(--text-muted)',
                background: 'linear-gradient(135deg, rgba(59,89,152,0.06), rgba(59,89,152,0.02))',
                border: '1px solid rgba(59,89,152,0.12)',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ fontSize: 16 }}>💡</span>
                แก้ไขเนื้อหาแต่ละหมวด — ลูกค้าจะเห็นข้อมูลนี้ที่หน้า &ldquo;ข้อมูล&rdquo; • รองรับการเพิ่มรูปภาพ
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />

            {/* Section Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sections.map((section, index) => {
                    const isEditing = editingId === section.id;
                    const isPreviewing = previewId === section.id;

                    return (
                        <div
                            key={section.id}
                            className="card fade-in"
                            style={{
                                animationDelay: `${index * 0.04}s`,
                                borderLeft: section.is_visible ? '4px solid var(--success)' : '4px solid var(--border)',
                                opacity: section.is_visible ? 1 : 0.6,
                                padding: 0, overflow: 'hidden',
                            }}
                        >
                            {/* Card Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '14px 16px',
                            }}>
                                {/* Reorder Buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <button
                                        onClick={() => moveSection(section.id, 'up')}
                                        disabled={index === 0}
                                        style={{
                                            background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer',
                                            padding: 0, opacity: index === 0 ? 0.2 : 0.5,
                                        }}
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        onClick={() => moveSection(section.id, 'down')}
                                        disabled={index === sections.length - 1}
                                        style={{
                                            background: 'none', border: 'none', cursor: index === sections.length - 1 ? 'default' : 'pointer',
                                            padding: 0, opacity: index === sections.length - 1 ? 0.2 : 0.5,
                                        }}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>

                                {/* Icon + Title */}
                                <span style={{ fontSize: 22 }}>{section.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{section.title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{section.subtitle}</div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button
                                        onClick={() => toggleVisibility(section.id)}
                                        title={section.is_visible ? 'ซ่อน' : 'แสดง'}
                                        style={{
                                            background: 'none', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: 6, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center',
                                        }}
                                    >
                                        {section.is_visible
                                            ? <Eye size={14} color="var(--success)" />
                                            : <EyeOff size={14} color="var(--text-muted)" />
                                        }
                                    </button>
                                    <button
                                        onClick={() => isEditing ? setEditingId(null) : startEdit(section)}
                                        style={{
                                            background: isEditing ? 'var(--primary)' : 'none',
                                            border: isEditing ? 'none' : '1px solid var(--border)',
                                            borderRadius: 8, padding: 6, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center',
                                        }}
                                    >
                                        {isEditing
                                            ? <X size={14} color="#fff" />
                                            : <Edit2 size={14} color="var(--primary)" />
                                        }
                                    </button>
                                </div>
                            </div>

                            {/* Content Preview (when not editing) */}
                            {!isEditing && (
                                <div
                                    onClick={() => setPreviewId(isPreviewing ? null : section.id)}
                                    style={{
                                        padding: '0 16px 14px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{
                                        maxHeight: isPreviewing ? 'none' : 44,
                                        overflow: 'hidden',
                                    }}>
                                        <ContentPreview content={section.content} muted />
                                    </div>
                                    {!isPreviewing && section.content.length > 100 && (
                                        <span style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 600 }}>
                                            ดูเพิ่มเติม...
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Editing Mode */}
                            {isEditing && (
                                <div style={{
                                    padding: '0 16px 16px',
                                    borderTop: '1px solid var(--border)',
                                }}>
                                    <div style={{ paddingTop: 12 }}>
                                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                                    หัวข้อ (TH)
                                                </label>
                                                <input
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                                        border: '1px solid var(--border)', fontSize: 14,
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                                    หัวข้อรอง (EN)
                                                </label>
                                                <input
                                                    value={editSubtitle}
                                                    onChange={e => setEditSubtitle(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                                        border: '1px solid var(--border)', fontSize: 14,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                            เนื้อหา
                                        </label>

                                        {/* Image Toolbar */}
                                        <div style={{
                                            display: 'flex', gap: 6, marginBottom: 6,
                                            padding: '6px 8px',
                                            background: 'var(--bg)',
                                            borderRadius: '8px 8px 0 0',
                                            border: '1px solid var(--border)',
                                            borderBottom: 'none',
                                        }}>
                                            <button
                                                onClick={() => setShowImageModal(!showImageModal)}
                                                type="button"
                                                style={{
                                                    background: showImageModal ? 'var(--primary)' : 'var(--bg-card)',
                                                    color: showImageModal ? '#fff' : 'var(--text)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 6, padding: '4px 10px',
                                                    fontSize: 12, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                }}
                                            >
                                                <ImagePlus size={13} /> แทรกรูปภาพ
                                            </button>
                                        </div>

                                        {/* Image Insert Panel */}
                                        {showImageModal && (
                                            <div style={{
                                                padding: '12px',
                                                background: 'rgba(59,89,152,0.04)',
                                                border: '1px solid var(--border)',
                                                borderBottom: 'none',
                                                borderRadius: 0,
                                            }}>
                                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>
                                                    📸 เพิ่มรูปภาพ
                                                </div>

                                                {/* Option 1: URL */}
                                                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                                    <input
                                                        type="url"
                                                        placeholder="วาง URL รูปภาพ..."
                                                        value={imageUrl}
                                                        onChange={e => setImageUrl(e.target.value)}
                                                        style={{
                                                            flex: 1, padding: '7px 10px', borderRadius: 6,
                                                            border: '1px solid var(--border)', fontSize: 12,
                                                        }}
                                                    />
                                                    <button
                                                        onClick={handleInsertUrl}
                                                        disabled={!imageUrl.trim()}
                                                        type="button"
                                                        style={{
                                                            background: 'var(--primary)', color: '#fff',
                                                            border: 'none', borderRadius: 6,
                                                            padding: '7px 12px', fontSize: 12, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: 4,
                                                            opacity: imageUrl.trim() ? 1 : 0.5,
                                                        }}
                                                    >
                                                        <Link2 size={12} /> แทรก
                                                    </button>
                                                </div>

                                                {/* Divider */}
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    margin: '8px 0', color: 'var(--text-muted)', fontSize: 11,
                                                }}>
                                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                                    หรือ
                                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                                </div>

                                                {/* Option 2: Upload */}
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploading}
                                                    type="button"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        background: 'var(--bg-card)',
                                                        border: '2px dashed var(--border)',
                                                        borderRadius: 8,
                                                        cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                        fontSize: 12, color: 'var(--text-muted)',
                                                    }}
                                                >
                                                    <Upload size={14} />
                                                    {uploading ? 'กำลังอัพโหลด...' : '📁 เลือกไฟล์จากเครื่อง (สูงสุด 2MB)'}
                                                </button>
                                            </div>
                                        )}

                                        <textarea
                                            ref={textareaRef}
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            rows={10}
                                            style={{
                                                width: '100%', padding: '10px 12px',
                                                borderRadius: showImageModal ? '0 0 8px 8px' : '0 0 8px 8px',
                                                border: '1px solid var(--border)', fontSize: 13,
                                                lineHeight: 1.7, resize: 'vertical',
                                                fontFamily: 'inherit',
                                            }}
                                        />

                                        {/* Character count */}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                                            {editContent.length} ตัวอักษร
                                        </div>

                                        {/* Image Preview in content */}
                                        {editContent.includes('[IMG:') && (
                                            <div style={{
                                                marginTop: 8, padding: 10,
                                                background: 'var(--bg)',
                                                borderRadius: 8,
                                                border: '1px solid var(--border)',
                                            }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                                                    👁️ ตัวอย่างเนื้อหา
                                                </div>
                                                <ContentPreview content={editContent} />
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                            <button
                                                onClick={handleSave}
                                                className="btn btn-success"
                                                style={{ flex: 1, fontSize: 13, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            >
                                                <Save size={14} /> บันทึก
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(null); setShowImageModal(false); }}
                                                className="btn"
                                                style={{ fontSize: 13, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)' }}
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
