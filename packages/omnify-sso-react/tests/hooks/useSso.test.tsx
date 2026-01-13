/**
 * useSso Hook Tests
 *
 * useSsoフックのテスト
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSso } from '../../src/hooks/useSso';
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
function createWrapper(config: SsoConfig = defaultConfig) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <SsoProvider config={config}>{children}</SsoProvider>;
    };
}

describe('useSso', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    });

    it('returns all SSO context values', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    id: 1,
                    console_user_id: 100,
                    email: 'test@example.com',
                    name: 'Test User',
                },
                organizations: [
                    {
                        organization_id: 1,
                        organization_slug: 'my-org',
                        organization_name: 'My Org',
                        org_role: 'admin',
                        service_role: 'admin',
                    },
                    {
                        organization_id: 2,
                        organization_slug: 'other-org',
                        organization_name: 'Other Org',
                        org_role: 'member',
                        service_role: 'member',
                    },
                ],
            }),
        });

        const { result } = renderHook(() => useSso(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Auth values
        expect(result.current.user?.email).toBe('test@example.com');
        expect(result.current.isAuthenticated).toBe(true);
        expect(typeof result.current.login).toBe('function');
        expect(typeof result.current.logout).toBe('function');
        expect(typeof result.current.globalLogout).toBe('function');
        expect(typeof result.current.refreshUser).toBe('function');

        // Organization values
        expect(result.current.organizations).toHaveLength(2);
        expect(result.current.currentOrg?.slug).toBe('my-org');
        expect(result.current.hasMultipleOrgs).toBe(true);
        expect(typeof result.current.switchOrg).toBe('function');

        // Utilities
        expect(typeof result.current.getHeaders).toBe('function');
        expect(result.current.config).toBeDefined();
    });

    it('returns hasMultipleOrgs as false for single org', async () => {
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
                        organization_slug: 'only-org',
                        organization_name: 'Only Org',
                        org_role: 'admin',
                        service_role: 'admin',
                    },
                ],
            }),
        });

        const { result } = renderHook(() => useSso(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.hasMultipleOrgs).toBe(false);
    });

    it('returns config from provider', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: 401,
        });

        const customConfig: SsoConfig = {
            apiUrl: 'http://custom-api.example.com',
            consoleUrl: 'https://custom-console.example.com',
            serviceSlug: 'custom-service',
            baseUrl: 'http://custom.example.com',
        };

        const { result } = renderHook(() => useSso(), {
            wrapper: createWrapper(customConfig),
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.config.apiUrl).toBe('http://custom-api.example.com');
        expect(result.current.config.serviceSlug).toBe('custom-service');
    });
});
