"use client";

import { Typography, Form } from "antd";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useFormMutation } from "@famgia/omnify-react";
import { userService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { UserForm } from "@/features/users/UserForm";
import type { UserCreate } from "@/omnify/schemas";

const { Title } = Typography;

export default function NewUserPage() {
  const t = useTranslations();
  const router = useRouter();
  const [form] = Form.useForm();

  const { mutate, isPending } = useFormMutation<UserCreate>({
    form,
    mutationFn: userService.create,
    invalidateKeys: [queryKeys.users.all],
    successMessage: t("messages.created"),
    onSuccess: () => router.push("/users"),
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
