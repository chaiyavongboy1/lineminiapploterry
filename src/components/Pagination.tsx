'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    currentPage,
    totalItems,
    itemsPerPage = 10,
    onPageChange,
}: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            marginTop: 20,
            marginBottom: 8,
        }}>
            {/* Previous */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    background: currentPage === 1 ? 'var(--bg)' : 'var(--bg-card)',
                    color: currentPage === 1 ? 'var(--text-dim)' : 'var(--text)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                }}
            >
                <ChevronLeft size={16} />
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                    <span key={`dots-${idx}`} style={{
                        width: 32,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        letterSpacing: 1,
                    }}>
                        ···
                    </span>
                ) : (
                    <button
                        key={page}
                        onClick={() => onPageChange(page as number)}
                        style={{
                            minWidth: 36,
                            height: 36,
                            borderRadius: 10,
                            border: currentPage === page
                                ? '2px solid var(--primary)'
                                : '1.5px solid var(--border)',
                            background: currentPage === page
                                ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                                : 'var(--bg-card)',
                            color: currentPage === page ? '#fff' : 'var(--text)',
                            fontSize: 13,
                            fontWeight: currentPage === page ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            boxShadow: currentPage === page
                                ? '0 2px 8px rgba(59,89,152,0.25)'
                                : 'none',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {page}
                    </button>
                )
            )}

            {/* Next */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    background: currentPage === totalPages ? 'var(--bg)' : 'var(--bg-card)',
                    color: currentPage === totalPages ? 'var(--text-dim)' : 'var(--text)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                }}
            >
                <ChevronRight size={16} />
            </button>

            {/* Info */}
            <span style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginLeft: 8,
                whiteSpace: 'nowrap',
            }}>
                {currentPage}/{totalPages}
            </span>
        </div>
    );
}

/**
 * Helper to slice items for current page
 */
export function paginateItems<T>(items: T[], currentPage: number, itemsPerPage: number = 10): T[] {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
}
