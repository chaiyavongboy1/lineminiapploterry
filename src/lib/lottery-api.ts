/**
 * Lottery API — Fetch results from data.ny.gov (Official US Government Data)
 */

// API endpoints for each lottery type
const LOTTERY_API_ENDPOINTS: Record<string, {
    endpoint: string;
    parseResult: (data: Record<string, string>) => { numbers: number[]; specialNumber: number };
}> = {
    powerball: {
        endpoint: 'https://data.ny.gov/resource/d6yy-54nr.json',
        parseResult: (data) => {
            // Powerball: "11 42 43 59 61 25" → first 5 = numbers, last = powerball
            const allNums = data.winning_numbers.trim().split(/\s+/).map(Number);
            return {
                numbers: allNums.slice(0, 5).sort((a, b) => a - b),
                specialNumber: allNums[5],
            };
        },
    },
    'mega millions': {
        endpoint: 'https://data.ny.gov/resource/5xaw-6ayf.json',
        parseResult: (data) => {
            // Mega Millions: "13 27 28 41 62" + separate "mega_ball": "16"
            const numbers = data.winning_numbers.trim().split(/\s+/).map(Number).sort((a, b) => a - b);
            return {
                numbers,
                specialNumber: parseInt(data.mega_ball, 10),
            };
        },
    },
};

export interface FetchedDrawResult {
    drawDate: string; // YYYY-MM-DD
    numbers: number[];
    specialNumber: number;
    multiplier?: string;
}

/**
 * Fetch the latest draw results from data.ny.gov
 * @param lotteryName - "powerball" or "mega millions" (case-insensitive)
 * @param limit - number of results to fetch (default 1 = latest only)
 */
export async function fetchLatestResults(
    lotteryName: string,
    limit: number = 1
): Promise<FetchedDrawResult[]> {
    const key = lotteryName.toLowerCase().trim();
    const config = LOTTERY_API_ENDPOINTS[key];

    if (!config) {
        throw new Error(`Unknown lottery type: ${lotteryName}. Supported: ${Object.keys(LOTTERY_API_ENDPOINTS).join(', ')}`);
    }

    const url = `${config.endpoint}?$limit=${limit}&$order=draw_date%20DESC`;

    const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 }, // no cache
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch from data.ny.gov: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Record<string, string>[];

    return data.map(item => {
        const parsed = config.parseResult(item);
        const drawDate = item.draw_date.split('T')[0]; // "2026-03-28T00:00:00.000" → "2026-03-28"

        return {
            drawDate,
            numbers: parsed.numbers,
            specialNumber: parsed.specialNumber,
            multiplier: item.multiplier,
        };
    });
}

/**
 * Check if a draw result for a specific date already exists
 */
export function isNewResult(fetchedDate: string, existingDates: string[]): boolean {
    return !existingDates.includes(fetchedDate);
}
