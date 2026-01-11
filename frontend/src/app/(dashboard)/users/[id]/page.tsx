"use client";

import { use } from "react";
import { Typography, Descriptions, Card, Button, Space, Spin, Popconfirm, App } from "antd";
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { userService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { getUserFieldLabel } from "@/omnify/schemas";
import { formatDateTime } from "@/lib/dayjs";

const { Title } = Typography;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const userId = parseInt(id, 10);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  // Fetch user
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => userService.get(userId),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: userService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      message.success(t("messages.deleted"));
      router.push("/users");
    },
    onError: () => {
      message.error(t("messages.error"));
    },
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Space>
          <Link href="/users">
            <Button icon={<ArrowLeftOutlined />}>{t("common.back")}</Button>
          </Link>
          <Title level={2} style={{ margin: 0 }}>
            {user.name_full_name ?? `${user.name_lastname} ${user.name_firstname}`}
          </Title>
        </Space>
        <Space>
          <Link href={`/users/${user.id}/edit`}>
            <Button type="primary" icon={<EditOutlined />}>
              {t("common.edit")}
            </Button>
          </Link>
          <Popconfirm
            title={t("messages.confirmDelete")}
            onConfirm={() => deleteMutation.mutate(user.id)}
            okText={t("common.yes")}
            cancelText={t("common.no")}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
              {t("common.delete")}
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Card>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
          <Descriptions.Item label={getUserFieldLabel("name", locale)}>
            {user.name_full_name ?? `${user.name_lastname} ${user.name_firstname}`}
          </Descriptions.Item>
          <Descriptions.Item label={getUserFieldLabel("email", locale)}>
            {user.email}
          </Descriptions.Item>
          <Descriptions.Item label={getUserFieldLabel("email_verified_at", locale)}>
            {user.email_verified_at ? formatDateTime(user.email_verified_at) : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            {user.created_at ? formatDateTime(user.created_at) : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {user.updated_at ? formatDateTime(user.updated_at) : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
