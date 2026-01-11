"use client";

import { useEffect } from "react";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { setApiErrorHandler, ApiErrorType } from "@/lib/api";

export default function ApiErrorHandler() {
  const t = useTranslations("messages");
  const { message } = App.useApp();

  useEffect(() => {
    setApiErrorHandler((type: ApiErrorType) => {
      const messages: Record<ApiErrorType, string> = {
        unauthorized: t("unauthorized"),
        forbidden: t("forbidden"),
        notFound: t("notFound"),
        sessionExpired: t("sessionExpired"),
        tooManyRequests: t("tooManyRequests"),
        serverError: t("serverError"),
        networkError: t("networkError"),
        validation: "", // Handled by form
      };

      const msg = messages[type];
      if (msg) {
        message.error(msg);
      }
    });
  }, [t, message]);

  return null;
}
