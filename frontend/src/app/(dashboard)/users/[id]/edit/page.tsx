"use client";

import { use } from "react";
import { Typography, Button, Space, Spin, Form } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { userService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { useFormMutation } from "@/hooks/useFormMutation";
import { UserForm } from "@/features/users/UserForm";
import type { UserUpdate } from "@/types/model";

const { Title } = Typography;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: PageProps) {
  const { id } = use(params);
  const userId = parseInt(id, 10);
  const t = useTranslations();
  const [form] = Form.useForm();

  // Fetch user
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => userService.get(userId),
  });

  // Update mutation
  const { mutate, isPending } = useFormMutation<UserUpdate>({
    form,
    mutationFn: (data) => userService.update(userId, data),
    invalidateKeys: [queryKeys.users.all, queryKeys.users.detail(userId)],
    successMessage: "messages.updated",
    redirectTo: `/users/${userId}`,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Title level={4}>{t("messages.notFound")}</Title>
        <Link href="/users">
          <Button icon={<ArrowLeftOutlined />}>{t("common.back")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Link href={`/users/${userId}`}>
          <Button icon={<ArrowLeftOutlined />}>{t("common.back")}</Button>
        </Link>
        <Title level={2} style={{ margin: 0 }}>
          {t("common.edit")} - {user.name}
        </Title>
      </Space>

      <UserForm
        form={form}
        initialValues={user}
        onSubmit={(values) => mutate(values as UserUpdate)}
        loading={isPending}
        isEdit
        onCancel={() => history.back()}
      />
    </div>
  );
}
