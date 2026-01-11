/**
 * JapaneseAddressField - Japanese address input component
 * Handles postal code, prefecture, address fields with postal code lookup
 */
import { useState, useCallback } from 'react';
import { Form, Input, Select, Button, message } from 'antd';
import { SearchOutlined, LoadingOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { RuleObject } from 'antd/es/form';
import { zodRule } from '../lib/form-validation';
import { getZodLocale } from '../lib/zod-i18n';
import { Prefecture, PrefectureValues, getPrefectureLabel, getPrefectureExtra } from '../enum/plugin/Prefecture';

interface I18nConfig {
    fields: Record<string, { label?: Record<string, string>; placeholder?: Record<string, string> }>;
}

interface SelectOption {
    value: string | number;
    label: string;
}

interface PostalLookupResult {
    prefecture?: string;
    prefectureCode?: string;
    prefectureName?: string;
    address1?: string;
    address2?: string;
}

interface JapaneseAddressFieldProps {
    form: FormInstance;
    schemas: Record<string, unknown>;
    i18n: I18nConfig;
    prefix?: string;
    usePrefectureId?: boolean;
    prefectureOptions?: SelectOption[];
    enablePostalLookup?: boolean;
    showSearchButton?: boolean;
    autoSearch?: boolean;
    onPostalLookup?: (postalCode: string) => Promise<PostalLookupResult | null>;
}

function getLabel(i18n: I18nConfig, field: string, locale: string): string {
    return i18n.fields[field]?.label?.[locale] ?? i18n.fields[field]?.label?.['en'] ?? field;
}

function getPlaceholder(i18n: I18nConfig, field: string, locale: string): string {
    return i18n.fields[field]?.placeholder?.[locale] ?? i18n.fields[field]?.placeholder?.['en'] ?? '';
}

// Build prefecture code to string key mapping from generated enum
const PREFECTURE_CODE_TO_KEY: Record<string, string> = Object.fromEntries(
    PrefectureValues.map((key) => {
        const extra = getPrefectureExtra(key);
        return [String(extra?.code ?? ''), key];
    })
);

// Build default prefecture options from generated enum
function buildPrefectureOptions(locale: string): SelectOption[] {
    return PrefectureValues.map((key) => ({
        value: key,
        label: getPrefectureLabel(key, locale),
    }));
}

// Default postal lookup function using zipcloud API
async function lookupPostalCode(postalCode: string): Promise<PostalLookupResult | null> {
    try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const prefectureKey = PREFECTURE_CODE_TO_KEY[result.prefcode];
            return {
                prefecture: prefectureKey,
                prefectureCode: result.prefcode,
                prefectureName: result.address1,
                address1: result.address2,
                address2: result.address3,
            };
        }
        return null;
    } catch (error) {
        console.error('Postal code lookup failed:', error);
        return null;
    }
}

// Localized messages
const MESSAGES = {
    ja: {
        searchAddress: '住所検索',
        searching: '検索中...',
        notFound: '郵便番号が見つかりませんでした',
        error: '住所検索に失敗しました',
        invalidFormat: '郵便番号の形式が正しくありません（例：123-4567）',
    },
    en: {
        searchAddress: 'Search Address',
        searching: 'Searching...',
        notFound: 'Postal code not found',
        error: 'Address lookup failed',
        invalidFormat: 'Invalid postal code format (e.g., 123-4567)',
    },
    vi: {
        searchAddress: 'Tìm địa chỉ',
        searching: 'Đang tìm...',
        notFound: 'Không tìm thấy mã bưu điện',
        error: 'Tìm địa chỉ thất bại',
        invalidFormat: 'Định dạng mã bưu điện không hợp lệ (VD: 123-4567)',
    },
} as const;

function getMessage(key: keyof typeof MESSAGES.ja, locale: string): string {
    return (MESSAGES as any)[locale]?.[key] ?? MESSAGES.ja[key];
}

