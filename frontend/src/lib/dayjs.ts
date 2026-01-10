/**
 * Day.js Configuration
 *
 * Centralized Day.js setup with plugins, locales, and utilities.
 * Import from this file instead of 'dayjs' directly.
 *
 * @example
 * import dayjs, { formatDateTime, toUTCString } from "@/lib/dayjs";
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

// Locales
import "dayjs/locale/ja";
import "dayjs/locale/en";
import "dayjs/locale/vi";

// Extend plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// Default to UTC for API consistency
dayjs.tz.setDefault("UTC");

// ============================================================================
// Locale
// ============================================================================

const dayjsLocaleMap: Record<string, string> = {
    ja: "ja",
    en: "en",
    vi: "vi",
};

/**
 * Set Day.js locale to match app locale.
 * Call this when locale changes.
 */
export function setDayjsLocale(locale: string): void {
    dayjs.locale(dayjsLocaleMap[locale] || "en");
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format UTC date string for display (date only).
 */
export function formatDate(
    utcDate: string | null | undefined,
    format = "YYYY/MM/DD"
): string {
    if (!utcDate) return "-";
    return dayjs(utcDate).format(format);
}

/**
 * Format UTC date string with time.
 */
export function formatDateTime(utcDate: string | null | undefined): string {
    if (!utcDate) return "-";
    return dayjs(utcDate).format("YYYY/MM/DD HH:mm");
}

/**
 * Format with localized format (e.g., "2024年1月15日").
 */
export function formatDateLocalized(
    utcDate: string | null | undefined
): string {
    if (!utcDate) return "-";
    return dayjs(utcDate).format("LL");
}

/**
 * Format with localized date + time (e.g., "2024年1月15日 19:30").
 */
export function formatDateTimeLocalized(
    utcDate: string | null | undefined
): string {
    if (!utcDate) return "-";
    return dayjs(utcDate).format("LLL");
}

/**
 * Format as relative time (e.g., "3 days ago").
 */
export function formatRelative(utcDate: string | null | undefined): string {
    if (!utcDate) return "-";
    return dayjs(utcDate).fromNow();
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert Dayjs to UTC ISO string for API.
 */
export function toUTCString(
    date: dayjs.Dayjs | null | undefined
): string | null {
    if (!date) return null;
    return date.utc().toISOString();
}

/**
 * Parse UTC string to Dayjs (for form default values).
 */
export function fromUTCString(
    utcDate: string | null | undefined
): dayjs.Dayjs | null {
    if (!utcDate) return null;
    return dayjs(utcDate);
}

/**
 * Get current time in UTC.
 */
export function nowUTC(): dayjs.Dayjs {
    return dayjs.utc();
}

// ============================================================================
// Comparison Utilities
// ============================================================================

/**
 * Check if date is in the past.
 */
export function isPast(utcDate: string | null | undefined): boolean {
    if (!utcDate) return false;
    return dayjs(utcDate).isBefore(dayjs());
}

/**
 * Check if date is in the future.
 */
export function isFuture(utcDate: string | null | undefined): boolean {
    if (!utcDate) return false;
    return dayjs(utcDate).isAfter(dayjs());
}

// ============================================================================
// Export
// ============================================================================

export default dayjs;
export type { Dayjs } from "dayjs";
