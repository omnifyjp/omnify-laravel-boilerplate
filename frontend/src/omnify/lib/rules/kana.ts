/**
 * Japanese Kana Validation Rules
 * 
 * Provides configurable validation for Japanese character input:
 * - 全角カタカナ (Full-width Katakana) - default
 * - 半角カタカナ (Half-width Katakana)
 * - ひらがな (Hiragana)
 * - Mixed modes
 */

export interface KanaRuleOptions {
    /** Allow full-width katakana (ア-ン) - default: true */
    fullWidthKatakana?: boolean;
    /** Allow half-width katakana (ｱ-ﾝ) - default: false */
    halfWidthKatakana?: boolean;
    /** Allow hiragana (あ-ん) - default: false */
    hiragana?: boolean;
    /** Allow numbers (0-9, ０-９) - default: false */
    allowNumbers?: boolean;
    /** Allow full-width numbers (０-９) - default: false */
    fullWidthNumbers?: boolean;
    /** Allow half-width numbers (0-9) - default: false */
    halfWidthNumbers?: boolean;
    /** Allow spaces (full-width and half-width) - default: true */
    allowSpaces?: boolean;
    /** Allow specific special characters - default: ['ー', '・'] */
    allowSpecialChars?: string[];
    /** Custom error message */
    message?: string;
}

// Character ranges
const CHAR_RANGES = {
    // Full-width Katakana: ァ-ヶ (U+30A1-U+30F6) + ー (U+30FC)
    fullWidthKatakana: 'ァ-ヶー',
    // Half-width Katakana: ｦ-ﾟ (U+FF66-U+FF9F)
    halfWidthKatakana: 'ｦ-ﾟ',
    // Hiragana: ぁ-ゖ (U+3041-U+3096)
    hiragana: 'ぁ-ゖ',
    // Full-width numbers: ０-９
    fullWidthNumbers: '０-９',
    // Half-width numbers: 0-9
    halfWidthNumbers: '0-9',
    // Full-width space: 　(U+3000)
    fullWidthSpace: '　',
    // Half-width space
    halfWidthSpace: ' ',
    // Common special chars for names
    defaultSpecialChars: ['ー', '・'],
} as const;

// Default options: 全角カタカナ + spaces + ー・
const DEFAULT_OPTIONS: Required<KanaRuleOptions> = {
    fullWidthKatakana: true,
    halfWidthKatakana: false,
    hiragana: false,
    allowNumbers: false,
    fullWidthNumbers: false,
    halfWidthNumbers: false,
    allowSpaces: true,
    allowSpecialChars: ['ー', '・'],
    message: '',
};

/**
 * Build regex pattern from options
 */
function buildKanaPattern(options: KanaRuleOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const parts: string[] = [];

    if (opts.fullWidthKatakana) {
        parts.push(CHAR_RANGES.fullWidthKatakana);
    }
    if (opts.halfWidthKatakana) {
        parts.push(CHAR_RANGES.halfWidthKatakana);
    }
    if (opts.hiragana) {
        parts.push(CHAR_RANGES.hiragana);
    }
    if (opts.allowNumbers || opts.fullWidthNumbers) {
        parts.push(CHAR_RANGES.fullWidthNumbers);
    }
    if (opts.allowNumbers || opts.halfWidthNumbers) {
        parts.push(CHAR_RANGES.halfWidthNumbers);
    }
    if (opts.allowSpaces) {
        parts.push(CHAR_RANGES.fullWidthSpace);
        parts.push(CHAR_RANGES.halfWidthSpace);
    }
    if (opts.allowSpecialChars && opts.allowSpecialChars.length > 0) {
        // Escape special regex chars
        const escaped = opts.allowSpecialChars.map(c =>
            c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('');
        parts.push(escaped);
    }

    return `^[${parts.join('')}]*$`;
}

/**
 * Get default error message based on options
 */
function getDefaultMessage(options: KanaRuleOptions = {}, locale: string = 'ja'): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const messages: Record<string, Record<string, string>> = {
        ja: {
            fullWidthKatakana: '全角カタカナ',
            halfWidthKatakana: '半角カタカナ',
            hiragana: 'ひらがな',
            mixed: 'カナ文字',
        },
        en: {
            fullWidthKatakana: 'full-width katakana',
            halfWidthKatakana: 'half-width katakana',
            hiragana: 'hiragana',
            mixed: 'kana characters',
        },
    };

    const msg = messages[locale] ?? messages['ja'];

    // Determine what type to show in message
    let type = msg.mixed;
    if (opts.fullWidthKatakana && !opts.halfWidthKatakana && !opts.hiragana) {
        type = msg.fullWidthKatakana;
    } else if (opts.halfWidthKatakana && !opts.fullWidthKatakana && !opts.hiragana) {
        type = msg.halfWidthKatakana;
    } else if (opts.hiragana && !opts.fullWidthKatakana && !opts.halfWidthKatakana) {
        type = msg.hiragana;
    }

    if (locale === 'ja') {
        return `${type}で入力してください`;
    }
    return `Please enter in ${type}`;
}

