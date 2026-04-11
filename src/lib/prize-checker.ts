/**
 * Prize Checker — Core logic for matching customer numbers against draw results
 */

import type { PrizeTier } from '@/types';

export interface CheckResult {
    matchCount: number;
    matchedNumbers: number[];
    matchSpecial: boolean;
}

/**
 * Compare a customer's selected numbers against the winning numbers
 */
export function checkLine(
    customerNumbers: number[],
    customerSpecial: number | null,
    winningNumbers: number[],
    winningSpecial: number | null
): CheckResult {
    const matchedNumbers = customerNumbers.filter(n => winningNumbers.includes(n));
    const matchSpecial = customerSpecial !== null &&
        winningSpecial !== null &&
        customerSpecial === winningSpecial;

    return {
        matchCount: matchedNumbers.length,
        matchedNumbers,
        matchSpecial,
    };
}

/**
 * Find the prize tier based on match count and special match
 */
export function findPrizeTier(
    matchCount: number,
    matchSpecial: boolean,
    prizeTiers: PrizeTier[]
): PrizeTier | null {
    // Sort by tier_order ascending (best first)
    const sorted = [...prizeTiers].sort((a, b) => a.tier_order - b.tier_order);

    for (const tier of sorted) {
        if (tier.match_count === matchCount && tier.match_special === matchSpecial) {
            return tier;
        }
    }

    return null;
}

/**
 * Check if a line is a winner (matches any prize tier)
 */
export function isWinningLine(matchCount: number, matchSpecial: boolean): boolean {
    // Any combination with the special number, or 3+ regular matches
    if (matchSpecial) return true; // Even 0+special wins $4/$2
    if (matchCount >= 3) return true; // 3+ without special wins $7/$10
    return false;
}

/**
 * Get a human-readable description of the match
 */
export function getMatchDescription(matchCount: number, matchSpecial: boolean, specialLabel: string): string {
    const parts: string[] = [];
    if (matchCount > 0) {
        parts.push(`${matchCount} ตัวตรง`);
    }
    if (matchSpecial) {
        parts.push(`+ ${specialLabel}`);
    }
    if (parts.length === 0) {
        return 'ไม่ถูกรางวัล';
    }
    return parts.join(' ');
}
