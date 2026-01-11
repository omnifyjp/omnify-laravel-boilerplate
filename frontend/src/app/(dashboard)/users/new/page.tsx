"use client";

import { Typography, message, Form } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { userService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { getFormErrors } from "@/lib/api";
import { UserForm } from "@/features/users/UserForm";
import type { UserCreate } from "@/types/model";

const { Title } = Typography;

export default function NewUserPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      message.success(t("messages.created"));
      router.push("/users");
    },
    onError: (error) => {
      form.setFields(getFormErrors(error));
    },
  });

  const handleSubmit = (values: UserCreate) => {
    createMutation.mutate(values);
  };

  return (
    <div>
      <Title level={2}>{t("common.create")} User</Title>

      <UserForm
        onSubmit={handleSubmit}
        loading={createMutation.isPending}
        onCancel={() => router.push("/users")}
      />
    </div>
  );
}
