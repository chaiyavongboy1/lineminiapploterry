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

// ─── Memoized Intl formatters (created once, reused on every call) ───
const _currencyFormatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
});

const _dateFormatter = new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
});

const _dateTimeFormatter = new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Format currency in THB — uses cached Intl formatter
 */
export function formatCurrency(amount: number): string {
    return _currencyFormatter.format(amount);
}

/**
 * Format date to Thai locale — uses cached Intl formatter
 */
export function formatDate(date: string | Date): string {
    return _dateFormatter.format(new Date(date));
}

/**
 * Format date with time — uses cached Intl formatter
 */
export function formatDateTime(date: string | Date): string {
    return _dateTimeFormatter.format(new Date(date));
}

/**
 * Format draw date from "YYYY-MM-DD" string WITHOUT timezone conversion.
 * This prevents differences between TH (UTC+7) and US (UTC-5) admins.
 * Parses the string directly instead of using new Date() which applies local timezone.
 */
export function formatDrawDate(dateStr: string): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
        'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
        'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];
    const buddhistYear = year + 543;
    return `${day} ${thaiMonths[month]} ${buddhistYear}`;
}

/**
 * Compute the next draw date based on lottery draw_days config.
 * Returns "YYYY-MM-DD" string.
 */
export function computeNextDrawDate(drawDays: string[]): string {
    const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
    };
    // Use UTC to prevent timezone-based off-by-one day errors
    const now = new Date();
    const todayUTC = now.getUTCDay();
    const drawDayNumbers = drawDays
        .map(d => dayMap[d.toLowerCase()])
        .filter(n => n !== undefined);

    if (drawDayNumbers.length === 0) {
        // Fallback: tomorrow in UTC
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(now.getUTCDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    let minDays = 8;
    for (const dayNum of drawDayNumbers) {
        let diff = dayNum - todayUTC;
        if (diff < 0) diff += 7;
        if (diff < minDays) minDays = diff;
    }

    const nextDate = new Date(now);
    nextDate.setUTCDate(now.getUTCDate() + minDays);
    // Return YYYY-MM-DD in UTC to stay timezone-safe
    const y = nextDate.getUTCFullYear();
    const m = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(nextDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
