'use client';

import { Card, Typography, Row, Col, Statistic, Button, Avatar, Space, Descriptions } from 'antd';
import {
    UserOutlined,
    LogoutOutlined,
    TeamOutlined,
    MailOutlined,
} from '@ant-design/icons';
import { useSso } from '@famgia/sso-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const { Title, Text } = Typography;

/**
 * Dashboard page - SSO認証後のメインページ
 */
export default function DashboardPage() {
    const { user, organizations, currentOrg, isLoading, isAuthenticated, logout, globalLogout, switchOrg } = useSso();
    const router = useRouter();

    // 未認証の場合はホームにリダイレクト
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Text>Loading...</Text>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
                    <Space>
                        <Button icon={<LogoutOutlined />} onClick={() => logout()}>
                            Logout
                        </Button>
                        <Button type="primary" danger icon={<LogoutOutlined />} onClick={() => globalLogout('/')}>
                            Global Logout
                        </Button>
                    </Space>
                </div>

                {/* User Info Card */}
                <Card title="User Information">
                    <Space size="large">
                        <Avatar size={64} icon={<UserOutlined />} />
                        <Descriptions column={1}>
                            <Descriptions.Item label={<><MailOutlined /> Email</>}>
                                {user.email}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><UserOutlined /> Name</>}>
                                {user.name || 'Not set'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Console User ID">
                                {user.consoleUserId}
                            </Descriptions.Item>
                        </Descriptions>
                    </Space>
                </Card>

                {/* Stats */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Organizations"
                                value={organizations.length}
                                prefix={<TeamOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Current Organization"
                                value={currentOrg?.name || 'None'}
                                prefix={<TeamOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Organizations */}
                <Card title="Your Organizations">
                    {organizations.length > 0 ? (
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            {organizations.map((org) => (
                                <Card
                                    key={org.id}
                                    size="small"
                                    style={{
                                        borderColor: currentOrg?.id === org.id ? '#1890ff' : undefined,
                                        backgroundColor: currentOrg?.id === org.id ? '#e6f7ff' : undefined,
                                    }}
                                >
                                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                        <div>
                                            <Text strong>{org.name}</Text>
                                            <br />
                                            <Text type="secondary">
                                                Org Role: {org.orgRole} | Service Role: {org.serviceRole}
                                            </Text>
                                        </div>
                                        {currentOrg?.id !== org.id && (
                                            <Button size="small" onClick={() => switchOrg(org.slug)}>
                                                Switch
                                            </Button>
                                        )}
                                    </Space>
                                </Card>
                            ))}
                        </Space>
                    ) : (
                        <Text type="secondary">No organizations found</Text>
                    )}
                </Card>
            </Space>
        </div>
    );
}
