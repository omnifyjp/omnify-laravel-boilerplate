"use client";

import { ConfigProvider, theme, App } from "antd";
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

// Font families optimized for each language
const fontFamilies: Record<string, string> = {
  // Japanese - CJK optimized fonts
  ja: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif",
  // English - Modern western fonts  
  en: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  // Vietnamese - Light, clean font with good diacritics
  vi: "'Inter', 'Nunito Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

interface AntdThemeProviderProps {
  children: React.ReactNode;
}

export default function AntdThemeProvider({
  children,
}: AntdThemeProviderProps) {
  const locale = useLocale();
  const antdLocale = antdLocales[locale as keyof typeof antdLocales] ?? jaJP;
  const fontFamily = fontFamilies[locale] ?? fontFamilies.ja;

  useEffect(() => {
    setDayjsLocale(locale);
  }, [locale]);

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          // ===========================================
          // Tempofast Design System (HSL-based harmony)
          // Primary Hue: 258° (Violet)
          // ===========================================

          // Primary - Violet (Brand)
          colorPrimary: "#7C3AED",        // HSL(258, 84%, 58%)
          colorInfo: "#7C3AED",

          // Semantic Colors (Complementary harmony)
          colorSuccess: "#10B981",         // HSL(160, 84%, 39%) - Teal-green, cool tone
          colorWarning: "#F59E0B",         // HSL(38, 92%, 50%) - Amber, warm accent
          colorError: "#EF4444",           // HSL(0, 84%, 60%) - Red, same saturation

          // Text - Neutral with slight violet undertone
          colorText: "#1E1B2E",            // Near black with violet tint
          colorTextSecondary: "#4B5563",   // Cool gray
          colorTextTertiary: "#9CA3AF",    // Light cool gray

          // Background - Cool neutrals
          colorBgLayout: "#F8F7FA",        // Very light violet-gray
          colorBgContainer: "#FFFFFF",
          colorBgElevated: "#FFFFFF",

          // Border - Subtle
          colorBorder: "#E5E7EB",
          colorBorderSecondary: "#F3F4F6",

          // Border Radius - Compact
          borderRadius: 4,
          borderRadiusSM: 2,
          borderRadiusLG: 6,

          // Control Heights - Compact
          controlHeight: 32,
          controlHeightLG: 36,
          controlHeightSM: 28,

          // Font - Dynamic based on locale
          fontFamily,
          fontSize: 13,
          fontSizeLG: 14,
          fontSizeHeading1: 24,
          fontSizeHeading2: 20,
          fontSizeHeading3: 16,
          fontSizeHeading4: 14,
          fontSizeHeading5: 13,

          // Spacing - Tight
          padding: 12,
          paddingLG: 16,
          paddingSM: 8,
          paddingXS: 4,
          margin: 12,
          marginLG: 16,
          marginSM: 8,
          marginXS: 4,

          // Shadows - Almost flat (Japanese style)
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
          boxShadowSecondary: "0 1px 3px rgba(0, 0, 0, 0.04)",

          // Line Height
          lineHeight: 1.5,
        },
        components: {
          Button: {
            controlHeight: 32,
            paddingInline: 12,
            fontWeight: 500,
          },
          Input: {
            controlHeight: 32,
            paddingInline: 8,
          },
          Select: {
            controlHeight: 32,
          },
          Table: {
            cellPaddingBlock: 8,
            cellPaddingInline: 8,
            headerBg: "#F8F7FA",
          },
          Card: {
            paddingLG: 16,
          },
          Form: {
            itemMarginBottom: 16,
            verticalLabelPadding: "0 0 4px",
          },
          Menu: {
            itemHeight: 36,
            itemMarginBlock: 2,
            itemMarginInline: 4,
            darkItemBg: "#7C3AED",
            darkSubMenuItemBg: "#6D28D9",
            darkItemSelectedBg: "#9061F9",
            darkItemSelectedColor: "#FFFFFF",
            darkItemColor: "rgba(255, 255, 255, 0.9)",
            darkItemHoverBg: "rgba(144, 97, 249, 0.6)",
            darkItemHoverColor: "#FFFFFF",
          },
          Layout: {
            siderBg: "#7C3AED",
            headerPadding: "0 16px",
            headerHeight: 48,
          },
          Typography: {
            titleMarginBottom: 8,
            titleMarginTop: 0,
          },
          Modal: {
            paddingContentHorizontalLG: 16,
          },
          Descriptions: {
            itemPaddingBottom: 8,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
