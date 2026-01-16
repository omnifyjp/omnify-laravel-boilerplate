"use client";

import { Button, Space, Table, Popconfirm } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { User } from "@/omnify/schemas";
import type { PaginatedResponse } from "@/lib/api";
import { formatDateTime } from "@/lib/dayjs";
import type { UserSortField } from "@/services/users";

// =============================================================================
// Types
// =============================================================================

interface UserTableProps {
  users: User[];
  loading?: boolean;
  pagination?: PaginatedResponse<User>["meta"];
  sortField?: UserSortField;
  onPageChange?: (page: number, pageSize: number) => void;
  onSortChange?: (sort: UserSortField | undefined) => void;
  onDelete?: (user: User) => void;
  deleteLoading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

// Map sort field to Ant Design sort order
function getSortOrder(sortField: UserSortField | undefined, field: string): "ascend" | "descend" | undefined {
  if (!sortField) return undefined;
  if (sortField === field) return "ascend";
  if (sortField === `-${field}`) return "descend";
  return undefined;
}

// Map Ant Design sorter to Laravel sort field
function toSortField(sorter: SorterResult<User>): UserSortField | undefined {
  if (!sorter.field || !sorter.order) return undefined;
  const field = sorter.field as string;
  return sorter.order === "descend" ? `-${field}` as UserSortField : field as UserSortField;
}

export function UserTable({
  users,
  loading = false,
  pagination,
  sortField,
  onPageChange,
  onSortChange,
  onDelete,
  deleteLoading = false,
}: UserTableProps) {
  const t = useTranslations();

  const columns: ColumnsType<User> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      sorter: true,
      sortOrder: getSortOrder(sortField, "id"),
    },
    {
      title: t("auth.email"),
      dataIndex: "email",
      sorter: true,
      sortOrder: getSortOrder(sortField, "email"),
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      sortOrder: getSortOrder(sortField, "name"),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      sorter: true,
      sortOrder: getSortOrder(sortField, "created_at"),
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

  const handleTableChange: TableProps<User>["onChange"] = (paginationConfig, _filters, sorter) => {
    // Handle sort change
    if (!Array.isArray(sorter)) {
      onSortChange?.(toSortField(sorter));
    }

    // Handle pagination change
    if (paginationConfig.current && paginationConfig.pageSize) {
      onPageChange?.(paginationConfig.current, paginationConfig.pageSize);
    }
  };

  return (
    <Table
      dataSource={users}
      columns={columns}
      loading={loading}
      rowKey="id"
      onChange={handleTableChange}
      pagination={
        pagination
          ? {
            current: pagination.current_page,
            total: pagination.total,
            pageSize: pagination.per_page,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }
          : false
      }
    />
  );
}
