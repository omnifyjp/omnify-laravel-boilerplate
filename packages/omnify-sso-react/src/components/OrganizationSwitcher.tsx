'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import type { OrganizationSwitcherProps, SsoOrganization } from '../types';

/**
 * Default trigger component
 */
function DefaultTrigger({
    currentOrg,
    isOpen,
    onClick,
}: {
    currentOrg: SsoOrganization | null;
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                border: '1px solid #ccc',
                borderRadius: '0.375rem',
                background: 'white',
                cursor: 'pointer',
                minWidth: '200px',
                justifyContent: 'space-between',
            }}
        >
            <span>{currentOrg?.name ?? 'Select Organization'}</span>
            <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </button>
    );
}

/**
 * Default option component
 */
function DefaultOption({
    org,
    isSelected,
    onClick,
}: {
    org: SsoOrganization;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem 1rem',
                textAlign: 'left',
                border: 'none',
                background: isSelected ? '#f0f0f0' : 'transparent',
                cursor: 'pointer',
            }}
        >
            <div style={{ fontWeight: isSelected ? 600 : 400 }}>{org.name}</div>
            {org.serviceRole && (
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{org.serviceRole}</div>
            )}
        </button>
    );
}

/**
 * Organization Switcher component
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
 *     <button>{org?.name} {isOpen ? '▲' : '▼'}</button>
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
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = useCallback(
        (org: SsoOrganization) => {
            switchOrg(org.slug);
            setIsOpen(false);
            onChange?.(org);
        },
        [switchOrg, onChange]
    );

    // Don't render if only one org
    if (!hasMultipleOrgs) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            {/* Trigger */}
            {renderTrigger ? (
                <div onClick={() => setIsOpen(!isOpen)}>{renderTrigger(currentOrg, isOpen)}</div>
            ) : (
                <DefaultTrigger
                    currentOrg={currentOrg}
                    isOpen={isOpen}
                    onClick={() => setIsOpen(!isOpen)}
                />
            )}

            {/* Dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.25rem',
                        background: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        maxHeight: '300px',
                        overflowY: 'auto',
                    }}
                >
                    {organizations.map((org) => {
                        const isSelected = currentOrg?.slug === org.slug;

                        if (renderOption) {
                            return (
                                <div key={org.slug} onClick={() => handleSelect(org)}>
                                    {renderOption(org, isSelected)}
                                </div>
                            );
                        }

                        return (
                            <DefaultOption
                                key={org.slug}
                                org={org}
                                isSelected={isSelected}
                                onClick={() => handleSelect(org)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
