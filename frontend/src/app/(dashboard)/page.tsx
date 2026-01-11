"use client";

import { Card, Typography, Row, Col, Statistic } from "antd";
import { UserOutlined, FileOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title } = Typography;

export default function DashboardPage() {
  const t = useTranslations();

  return (
    <div>
      <Title level={2}>{t("nav.dashboard")}</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Users"
              value={0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Posts"
              value={0}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Active"
              value={0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
