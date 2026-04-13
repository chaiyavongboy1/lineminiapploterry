import generatePayload from 'promptpay-qr';

/**
 * Generate PromptPay QR Code payload string
 * @param amount - Amount in THB
 * @returns QR Code data string (can be rendered with any QR library)
 */
export function generatePromptPayQR(amount: number): string {
    const promptPayId = process.env.PROMPTPAY_ID || process.env.NEXT_PUBLIC_PROMPTPAY_ID || '';
    return generatePayload(promptPayId, { amount });
}

/**
 * Generate order number
 * Format: ORD-YYYYMMDD-HHMM-XXXX (includes time for better uniqueness)
 */
export function generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${timeStr}-${random}`;
}

/**
 * Generate random numbers for Quick Pick
 */
export function generateQuickPick(
    count: number,
    maxNumber: number,
    specialMax?: number | null
): { numbers: number[]; specialNumber: number | null } {
    const numbers: Set<number> = new Set();
    while (numbers.size < count) {
        numbers.add(Math.floor(Math.random() * maxNumber) + 1);
    }

    const specialNumber = specialMax
        ? Math.floor(Math.random() * specialMax) + 1
        : null;

    return {
        numbers: Array.from(numbers).sort((a, b) => a - b),
        specialNumber,
    };
}

/**
 * Format currency in THB
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format date to Thai locale
 */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(date));
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}