/**
 * Create a kana validation regex
 */
export function createKanaRegex(options: KanaRuleOptions = {}): RegExp {
    return new RegExp(buildKanaPattern(options));
}

/**
 * Validate a string against kana rules
 */
export function validateKana(value: string, options: KanaRuleOptions = {}): boolean {
    if (!value) return true; // Empty is valid (use required for that)
    const regex = createKanaRegex(options);
    return regex.test(value);
}

/**
 * Get kana validation pattern string (for Zod .regex())
 */
export function getKanaPattern(options: KanaRuleOptions = {}): string {
    return buildKanaPattern(options);
}

/**
 * Get error message for kana validation
 */
export function getKanaErrorMessage(options: KanaRuleOptions = {}, locale: string = 'ja'): string {
    return options.message ?? getDefaultMessage(options, locale);
}

// ============================================================================
// Preset configurations
// ============================================================================

/** 全角カタカナ (Full-width Katakana) - Default for Japanese names */
export const KATAKANA_FULL_WIDTH: KanaRuleOptions = {
    fullWidthKatakana: true,
    halfWidthKatakana: false,
    hiragana: false,
    allowSpaces: true,
    allowSpecialChars: ['ー', '・'],
};

/** 半角カタカナ (Half-width Katakana) - Legacy systems */
export const KATAKANA_HALF_WIDTH: KanaRuleOptions = {
    fullWidthKatakana: false,
    halfWidthKatakana: true,
    hiragana: false,
    allowSpaces: true,
    allowSpecialChars: ['ｰ'], // Half-width prolonged sound mark
};

/** ひらがな (Hiragana) */
export const HIRAGANA: KanaRuleOptions = {
    fullWidthKatakana: false,
    halfWidthKatakana: false,
    hiragana: true,
    allowSpaces: true,
    allowSpecialChars: ['ー'],
};

/** カタカナ + ひらがな (Any kana) */
export const KANA_ANY: KanaRuleOptions = {
    fullWidthKatakana: true,
    halfWidthKatakana: true,
    hiragana: true,
    allowSpaces: true,
    allowSpecialChars: ['ー', '・', 'ｰ'],
};

/** 全角カタカナ + 数字 (Full-width katakana with numbers) */
export const KATAKANA_WITH_NUMBERS: KanaRuleOptions = {
    fullWidthKatakana: true,
    halfWidthKatakana: false,
    hiragana: false,
    allowNumbers: true,
    allowSpaces: true,
    allowSpecialChars: ['ー', '・'],
};

// ============================================================================
// Pattern strings for Zod .regex()
// ============================================================================

/** Pattern: 全角カタカナ + スペース + ー・ (for z.string().regex()) */
export const KATAKANA_PATTERN = /^[ァ-ヶー・　 ]*$/;

/** Pattern: 半角カタカナ (for z.string().regex()) */
export const KATAKANA_HALF_PATTERN = /^[ｦ-ﾟｰ ]*$/;

/** Pattern: ひらがな (for z.string().regex()) */
export const HIRAGANA_PATTERN = /^[ぁ-ゖー　 ]*$/;

/** Pattern: すべてのかな (for z.string().regex()) */
export const KANA_ANY_PATTERN = /^[ァ-ヶぁ-ゖｦ-ﾟー・ｰ　 ]*$/;

// ============================================================================
// Zod refinement helpers
// ============================================================================

import { z } from 'zod';

/**
 * Create Zod string schema with kana validation
 * @example
 * const schema = z.object({
 *   name_kana: kanaString(), // 全角カタカナ (default)
 *   name_kana2: kanaString({ hiragana: true }), // カタカナ + ひらがな
 * });
 */
export function kanaString(options: KanaRuleOptions = {}) {
    const opts = { ...KATAKANA_FULL_WIDTH, ...options };
    const regex = createKanaRegex(opts);
    const message = getKanaErrorMessage(opts);

    return z.string().regex(regex, { message });
}

/**
 * Add kana validation to existing Zod string schema
 * @example
 * const schema = z.string().min(1).pipe(withKana());
 */
export function withKana(options: KanaRuleOptions = {}) {
    return kanaString(options);
}

// Default export
export const kanaRules = {
    createRegex: createKanaRegex,
    validate: validateKana,
    getPattern: getKanaPattern,
    getMessage: getKanaErrorMessage,
    // Zod helpers
    string: kanaString,
    // Presets
    presets: {
        fullWidthKatakana: KATAKANA_FULL_WIDTH,
        halfWidthKatakana: KATAKANA_HALF_WIDTH,
        hiragana: HIRAGANA,
        any: KANA_ANY,
        withNumbers: KATAKANA_WITH_NUMBERS,
    },
    // Pattern constants for direct use
    patterns: {
        katakana: KATAKANA_PATTERN,
        katakanaHalf: KATAKANA_HALF_PATTERN,
        hiragana: HIRAGANA_PATTERN,
        any: KANA_ANY_PATTERN,
    },
};
