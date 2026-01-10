"use client";

import { Select } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { useLocale } from "@/hooks/useLocale";

export default function LocaleSwitcher() {
  const { locale, locales, localeNames, setLocale, isPending } = useLocale();

  return (
    <Select
      value={locale}
      onChange={setLocale}
      loading={isPending}
      style={{ width: 120 }}
      suffixIcon={<GlobalOutlined />}
      options={locales.map((l) => ({
        value: l,
        label: localeNames[l],
      }))}
    />
  );
}
