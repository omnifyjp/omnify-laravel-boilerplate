"use client";

import {
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Descriptions,
  Avatar,
  Spin,
  Alert,
  Collapse,
  Badge,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  KeyOutlined,
  CrownOutlined,
  MailOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useSso } from "@famgia/sso-react";
import { ssoService, Role, Permission } from "@/services/sso";
import { queryKeys } from "@/lib/queryKeys";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const t = useTranslations();
  const { user, organizations, currentOrg } = useSso();

  // Fetch roles
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: queryKeys.sso.roles.list(),
    queryFn: () => ssoService.getRoles(),
  });

  // Fetch permissions
  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: queryKeys.sso.permissions.list(),
    queryFn: () => ssoService.getPermissions(),
  });

  // Fetch permission matrix
  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: queryKeys.sso.permissions.matrix(),
    queryFn: () => ssoService.getPermissionMatrix(),
  });

  const roles = rolesData?.data ?? [];
  const permissions = permissionsData?.data ?? [];

  // Group permissions by group
  const permissionsByGroup = permissions.reduce(
    (acc, perm) => {
      const group = perm.group || "other";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  // Role columns
  const roleColumns: ColumnsType<Role> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <Space>
          <CrownOutlined style={{ color: getRoleLevelColor(record.level) }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      render: (slug) => <Tag>{slug}</Tag>,
    },
    {
      title: "Level",
      dataIndex: "level",
      key: "level",
      sorter: (a, b) => b.level - a.level,
      render: (level) => (
        <Badge
          count={level}
          style={{ backgroundColor: getRoleLevelColor(level) }}
          overflowCount={9999}
        />
      ),
    },
    {
      title: "Permissions",
      key: "permissions",
      render: (_, record) => {
        const permCount =
          matrixData?.matrix[record.id]?.length ?? 0;
        return <Tag color="blue">{permCount} permissions</Tag>;
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (desc) => desc || <Text type="secondary">-</Text>,
    },
  ];

  // Permission columns
  const permissionColumns: ColumnsType<Permission> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <Space>
          <KeyOutlined />
          <Text>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      render: (slug) => <Tag color="green">{slug}</Tag>,
    },
    {
      title: "Group",
      dataIndex: "group",
      key: "group",
      render: (group) =>
        group ? <Tag color="purple">{group}</Tag> : <Text type="secondary">-</Text>,
    },
  ];

  return (
    <div>
      <Title level={2}>{t("nav.dashboard")}</Title>

      {/* User Info */}
      {user && (
        <Card style={{ marginBottom: 16 }}>
          <Space size="large">
            <Avatar size={64} icon={<UserOutlined />} />
            <Descriptions column={2} size="small">
              <Descriptions.Item
                label={<Space><MailOutlined />Email</Space>}
              >
                {user.email}
              </Descriptions.Item>
              <Descriptions.Item
                label={<Space><UserOutlined />Name</Space>}
              >
                {user.name || "Not set"}
              </Descriptions.Item>
              <Descriptions.Item
                label={<Space><IdcardOutlined />Console User ID</Space>}
              >
                {user.consoleUserId}
              </Descriptions.Item>
              <Descriptions.Item
                label={<Space><TeamOutlined />Current Org</Space>}
              >
                {currentOrg?.name || "None"}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        </Card>
      )}

      {/* Stats - Full width 4 columns */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Organizations"
              value={organizations.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Roles"
              value={roles.length}
              prefix={<CrownOutlined />}
              loading={rolesLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Permissions"
              value={permissions.length}
              prefix={<KeyOutlined />}
              loading={permissionsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Permission Groups"
              value={Object.keys(permissionsByGroup).length}
              prefix={<SafetyOutlined />}
              loading={permissionsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Organizations */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            Your Organizations
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {organizations.length > 0 ? (
          <Row gutter={[16, 16]}>
            {organizations.map((org) => (
              <Col key={org.id} xs={24} sm={12} lg={8}>
                <Card
                  size="small"
                  style={{
                    borderColor:
                      currentOrg?.id === org.id ? "#1890ff" : undefined,
                    backgroundColor:
                      currentOrg?.id === org.id ? "#e6f7ff" : undefined,
                  }}
                >
                  <Space direction="vertical" size={0}>
                    <Text strong>{org.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Org Role: <Tag>{org.orgRole}</Tag>
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Service Role: <Tag>{org.serviceRole}</Tag>
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Text type="secondary">No organizations found</Text>
        )}
      </Card>

      {/* Roles */}
      <Card
        title={
          <Space>
            <CrownOutlined />
            All Roles
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {rolesError ? (
          <Alert
            type="error"
            message="Failed to load roles"
            description="You may not have permission to view roles."
          />
        ) : (
          <Table
            columns={roleColumns}
            dataSource={roles}
            rowKey="id"
            loading={rolesLoading || matrixLoading}
            pagination={false}
            size="small"
          />
        )}
      </Card>

      {/* Permissions by Group */}
      <Card
        title={
          <Space>
            <KeyOutlined />
            All Permissions
          </Space>
        }
      >
        {permissionsError ? (
          <Alert
            type="error"
            message="Failed to load permissions"
            description="You may not have permission to view permissions."
          />
        ) : permissionsLoading ? (
          <Spin />
        ) : (
          <Collapse
            items={Object.entries(permissionsByGroup).map(([group, perms]) => ({
              key: group,
              label: (
                <Space>
                  <Tag color="purple">{group}</Tag>
                  <Text type="secondary">({perms.length} permissions)</Text>
                </Space>
              ),
              children: (
                <Table
                  columns={permissionColumns}
                  dataSource={perms}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ),
            }))}
            defaultActiveKey={Object.keys(permissionsByGroup).slice(0, 2)}
          />
        )}
      </Card>
    </div>
  );
}

// Helper function to get color based on role level
function getRoleLevelColor(level: number): string {
  if (level >= 100) return "#f5222d"; // Admin - Red
  if (level >= 50) return "#fa8c16"; // Manager - Orange
  if (level >= 30) return "#1890ff"; // Editor - Blue
  return "#52c41a"; // Member - Green
}
