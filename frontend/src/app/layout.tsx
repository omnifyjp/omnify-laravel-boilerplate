import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import AntdThemeProvider from "@/components/AntdThemeProvider";
import ApiErrorHandler from "@/components/ApiErrorHandler";
import QueryProvider from "@/lib/query";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boilerplate",
  description: "Laravel + Next.js Boilerplate",
};

// Font URLs based on locale - load only what's needed
const fontUrls: Record<string, string> = {
  ja: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap",
  en: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  vi: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const fontUrl = fontUrls[locale] ?? fontUrls.ja;

  return (
    <html lang={locale}>
      <head>
        {/* Google Fonts - Load only the font needed for current locale */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontUrl} rel="stylesheet" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AntdRegistry>
              <AntdThemeProvider>
                <ApiErrorHandler />
                {children}
              </AntdThemeProvider>
            </AntdRegistry>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
