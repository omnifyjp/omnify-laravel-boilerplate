"use client";

import { Form, Input, Button, Space, Card, Row, Col } from "antd";
import type { FormInstance } from "antd";
import { useTranslations, useLocale } from "next-intl";
import type { User } from "@/omnify/schemas";
import { userSchemas, getUserFieldLabel } from "@/omnify/schemas";
import { zodRule, setZodLocale } from "@/omnify/lib";

// =============================================================================
// Types
// =============================================================================

interface UserFormProps {
  /** Form instance từ parent - BẮT BUỘC để nhận lỗi từ backend */
  form: FormInstance;
  initialValues?: Partial<User>;
  /** Validation đảm bảo values đầy đủ - cast type ở page */
  onSubmit: (values: Record<string, unknown>) => void;
  loading?: boolean;
  isEdit?: boolean;
  onCancel?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function UserForm({
  form,
  initialValues,
  onSubmit,
  loading = false,
  isEdit = false,
  onCancel,
}: UserFormProps) {
  const t = useTranslations();
  const locale = useLocale();

  // Set locale for Zod validation messages
  setZodLocale(locale);

  const label = (key: string) => getUserFieldLabel(key, locale);

  return (
    <Card>
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={initialValues}
        onFinish={onSubmit}
        style={{ maxWidth: 800 }}
      >
        {/* 名前 (姓・名) / Name */}
        <Form.Item label={label("name_lastname")} required style={{ marginBottom: 0 }}>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                name="name_lastname"
                rules={[zodRule(userSchemas.name_lastname, label("name_lastname"))]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder={label("name_lastname")} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name_firstname"
                rules={[zodRule(userSchemas.name_firstname, label("name_firstname"))]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder={label("name_firstname")} />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        {/* 名前カナ (姓・名) / Name Kana */}
        <Form.Item label={label("name_kana_lastname")} required style={{ marginBottom: 0 }}>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                name="name_kana_lastname"
                rules={[zodRule(userSchemas.name_kana_lastname, label("name_kana_lastname"))]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder={label("name_kana_lastname")} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name_kana_firstname"
                rules={[zodRule(userSchemas.name_kana_firstname, label("name_kana_firstname"))]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder={label("name_kana_firstname")} />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        {/* メールアドレス / Email */}
        <Form.Item
          name="email"
          label={label("email")}
          rules={[zodRule(userSchemas.email, label("email"))]}
        >
          <Input type="email" />
        </Form.Item>

        {/* パスワード / Password */}
        {!isEdit && (
          <Form.Item
            name="password"
            label={label("password")}
            rules={[zodRule(userSchemas.password, label("password"))]}
          >
            <Input.Password />
          </Form.Item>
        )}

        <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t("common.save")}
            </Button>
            {onCancel && <Button onClick={onCancel}>{t("common.cancel")}</Button>}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
