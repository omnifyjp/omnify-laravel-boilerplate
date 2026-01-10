"use client";

import { ConfigProvider, theme } from "antd";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import jaJP from "antd/locale/ja_JP";
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import { setDayjsLocale } from "@/lib/dayjs";

const antdLocales = {
  ja: jaJP,
  en: enUS,
  vi: viVN,
};

interface AntdThemeProviderProps {
  children: React.ReactNode;
}

export default function AntdThemeProvider({
  children,
}: AntdThemeProviderProps) {
  const locale = useLocale();
  const antdLocale = antdLocales[locale as keyof typeof antdLocales] ?? jaJP;

  // Sync Day.js locale with app locale
  useEffect(() => {
    setDayjsLocale(locale);
  }, [locale]);

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
        },
        components: {
          Button: {
            controlHeight: 40,
          },
          Input: {
            controlHeight: 40,
          },
          Select: {
            controlHeight: 40,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
