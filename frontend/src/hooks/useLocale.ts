"use client";

import { useLocale as useNextIntlLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Locale, locales, localeNames } from "@/i18n";

export function useLocale() {
  const locale = useNextIntlLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = (newLocale: Locale) => {
    // Set cookie
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;

    // Refresh to apply new locale
    startTransition(() => {
      router.refresh();
    });
  };

  return {
    locale,
    locales,
    localeNames,
    setLocale,
    isPending,
  };
}
