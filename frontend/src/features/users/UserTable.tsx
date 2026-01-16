"use client";

import { Button, Space, Table, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { User } from "@/omnify/schemas";
import type { PaginatedResponse } from "@/lib/api";
import { formatDateTime } from "@/lib/dayjs";

// =============================================================================
// Types
// =============================================================================

interface UserTableProps {
  users: User[];
  loading?: boolean;
  pagination?: PaginatedResponse<User>["meta"];
  onPageChange?: (page: number, pageSize: number) => void;
  onDelete?: (user: User) => void;
  deleteLoading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function UserTable({
  users,
  loading = false,
  pagination,
  onPageChange,
  onDelete,
  deleteLoading = false,
}: UserTableProps) {
  const t = useTranslations();

  const columns: ColumnsType<User> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
    },
    {
      title: t("auth.email"),
      dataIndex: "email",
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      render: (value) => (value ? formatDateTime(value) : "-"),
    },
    {
      title: t("common.edit"),
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Link href={`/users/${record.id}`}>
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Link>
          <Link href={`/users/${record.id}/edit`}>
            <Button type="text" icon={<EditOutlined />} size="small" />
          </Link>
          {onDelete && (
            <Popconfirm
              title={t("messages.confirmDelete")}
              onConfirm={() => onDelete(record)}
              okText={t("common.yes")}
              cancelText={t("common.no")}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                loading={deleteLoading}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={users}
      columns={columns}
      loading={loading}
      rowKey="id"
      pagination={
        pagination
          ? {
            current: pagination.current_page,
            total: pagination.total,
            pageSize: pagination.per_page,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
            onChange: onPageChange,
          }
          : false
      }
    />
  );
}
