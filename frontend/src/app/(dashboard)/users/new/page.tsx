"use client";

import { Typography, Form } from "antd";
import { useTranslations } from "next-intl";
import { userService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { useFormMutation } from "@/hooks/useFormMutation";
import { UserForm } from "@/features/users/UserForm";
import type { UserCreate } from "@/types/model";

const { Title } = Typography;

export default function NewUserPage() {
  const t = useTranslations();
  const [form] = Form.useForm();

  const { mutate, isPending } = useFormMutation<UserCreate>({
    form,
    mutationFn: userService.create,
    invalidateKeys: [queryKeys.users.all],
    successMessage: "messages.created",
    redirectTo: "/users",
  });

  return (
    <div>
      <Title level={2}>{t("common.create")} User</Title>
      <UserForm
        form={form}
        onSubmit={(values) => mutate(values as UserCreate)}
        loading={isPending}
        onCancel={() => history.back()}
      />
    </div>
  );
}
