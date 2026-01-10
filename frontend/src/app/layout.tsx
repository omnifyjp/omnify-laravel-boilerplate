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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
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
