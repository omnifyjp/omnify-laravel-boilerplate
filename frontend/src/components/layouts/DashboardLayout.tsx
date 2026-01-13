"use client";

import { useState, useEffect } from "react";
import { Layout, Menu, theme, Button, Spin, Dropdown } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useSso } from "@omnify/sso-react";

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
  const { user, isLoading, isAuthenticated, login, logout } = useSso();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 認証チェック - 未認証の場合はログインへリダイレクト
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login("/dashboard");
    }
  }, [isLoading, isAuthenticated, login]);

  // ローディング中または未認証の場合はスピナーを表示
  if (isLoading || !isAuthenticated) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh"
      }}>
        <Spin size="large" />
      </div>
    );
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LocaleSwitcher />
            <Dropdown
              menu={{
                items: [
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: t("auth.logout"),
                    onClick: () => logout(),
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="text" icon={<UserOutlined />}>
                {user?.name || user?.email}
              </Button>
            </Dropdown>
          </div>
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
