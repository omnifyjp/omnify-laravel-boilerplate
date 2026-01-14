/**
 * Japanese validation rules
 * 
 * Usage with Zod:
 * ```typescript
 * import { z } from 'zod';
 * import { kanaString, KATAKANA_PATTERN } from '@/omnify/lib/rules';
 * 
 * // Method 1: Use kanaString helper
 * const schema = z.object({
 *   name_kana: kanaString(),  // 全角カタカナ (default)
 * });
 * 
 * // Method 2: Use pattern directly
 * const schema2 = z.object({
 *   name_kana: z.string().regex(KATAKANA_PATTERN, '全角カタカナで入力してください'),
 * });
 * ```
 */

export {
    // Kana validation
    kanaRules,
    createKanaRegex,
    validateKana,
    getKanaPattern,
    getKanaErrorMessage,
    // Zod helpers
    kanaString,
    withKana,
    // Pattern constants
    KATAKANA_PATTERN,
    KATAKANA_HALF_PATTERN,
    HIRAGANA_PATTERN,
    KANA_ANY_PATTERN,
    // Presets
    KATAKANA_FULL_WIDTH,
    KATAKANA_HALF_WIDTH,
    HIRAGANA,
    KANA_ANY,
    KATAKANA_WITH_NUMBERS,
    // Types
    type KanaRuleOptions,
} from './kana';

// Re-export as convenient aliases
export { getKanaPattern as kanaPattern } from './kana';
export { createKanaRegex as kanaRegex } from './kana';
