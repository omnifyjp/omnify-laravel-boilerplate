"use client";

import { useState } from "react";
import { Layout, Menu, theme, Button } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";

const { Header, Sider, Content } = Layout;

// =============================================================================
// Types
// =============================================================================

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link href="/">{t("nav.dashboard")}</Link>,
    },
    {
      key: "/users",
      icon: <UserOutlined />,
      label: <Link href="/users">{t("nav.users")}</Link>,
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: <Link href="/settings">{t("nav.settings")}</Link>,
    },
  ];

  // Determine selected key from pathname
  const selectedKey = menuItems.find(
    (item) => pathname === item.key || (item.key !== "/" && pathname.startsWith(item.key))
  )?.key ?? "/";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={180}>
        <div
          style={{
            height: 28,
            margin: "8px 8px 12px",
            background: "#9061F9",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {collapsed ? "B" : "Boilerplate"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 16px",
            height: 48,
            lineHeight: "48px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 14, width: 32, height: 32 }}
          />
          <LocaleSwitcher />
        </Header>
        <Content
          style={{
            margin: 12,
            padding: 16,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
