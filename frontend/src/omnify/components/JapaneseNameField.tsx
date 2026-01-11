/**
 * JapaneseNameField - Japanese name input component
 * Handles lastname + firstname with optional kana fields
 */
import { Form, Input, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { RuleObject } from 'antd/es/form';
import { zodRule } from '../lib/form-validation';
import { getZodLocale } from '../lib/zod-i18n';

interface I18nConfig {
    fields: Record<string, { label?: Record<string, string>; placeholder?: Record<string, string> }>;
}

interface JapaneseNameFieldProps {
    form?: FormInstance;
    schemas: Record<string, unknown>;
    i18n: I18nConfig;
    prefix?: string;
    required?: boolean;
    showKana?: boolean;
    label?: string;
    kanaLabel?: string;
}

function getLabel(i18n: I18nConfig, field: string, locale: string): string {
    return i18n.fields[field]?.label?.[locale] ?? i18n.fields[field]?.label?.['en'] ?? field;
}

function getCompoundLabel(i18n: I18nConfig, prefix: string, locale: string): string | undefined {
    // Try to get compound-level label (e.g., 'name' -> '氏名')
    return i18n.fields[prefix]?.label?.[locale] ?? i18n.fields[prefix]?.label?.['en'];
}

function getPlaceholder(i18n: I18nConfig, field: string, locale: string): string {
    return i18n.fields[field]?.placeholder?.[locale] ?? i18n.fields[field]?.placeholder?.['en'] ?? '';
}

export function JapaneseNameField({
    schemas,
    i18n,
    prefix = 'name',
    required = false,
    showKana = true,
    label,
    kanaLabel,
}: JapaneseNameFieldProps) {
    const locale = getZodLocale();

    const lastnameField = `${prefix}_lastname`;
    const firstnameField = `${prefix}_firstname`;
    const kanaLastnameField = `${prefix}_kana_lastname`;
    const kanaFirstnameField = `${prefix}_kana_firstname`;

    const getRule = (field: string): RuleObject[] => {
        const schema = schemas[field];
        if (!schema) return [];
        return [zodRule(schema as any, getLabel(i18n, field, locale))];
    };

    // Check if a field is required by examining its Zod schema
    const isFieldRequired = (field: string): boolean => {
        const schema = schemas[field];
        if (!schema) return false;
        const schemaDesc = (schema as any)?._def?.typeName;
        const inner = (schema as any)?._def?.innerType;
        if (schemaDesc === 'ZodOptional' || schemaDesc === 'ZodNullable') return false;
        if (inner?._def?.typeName === 'ZodOptional' || inner?._def?.typeName === 'ZodNullable') return false;
        return true;
    };

    const nameRequired = isFieldRequired(lastnameField) || isFieldRequired(firstnameField) || required;
    const kanaRequired = isFieldRequired(kanaLastnameField) || isFieldRequired(kanaFirstnameField);

    // Try compound label first, then fallback to first field's label
    const nameLabel = label ?? getCompoundLabel(i18n, prefix, locale) ?? getLabel(i18n, lastnameField, locale);
    const nameKanaLabel = kanaLabel ?? `${getCompoundLabel(i18n, prefix, locale) ?? getLabel(i18n, kanaLastnameField, locale)}（カナ）`;

    // Get short field labels (姓, 名, etc.)
    const lastnameShortLabel = locale === 'ja' ? '姓' : 'Last';
    const firstnameShortLabel = locale === 'ja' ? '名' : 'First';

    return (
        <>
            <Form.Item
                label={nameLabel}
                required={nameRequired}
                style={{ marginBottom: 0 }}
            >
                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item
                            name={lastnameField}
                            rules={getRule(lastnameField)}
                            style={{ marginBottom: 16 }}
                        >
                            <Input
                                prefix={
                                    <span style={{
                                        color: 'rgba(0, 0, 0, 0.88)',
                                        fontWeight: 500,
                                        borderRight: '1px solid #d9d9d9',
                                        paddingRight: 8,
                                        marginRight: 4,
                                    }}>
                                        {lastnameShortLabel}
                                    </span>
                                }
                                placeholder={getPlaceholder(i18n, lastnameField, locale)}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name={firstnameField}
                            rules={getRule(firstnameField)}
                            style={{ marginBottom: 16 }}
                        >
                            <Input
                                prefix={
                                    <span style={{
                                        color: 'rgba(0, 0, 0, 0.88)',
                                        fontWeight: 500,
                                        borderRight: '1px solid #d9d9d9',
                                        paddingRight: 8,
                                        marginRight: 4,
                                    }}>
                                        {firstnameShortLabel}
                                    </span>
                                }
                                placeholder={getPlaceholder(i18n, firstnameField, locale)}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form.Item>

            {showKana && (
                <Form.Item
                    label={nameKanaLabel}
                    required={kanaRequired}
                    style={{ marginBottom: 0 }}
                >
                    <Row gutter={8}>
                        <Col span={12}>
                            <Form.Item
                                name={kanaLastnameField}
                                rules={getRule(kanaLastnameField)}
                                style={{ marginBottom: 16 }}
                            >
                                <Input
                                    prefix={
                                        <span style={{
                                            color: 'rgba(0, 0, 0, 0.88)',
                                            fontWeight: 500,
                                            borderRight: '1px solid #d9d9d9',
                                            paddingRight: 8,
                                            marginRight: 4,
                                        }}>
                                            {lastnameShortLabel}
                                        </span>
                                    }
                                    placeholder={getPlaceholder(i18n, kanaLastnameField, locale)}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name={kanaFirstnameField}
                                rules={getRule(kanaFirstnameField)}
                                style={{ marginBottom: 16 }}
                            >
                                <Input
                                    prefix={
                                        <span style={{
                                            color: 'rgba(0, 0, 0, 0.88)',
                                            fontWeight: 500,
                                            borderRight: '1px solid #d9d9d9',
                                            paddingRight: 8,
                                            marginRight: 4,
                                        }}>
                                            {firstnameShortLabel}
                                        </span>
                                    }
                                    placeholder={getPlaceholder(i18n, kanaFirstnameField, locale)}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form.Item>
            )}
        </>
    );
}
