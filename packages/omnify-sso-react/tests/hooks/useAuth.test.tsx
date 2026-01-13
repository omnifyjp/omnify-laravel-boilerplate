/**
 * useAuth Hook Tests
 *
 * useAuthフックのテスト
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../../src/hooks/useAuth';
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

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    });

    it('returns user when authenticated', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                user: {
                    id: 1,
                    console_user_id: 100,
                    email: 'auth@example.com',
                    name: 'Auth User',
                },
                organizations: [],
            }),
        });

        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.user).not.toBeNull();
        expect(result.current.user?.email).toBe('auth@example.com');
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('returns null user when not authenticated', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: 401,
        });

        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('provides login function that redirects to console', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: 401,
        });

        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        act(() => {
            result.current.login('/dashboard');
        });

        expect(window.location.href).toContain('https://console.example.com/sso/authorize');
        expect(window.location.href).toContain('redirect=%2Fdashboard');
    });

    it('provides logout function that clears state', async () => {
        (global.fetch as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    user: {
                        id: 1,
                        console_user_id: 100,
                        email: 'test@example.com',
                        name: 'Test',
                    },
                    organizations: [],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Logged out' }),
            });

        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
            await result.current.logout();
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('provides globalLogout that redirects to console', async () => {
        (global.fetch as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    user: {
                        id: 1,
                        console_user_id: 100,
                        email: 'test@example.com',
                        name: 'Test',
                    },
                    organizations: [],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Logged out' }),
            });

        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

        await waitFor(() => {
            expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
            await result.current.globalLogout('/goodbye');
        });

        expect(window.location.href).toContain('https://console.example.com/sso/logout');
    });
});
