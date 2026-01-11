/**
 * Zod i18n - Sử dụng messages từ next-intl
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslateFunction = (key: string, params?: any) => string;

let translator: TranslateFunction = (key) => key;

/**
 * Set translator function (gọi từ component với useTranslations)
 */
export function setZodTranslator(t: TranslateFunction) {
    translator = t;
}

/**
 * Get translated message
 */
export function getZodMessage(key: string, params?: Record<string, unknown>): string {
    return translator(`validation.${key}`, params);
}
