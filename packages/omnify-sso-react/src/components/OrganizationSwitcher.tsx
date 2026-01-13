'use client';

import React, { useCallback, useMemo } from 'react';
import { Dropdown, Button, Space, Typography, Badge } from 'antd';
import { SwapOutlined, CheckOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useOrganization } from '../hooks/useOrganization';
import type { OrganizationSwitcherProps, SsoOrganization } from '../types';

const { Text } = Typography;

/**
 * Organization Switcher component using Ant Design
 *
 * A dropdown component for switching between organizations.
 * Only renders if user has access to multiple organizations.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <OrganizationSwitcher />
 *
 * // With custom styling
 * <OrganizationSwitcher className="my-switcher" />
 *
 * // With custom render
 * <OrganizationSwitcher
 *   renderTrigger={(org, isOpen) => (
 *     <Button>{org?.name} {isOpen ? '▲' : '▼'}</Button>
 *   )}
 *   renderOption={(org, isSelected) => (
 *     <div className={isSelected ? 'selected' : ''}>{org.name}</div>
 *   )}
 * />
 * ```
 */
export function OrganizationSwitcher({
    className,
    renderTrigger,
    renderOption,
    onChange,
}: OrganizationSwitcherProps) {
    const { organizations, currentOrg, hasMultipleOrgs, switchOrg } = useOrganization();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSelect = useCallback(
        (org: SsoOrganization) => {
            switchOrg(org.slug);
            setIsOpen(false);
            onChange?.(org);
        },
        [switchOrg, onChange]
    );

    const menuItems: MenuProps['items'] = useMemo(() => {
        return organizations.map((org) => {
            const isSelected = currentOrg?.slug === org.slug;

            if (renderOption) {
                return {
                    key: org.slug,
                    label: (
                        <div onClick={() => handleSelect(org)}>
                            {renderOption(org, isSelected)}
                        </div>
                    ),
                };
            }

            return {
                key: org.slug,
                label: (
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space direction="vertical" size={0}>
                            <Text strong={isSelected}>{org.name}</Text>
                            {org.serviceRole && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {org.serviceRole}
                                </Text>
                            )}
                        </Space>
                        {isSelected && <CheckOutlined style={{ color: '#1890ff' }} />}
                    </Space>
                ),
                onClick: () => handleSelect(org),
            };
        });
    }, [organizations, currentOrg, renderOption, handleSelect]);

    // Don't render if only one org
    if (!hasMultipleOrgs) {
        return null;
    }

    // Custom trigger
    if (renderTrigger) {
        return (
            <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
                open={isOpen}
                onOpenChange={setIsOpen}
                className={className}
            >
                <div style={{ cursor: 'pointer' }}>
                    {renderTrigger(currentOrg, isOpen)}
                </div>
            </Dropdown>
        );
    }

    // Default Ant Design trigger
    return (
        <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            open={isOpen}
            onOpenChange={setIsOpen}
            className={className}
        >
            <Button>
                <Space>
                    <Badge status="success" />
                    <span>{currentOrg?.name ?? 'Select Organization'}</span>
                    <SwapOutlined />
                </Space>
            </Button>
        </Dropdown>
    );
}
