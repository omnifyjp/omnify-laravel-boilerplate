/**
 * JapaneseBankField - Japanese bank account input component
 */
import { Form, Input, Select, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { RuleObject } from 'antd/es/form';
import { zodRule } from '../lib/form-validation.js';
import { getZodLocale } from '../lib/zod-i18n.js';
import { BankAccountType, BankAccountTypeValues, getBankAccountTypeLabel } from '../enum/plugin/BankAccountType.js';

interface I18nConfig {
  fields: Record<string, { label?: Record<string, string>; placeholder?: Record<string, string> }>;
}

interface SelectOption {
  value: string | number;
  label: string;
}

interface JapaneseBankFieldProps {
  form?: FormInstance;
  schemas: Record<string, unknown>;
  i18n: I18nConfig;
  prefix?: string;
  accountTypeOptions?: SelectOption[];
}

function getLabel(i18n: I18nConfig, field: string, locale: string): string {
  return i18n.fields[field]?.label?.[locale] ?? i18n.fields[field]?.label?.['en'] ?? field;
}

function getPlaceholder(i18n: I18nConfig, field: string, locale: string): string {
  return i18n.fields[field]?.placeholder?.[locale] ?? i18n.fields[field]?.placeholder?.['en'] ?? '';
}

// Build account type options from enum
function buildAccountTypeOptions(locale: string): SelectOption[] {
  return BankAccountTypeValues.map(value => ({
    value,
    label: getBankAccountTypeLabel(value, locale),
  }));
}

export function JapaneseBankField({
  schemas,
  i18n,
  prefix = 'bank',
  accountTypeOptions,
}: JapaneseBankFieldProps) {
  const locale = getZodLocale();
  const options = accountTypeOptions ?? buildAccountTypeOptions(locale);

  const bankCodeField = `${prefix}_bank_code`;
  const bankNameField = `${prefix}_bank_name`;
  const branchCodeField = `${prefix}_branch_code`;
  const branchNameField = `${prefix}_branch_name`;
  const accountTypeField = `${prefix}_account_type`;
  const accountNumberField = `${prefix}_account_number`;
  const accountHolderField = `${prefix}_account_holder`;

  const getRule = (field: string): RuleObject[] => {
    const schema = schemas[field];
    if (!schema) return [];
    return [zodRule(schema as any, getLabel(i18n, field, locale))];
  };

  // Check if a field is required by examining its Zod schema
  const isRequired = (field: string): boolean => {
    const schema = schemas[field];
    if (!schema) return false;
    const schemaDesc = (schema as any)?._def?.typeName;
    const inner = (schema as any)?._def?.innerType;
    if (schemaDesc === 'ZodOptional' || schemaDesc === 'ZodNullable') return false;
    if (inner?._def?.typeName === 'ZodOptional' || inner?._def?.typeName === 'ZodNullable') return false;
    return true;
  };

  const bankRequired = isRequired(bankCodeField) || isRequired(bankNameField);
  const branchRequired = isRequired(branchCodeField) || isRequired(branchNameField);

  // Short labels
  const codeShortLabel = locale === 'ja' ? 'コード' : 'Code';
  const nameShortLabel = locale === 'ja' ? '名称' : 'Name';

  // Compound label from i18n
  const compoundLabel = i18n.fields[prefix]?.label?.[locale]
    ?? i18n.fields[prefix]?.label?.['en']
    ?? getLabel(i18n, bankCodeField, locale);

  const bankLabel = locale === 'ja' ? '銀行' : 'Bank';
  const branchLabel = locale === 'ja' ? '支店' : 'Branch';

  const prefixStyle = {
    color: 'rgba(0, 0, 0, 0.88)',
    fontWeight: 500,
    borderRight: '1px solid #d9d9d9',
    paddingRight: 8,
    marginRight: 4,
  };

  return (
    <>
      {/* 銀行コード・銀行名 */}
      <Form.Item
        label={bankLabel}
        required={bankRequired}
        style={{ marginBottom: 0 }}
      >
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item
              name={bankCodeField}
              rules={getRule(bankCodeField)}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<span style={prefixStyle}>{codeShortLabel}</span>}
                placeholder={getPlaceholder(i18n, bankCodeField, locale)}
                maxLength={4}
              />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name={bankNameField}
              rules={getRule(bankNameField)}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<span style={prefixStyle}>{nameShortLabel}</span>}
                placeholder={getPlaceholder(i18n, bankNameField, locale)}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>

      {/* 支店コード・支店名 */}
      <Form.Item
        label={branchLabel}
        required={branchRequired}
        style={{ marginBottom: 0 }}
      >
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item
              name={branchCodeField}
              rules={getRule(branchCodeField)}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<span style={prefixStyle}>{codeShortLabel}</span>}
                placeholder={getPlaceholder(i18n, branchCodeField, locale)}
                maxLength={3}
              />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name={branchNameField}
              rules={getRule(branchNameField)}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<span style={prefixStyle}>{nameShortLabel}</span>}
                placeholder={getPlaceholder(i18n, branchNameField, locale)}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>

      {/* 口座種別 */}
      <Form.Item
        name={accountTypeField}
        label={getLabel(i18n, accountTypeField, locale)}
        rules={getRule(accountTypeField)}
        required={isRequired(accountTypeField)}
      >
        <Select
          placeholder={getPlaceholder(i18n, accountTypeField, locale)}
          options={options}
          style={{ width: 150 }}
        />
      </Form.Item>

      {/* 口座番号 */}
      <Form.Item
        name={accountNumberField}
        label={getLabel(i18n, accountNumberField, locale)}
        rules={getRule(accountNumberField)}
        required={isRequired(accountNumberField)}
      >
        <Input
          placeholder={getPlaceholder(i18n, accountNumberField, locale)}
          maxLength={7}
          style={{ width: 150 }}
        />
      </Form.Item>

      {/* 口座名義 */}
      <Form.Item
        name={accountHolderField}
        label={getLabel(i18n, accountHolderField, locale)}
        rules={getRule(accountHolderField)}
        required={isRequired(accountHolderField)}
      >
        <Input placeholder={getPlaceholder(i18n, accountHolderField, locale)} />
      </Form.Item>
    </>
  );
}
