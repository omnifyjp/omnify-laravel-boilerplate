"use client";

import { Button, Card, Space, Typography, Avatar, Divider } from "antd";
import { GithubOutlined, RocketOutlined, LoginOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useSso } from "@famgia/omnify-client-sso-react";

const { Title, Paragraph, Text } = Typography;

export default function Home() {
  const t = useTranslations();
  const { user, isAuthenticated, isLoading, login, logout } = useSso();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 24,
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
        extra={<LocaleSwitcher />}
      >
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <RocketOutlined style={{ fontSize: 64, color: "#1677ff" }} />

          <Title level={2} style={{ margin: 0 }}>
            Boilerplate
          </Title>

          <Paragraph type="secondary" style={{ fontSize: 16 }}>
            Laravel 12 + Next.js 16 + Ant Design 6
          </Paragraph>

          {/* SSO User Info */}
          <div style={{ padding: "16px 0" }}>
            {isLoading ? (
              <Text type="secondary">Loading...</Text>
            ) : isAuthenticated && user ? (
              <Space orientation="vertical" size="small">
                <Avatar size={64} icon={<UserOutlined />} />
                <Text strong>{user.name}</Text>
                <Text type="secondary">{user.email}</Text>
                <Button
                  type="default"
                  icon={<LogoutOutlined />}
                  onClick={logout}
                  danger
                >
                  Logout
                </Button>
              </Space>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<LoginOutlined />}
                onClick={() => login()}
              >
                Login with SSO
              </Button>
            )}
          </div>

          <Divider />

          <Space>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              href="https://api.boilerplate.app"
            >
              API
            </Button>
            <Button
              size="large"
              icon={<GithubOutlined />}
              href="https://github.com"
              target="_blank"
            >
              GitHub
            </Button>
          </Space>

          <Paragraph type="secondary">
            {t("nav.dashboard")} | {t("common.save")} | {t("messages.created")}
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
}
