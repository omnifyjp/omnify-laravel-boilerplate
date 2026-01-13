/**
 * SsoProvider Tests
 *
 * SSO Provider コンポーネントのテスト
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SsoProvider } from '../../src/context/SsoProvider';
import { useSsoContext } from '../../src/context/SsoContext';
import type { SsoConfig } from '../../src/types';

// テスト用のコンシューマーコンポーネント
function TestConsumer() {
    const { user, organizations, currentOrg, isLoading, isAuthenticated, login, logout } =
        useSsoContext();

    return (
        <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
            <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
            <div data-testid="user">{user?.email ?? 'none'}</div>
            <div data-testid="org-count">{organizations.length}</div>
            <div data-testid="current-org">{currentOrg?.slug ?? 'none'}</div>
            <button data-testid="login-btn" onClick={() => login('/dashboard')}>
                Login
            </button>
            <button data-testid="logout-btn" onClick={() => logout()}>
                Logout
            </button>
        </div>
    );
}

// デフォルトのテスト設定
const defaultConfig: SsoConfig = {
    apiUrl: 'http://localhost:8000',
    consoleUrl: 'https://console.example.com',
    serviceSlug: 'test-service',
    baseUrl: 'http://localhost:3000',
};

describe('SsoProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset fetch mock
        (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    });

    // ==========================================================================
    // Initialization Tests - 初期化のテスト
    // ==========================================================================

    describe('initialization', () => {
        it('shows loading state initially', () => {
            // 無限にペンディングするfetchをモック
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
                () => new Promise(() => { })
            );

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            expect(screen.getByTestId('loading')).toHaveTextContent('loading');
        });

        it('fetches user on mount', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    user: {
                        id: 1,
                        console_user_id: 100,
                        email: 'test@example.com',
                        name: 'Test User',
                    },
                    organizations: [],
                }),
            });

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('ready');
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/sso/user',
                expect.objectContaining({
                    credentials: 'include',
                })
            );
        });

        it('sets user state when authenticated', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    user: {
                        id: 1,
                        console_user_id: 100,
                        email: 'authenticated@example.com',
                        name: 'Auth User',
                    },
                    organizations: [
                        {
                            organization_id: 1,
                            organization_slug: 'my-org',
                            organization_name: 'My Organization',
                            org_role: 'admin',
                            service_role: 'admin',
                        },
                    ],
                }),
            });

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
            });

            expect(screen.getByTestId('user')).toHaveTextContent('authenticated@example.com');
            expect(screen.getByTestId('org-count')).toHaveTextContent('1');
            expect(screen.getByTestId('current-org')).toHaveTextContent('my-org');
        });

        it('sets unauthenticated state when fetch fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 401,
            });

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('ready');
            });

            expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
            expect(screen.getByTestId('user')).toHaveTextContent('none');
        });

        it('handles network errors gracefully', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error('Network error')
            );

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('ready');
            });

            expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
        });
    });

    // ==========================================================================
    // Auth Callback Tests - 認証コールバックのテスト
    // ==========================================================================

    describe('onAuthChange callback', () => {
        it('calls onAuthChange with true when authenticated', async () => {
            const onAuthChange = vi.fn();

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
            });

            render(
                <SsoProvider config={defaultConfig} onAuthChange={onAuthChange}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(onAuthChange).toHaveBeenCalledWith(
                    true,
                    expect.objectContaining({ email: 'test@example.com' })
                );
            });
        });

        it('calls onAuthChange with false when not authenticated', async () => {
            const onAuthChange = vi.fn();

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 401,
            });

            render(
                <SsoProvider config={defaultConfig} onAuthChange={onAuthChange}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(onAuthChange).toHaveBeenCalledWith(false, null);
            });
        });
    });

    // ==========================================================================
    // Login Tests - ログインのテスト
    // ==========================================================================

    describe('login', () => {
        it('redirects to Console login URL', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 401,
            });

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('ready');
            });

            act(() => {
                screen.getByTestId('login-btn').click();
            });

            expect(window.location.href).toContain('https://console.example.com/sso/authorize');
            expect(window.location.href).toContain('service=test-service');
            expect(window.location.href).toContain('redirect_uri=');
            expect(window.location.href).toContain('redirect=%2Fdashboard');
        });
    });

    // ==========================================================================
    // Logout Tests - ログアウトのテスト
    // ==========================================================================

    describe('logout', () => {
        it('calls logout API and clears state', async () => {
            // 初期状態: 認証済み
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
                // ログアウトAPI
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ message: 'Logged out' }),
                });

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
            });

            await act(async () => {
                screen.getByTestId('logout-btn').click();
            });

            // ログアウトAPIが呼ばれた
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/sso/logout',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                })
            );

            // 状態がクリアされた
            expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
            expect(screen.getByTestId('user')).toHaveTextContent('none');
        });
    });

    // ==========================================================================
    // Organization Tests - 組織のテスト
    // ==========================================================================

    describe('organizations', () => {
        it('loads organizations from API', async () => {
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
                            organization_slug: 'org-1',
                            organization_name: 'Org 1',
                            org_role: 'admin',
                            service_role: 'admin',
                        },
                        {
                            organization_id: 2,
                            organization_slug: 'org-2',
                            organization_name: 'Org 2',
                            org_role: 'member',
                            service_role: 'member',
                        },
                    ],
                }),
            });

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('org-count')).toHaveTextContent('2');
            });

            // 最初の組織が選択される
            expect(screen.getByTestId('current-org')).toHaveTextContent('org-1');
        });

        it('restores selected org from localStorage', async () => {
            // localStorageにorg-2が保存されている
            (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('org-2');

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
                            organization_slug: 'org-1',
                            organization_name: 'Org 1',
                            org_role: 'admin',
                            service_role: 'admin',
                        },
                        {
                            organization_id: 2,
                            organization_slug: 'org-2',
                            organization_name: 'Org 2',
                            org_role: 'member',
                            service_role: 'member',
                        },
                    ],
                }),
            });

            render(
                <SsoProvider config={defaultConfig}>
                    <TestConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('current-org')).toHaveTextContent('org-2');
            });
        });
    });

    // ==========================================================================
    // Headers Tests - ヘッダーのテスト
    // ==========================================================================

    describe('getHeaders', () => {
        it('includes X-Org-Id header when org is selected', async () => {
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
                            organization_slug: 'my-org',
                            organization_name: 'My Org',
                            org_role: 'admin',
                            service_role: 'admin',
                        },
                    ],
                }),
            });

            let headers: Record<string, string> = {};

            function HeaderConsumer() {
                const { getHeaders, isLoading } = useSsoContext();

                if (!isLoading) {
                    headers = getHeaders();
                }

                return <div data-testid="headers">{JSON.stringify(headers)}</div>;
            }

            render(
                <SsoProvider config={defaultConfig}>
                    <HeaderConsumer />
                </SsoProvider>
            );

            await waitFor(() => {
                expect(headers['X-Org-Id']).toBe('my-org');
            });
        });
    });
});
