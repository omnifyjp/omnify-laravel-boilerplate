"use client";

import { Form, Input, Button, Space, Card } from "antd";
import { useTranslations, useLocale } from "next-intl";
import type { User, UserCreate, UserUpdate } from "@/types/model";
import { getUserRules, getUserPropertyDisplayName } from "@/types/model";

// =============================================================================
// Types
// =============================================================================

interface UserFormProps {
  /** Initial values for edit mode */
  initialValues?: Partial<User>;
  /** Submit handler */
  onSubmit: (values: UserCreate | UserUpdate) => void;
  /** Loading state */
  loading?: boolean;
  /** Is edit mode (hides password field if true) */
  isEdit?: boolean;
  /** Cancel handler */
  onCancel?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function UserForm({
  initialValues,
  onSubmit,
  loading = false,
  isEdit = false,
  onCancel,
}: UserFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [form] = Form.useForm();
  const rules = getUserRules(locale);

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={onSubmit}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="name"
          label={getUserPropertyDisplayName("name", locale)}
          rules={rules.name}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="email"
          label={getUserPropertyDisplayName("email", locale)}
          rules={[...rules.email, { type: "email", message: t("validation.email") }]}
        >
          <Input type="email" />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            name="password"
            label={getUserPropertyDisplayName("password", locale)}
            rules={rules.password}
          >
            <Input.Password />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t("common.save")}
            </Button>
            {onCancel && (
              <Button onClick={onCancel}>{t("common.cancel")}</Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}

/** Expose form instance for external control (e.g., setFields for errors) */
export function useUserForm() {
  return Form.useForm();
}