export function JapaneseAddressField({
    form,
    schemas,
    i18n,
    prefix = 'address',
    usePrefectureId = false,
    prefectureOptions,
    enablePostalLookup = true,
    showSearchButton = true,
    autoSearch = true,
    onPostalLookup,
}: JapaneseAddressFieldProps) {
    const locale = getZodLocale();
    const [isSearching, setIsSearching] = useState(false);

    // Field names
    const postalCodeField = `${prefix}_postal_code`;
    const prefectureField = usePrefectureId
        ? `${prefix}_prefecture_id`
        : `${prefix}_prefecture`;
    const address1Field = `${prefix}_address1`;
    const address2Field = `${prefix}_address2`;
    const address3Field = `${prefix}_address3`;

    // Use generated prefecture options
    const options = prefectureOptions ?? buildPrefectureOptions(locale);

    // Get rules from schemas
    const getRule = (field: string): RuleObject[] => {
        const schema = schemas[field];
        if (!schema) return [];
        return [zodRule(schema as any, getLabel(i18n, field, locale))];
    };

    // Check if a field is required by examining its Zod schema description
    const isRequired = (field: string): boolean => {
        const schema = schemas[field];
        if (!schema) return false;
        // Check if schema has .optional() or .nullable() - these make it not required
        const schemaDesc = (schema as any)?._def?.typeName;
        const inner = (schema as any)?._def?.innerType;
        // ZodOptional or ZodNullable means not required
        if (schemaDesc === 'ZodOptional' || schemaDesc === 'ZodNullable') return false;
        if (inner?._def?.typeName === 'ZodOptional' || inner?._def?.typeName === 'ZodNullable') return false;
        return true;
    };

    // Lookup address from postal code
    const doLookup = useCallback(async (postalCode: string) => {
        const digits = postalCode.replace(/[^0-9]/g, '');
        if (digits.length !== 7) {
            message.warning(getMessage('invalidFormat', locale));
            return;
        }

        setIsSearching(true);
        try {
            const lookupFn = onPostalLookup ?? lookupPostalCode;
            const result = await lookupFn(postalCode);

            if (result) {
                const prefectureValue = usePrefectureId ? result.prefectureCode : result.prefecture;
                form.setFieldsValue({
                    [prefectureField]: prefectureValue,
                    [address1Field]: result.address1,
                    [address2Field]: result.address2,
                });
            } else {
                message.info(getMessage('notFound', locale));
            }
        } catch (error) {
            message.error(getMessage('error', locale));
            console.error('Postal code lookup failed:', error);
        } finally {
            setIsSearching(false);
        }
    }, [form, locale, onPostalLookup, prefectureField, address1Field, address2Field, usePrefectureId]);

    const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const postalCode = e.target.value.replace(/[^0-9]/g, '');
        if (autoSearch && enablePostalLookup && postalCode.length === 7) {
            await doLookup(postalCode);
        }
    };

    const handleSearchClick = async () => {
        const postalCode = form.getFieldValue(postalCodeField);
        if (postalCode) {
            await doLookup(postalCode);
        }
    };

    return (
        <>
            {/* 郵便番号 */}
            <Form.Item
                name={postalCodeField}
                label={getLabel(i18n, postalCodeField, locale)}
                rules={getRule(postalCodeField)}
                required={isRequired(postalCodeField)}
            >
                <Input
                    placeholder={getPlaceholder(i18n, postalCodeField, locale)}
                    style={{ width: enablePostalLookup && showSearchButton ? 'calc(100% - 110px)' : 150 }}
                    onChange={handlePostalCodeChange}
                    addonAfter={
                        enablePostalLookup && showSearchButton && (
                            <Button
                                type="text"
                                size="small"
                                icon={isSearching ? <LoadingOutlined /> : <SearchOutlined />}
                                onClick={handleSearchClick}
                                disabled={isSearching}
                            >
                                {getMessage('searchAddress', locale)}
                            </Button>
                        )
                    }
                />
            </Form.Item>

            {/* 都道府県 */}
            <Form.Item
                name={prefectureField}
                label={getLabel(i18n, prefectureField, locale)}
                rules={getRule(prefectureField)}
                required={isRequired(prefectureField)}
            >
                <Select
                    placeholder={getPlaceholder(i18n, prefectureField, locale)}
                    options={options}
                    style={{ width: 200 }}
                    showSearch
                    optionFilterProp="label"
                />
            </Form.Item>

            {/* 市区町村 */}
            <Form.Item
                name={address1Field}
                label={getLabel(i18n, address1Field, locale)}
                rules={getRule(address1Field)}
                required={isRequired(address1Field)}
            >
                <Input placeholder={getPlaceholder(i18n, address1Field, locale)} />
            </Form.Item>

            {/* 番地 */}
            <Form.Item
                name={address2Field}
                label={getLabel(i18n, address2Field, locale)}
                rules={getRule(address2Field)}
                required={isRequired(address2Field)}
            >
                <Input placeholder={getPlaceholder(i18n, address2Field, locale)} />
            </Form.Item>

            {/* 建物名・部屋番号 */}
            <Form.Item
                name={address3Field}
                label={getLabel(i18n, address3Field, locale)}
                rules={getRule(address3Field)}
                required={isRequired(address3Field)}
            >
                <Input placeholder={getPlaceholder(i18n, address3Field, locale)} />
            </Form.Item>
        </>
    );
}
