/**
 * useOrganization Hook Tests
 *
 * useOrganizationフックのテスト
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrganization } from '../../src/hooks/useOrganization';
import { SsoProvider } from '../../src/context/SsoProvider';
import type { SsoConfig } from '../../src/types';

// デフォルトのテスト設定
const defaultConfig: SsoConfig = {
    apiUrl: 'http://localhost:8000',
    consoleUrl: 'https://console.example.com',
    serviceSlug: 'test-service',
    baseUrl: 'http://localhost:3000',
};

// ラッパーコンポーネント
function Wrapper({ children }: { children: React.ReactNode }) {
    return <SsoProvider config={defaultConfig}>{children}</SsoProvider>;
}

describe('useOrganization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    });

    it('returns organizations and current org', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    id: 1,
                    console_user_id: 100,
                    email: 'test@example.com',
                    name: 'Test',
                },
                organizations: [
                    {
                        organization_id: 1,
                        organization_slug: 'org-a',
                        organization_name: 'Org A',
                        org_role: 'admin',
                        service_role: 'admin',
                    },
                    {
                        organization_id: 2,
                        organization_slug: 'org-b',
                        organization_name: 'Org B',
                        org_role: 'member',
                        service_role: 'member',
                    },
                ],
            }),
        });

        const { result } = renderHook(() => useOrganization(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.organizations).toHaveLength(2);
        });

        expect(result.current.currentOrg?.slug).toBe('org-a');
        expect(result.current.hasMultipleOrgs).toBe(true);
    });

    it('returns currentRole from current organization', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    id: 1,
                    console_user_id: 100,
                    email: 'test@example.com',
                    name: 'Test',
                },
                organizations: [
                    {
                        organization_id: 1,
                        organization_slug: 'org-a',
                        organization_name: 'Org A',
                        org_role: 'admin',
                        service_role: 'manager',
                    },
                ],
            }),
        });

        const { result } = renderHook(() => useOrganization(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.currentRole).toBe('manager');
        });
    });

    it('hasRole returns true for equal or higher role', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    id: 1,
                    console_user_id: 100,
                    email: 'test@example.com',
                    name: 'Test',
                },
                organizations: [
                    {
                        organization_id: 1,
                        organization_slug: 'org-a',
                        organization_name: 'Org A',
                        org_role: 'admin',
                        service_role: 'admin', // level 100
                    },
                ],
            }),
        });

        const { result } = renderHook(() => useOrganization(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.currentRole).toBe('admin');
        });

        // admin has admin role
        expect(result.current.hasRole('admin')).toBe(true);
        // admin has manager role (lower)
        expect(result.current.hasRole('manager')).toBe(true);
        // admin has member role (lower)
        expect(result.current.hasRole('member')).toBe(true);
    });

    it('hasRole returns false for higher role', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    id: 1,
                    console_user_id: 100,
                    email: 'test@example.com',
                    name: 'Test',
                },
                organizations: [
                    {
                        organization_id: 1,
                        organization_slug: 'org-a',
                        organization_name: 'Org A',
                        org_role: 'member',
                        service_role: 'member', // level 10
                    },
                ],
            }),
        });

        const { result } = renderHook(() => useOrganization(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.currentRole).toBe('member');
        });

        // member does NOT have admin role
        expect(result.current.hasRole('admin')).toBe(false);
        // member does NOT have manager role
        expect(result.current.hasRole('manager')).toBe(false);
        // member has member role
        expect(result.current.hasRole('member')).toBe(true);
    });

    it('switchOrg changes current organization', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    id: 1,
                    console_user_id: 100,
                    email: 'test@example.com',
                    name: 'Test',
                },
                organizations: [
                    {
                        organization_id: 1,
                        organization_slug: 'org-a',
                        organization_name: 'Org A',
                        org_role: 'admin',
                        service_role: 'admin',
                    },
                    {
                        organization_id: 2,
                        organization_slug: 'org-b',
                        organization_name: 'Org B',
                        org_role: 'member',
                        service_role: 'member',
                    },
                ],
            }),
        });

        const { result } = renderHook(() => useOrganization(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.currentOrg?.slug).toBe('org-a');
        });

        act(() => {
            result.current.switchOrg('org-b');
        });

        expect(result.current.currentOrg?.slug).toBe('org-b');
        expect(result.current.currentRole).toBe('member');
    });

    it('returns null currentRole when no organizations', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: 401,
        });

        const { result } = renderHook(() => useOrganization(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.organizations).toHaveLength(0);
        });

        expect(result.current.currentOrg).toBeNull();
        expect(result.current.currentRole).toBeNull();
        expect(result.current.hasRole('admin')).toBe(false);
    });
});
