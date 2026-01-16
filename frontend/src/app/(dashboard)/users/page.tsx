"use client";

import { useState } from "react";
import { Button, Input, Space, Typography, App } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { userService, UserListParams } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { UserTable } from "@/features/users/UserTable";

const { Title } = Typography;

export default function UsersPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [params, setParams] = useState<UserListParams>({ page: 1, per_page: 10 });
  const [searchValue, setSearchValue] = useState("");

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => userService.list(params),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: userService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      message.success(t("messages.deleted"));
    },
    onError: () => {
      message.error(t("messages.error"));
    },
  });

  const handleSearch = () => {
    setParams({ ...params, filter: { search: searchValue }, page: 1 });
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setParams({ ...params, page, per_page: pageSize });
  };

  const handleSortChange = (sort: UserListParams["sort"]) => {
    setParams({ ...params, sort, page: 1 });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          {t("nav.users")}
        </Title>
        <Link href="/users/new">
          <Button type="primary" icon={<PlusOutlined />}>
            {t("common.create")}
          </Button>
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Space>
          <Input
            placeholder={t("common.search")}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          <Button onClick={handleSearch}>{t("common.search")}</Button>
        </Space>
      </div>

      <UserTable
        users={data?.data ?? []}
        loading={isLoading}
        pagination={data?.meta}
        sortField={params.sort}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        onDelete={(user) => deleteMutation.mutate(user.id)}
        deleteLoading={deleteMutation.isPending}
      />
    </div>
  );
}
