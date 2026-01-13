/**
 * SsoCallback Tests
 *
 * SSOコールバックコンポーネントのテスト
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SsoCallback } from '../../src/components/SsoCallback';
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
function TestWrapper({
    children,
    config = defaultConfig,
}: {
    children: React.ReactNode;
    config?: SsoConfig;
}) {
    return <SsoProvider config={config}>{children}</SsoProvider>;
}

describe('SsoCallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockReset();

        // デフォルトでコードをURLに設定
        Object.defineProperty(window, 'location', {
            value: {
                href: 'http://localhost:3000/sso/callback?code=test-code',
                origin: 'http://localhost:3000',
                search: '?code=test-code',
                pathname: '/sso/callback',
            },
            writable: true,
        });

        // document.cookieをモック
        Object.defineProperty(document, 'cookie', {
            value: 'XSRF-TOKEN=test-xsrf-token',
            writable: true,
        });
    });

    // ==========================================================================
    // Loading State Tests - ローディング状態のテスト
    // ==========================================================================

    describe('loading state', () => {
        it('shows default loading component', async () => {
            // 無限にペンディングするfetchをモック
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
                () => new Promise(() => { })
            );

            render(
                <TestWrapper>
                    <SsoCallback />
                </TestWrapper>
            );

            expect(screen.getByText('Authenticating...')).toBeInTheDocument();
        });

        it('shows custom loading component', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
                () => new Promise(() => { })
            );

            render(
                <TestWrapper>
                    <SsoCallback
                        loadingComponent={<div>Custom Loading...</div>}
                    />
                </TestWrapper>
            );

            expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
        });
    });

    // ==========================================================================
    // Error State Tests - エラー状態のテスト
    // ==========================================================================

    describe('error state', () => {
        it('shows error when no code in URL', async () => {
            // コードなしのURL
            window.location.search = '';

            render(
                <TestWrapper>
                    <SsoCallback />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('No authorization code received')).toBeInTheDocument();
            });
        });

        it('shows error when callback API fails', async () => {
            // CSRF cookieは成功
            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({ ok: true }) // CSRF cookie
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({
                        error: 'INVALID_CODE',
                        message: 'The authorization code is invalid',
                    }),
                });

            render(
                <TestWrapper>
                    <SsoCallback />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(
                    screen.getByText('The authorization code is invalid')
                ).toBeInTheDocument();
            });
        });

        it('shows custom error component', async () => {
            window.location.search = '';

            render(
                <TestWrapper>
                    <SsoCallback
                        errorComponent={(error) => (
                            <div>Custom Error: {error.message}</div>
                        )}
                    />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Custom Error: No authorization code received')
                ).toBeInTheDocument();
            });
        });

        it('calls onError callback on failure', async () => {
            window.location.search = '';

            const onError = vi.fn();

            render(
                <TestWrapper>
                    <SsoCallback onError={onError} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(onError).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'No authorization code received',
                    })
                );
            });
        });
    });

    // ==========================================================================
    // Success Flow Tests - 成功フローのテスト
    // ==========================================================================

    describe('success flow', () => {
        it('fetches CSRF cookie before callback', async () => {
            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({ ok: true }) // CSRF cookie
                .mockResolvedValueOnce({
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
                })
                .mockResolvedValueOnce({ ok: false }); // refreshUser

            render(
                <TestWrapper>
                    <SsoCallback />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    'http://localhost:8000/sanctum/csrf-cookie',
                    expect.objectContaining({
                        credentials: 'include',
                    })
                );
            });
        });

        it('exchanges code for session with XSRF token', async () => {
            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({ ok: true }) // CSRF cookie
                .mockResolvedValueOnce({
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
                })
                .mockResolvedValueOnce({ ok: false }); // refreshUser

            render(
                <TestWrapper>
                    <SsoCallback />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    'http://localhost:8000/api/sso/callback',
                    expect.objectContaining({
                        method: 'POST',
                        credentials: 'include',
                        body: JSON.stringify({ code: 'test-code' }),
                    })
                );
            });
        });

        it('calls onSuccess callback with user and organizations', async () => {
            const onSuccess = vi.fn();

            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({ ok: true }) // CSRF cookie
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        user: {
                            id: 1,
                            console_user_id: 100,
                            email: 'success@example.com',
                            name: 'Success User',
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
                })
                .mockResolvedValueOnce({ ok: false }); // refreshUser

            render(
                <TestWrapper>
                    <SsoCallback onSuccess={onSuccess} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(onSuccess).toHaveBeenCalledWith(
                    expect.objectContaining({
                        email: 'success@example.com',
                        name: 'Success User',
                    }),
                    expect.arrayContaining([
                        expect.objectContaining({
                            slug: 'my-org',
                            name: 'My Organization',
                        }),
                    ])
                );
            });
        });

        it('redirects to specified path after success', async () => {
            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({ ok: true }) // CSRF cookie
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
                .mockResolvedValueOnce({ ok: false }); // refreshUser

            render(
                <TestWrapper>
                    <SsoCallback redirectTo="/dashboard" />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(window.location.href).toBe('/dashboard');
            });
        });

        it('uses redirect param from URL if present', async () => {
            window.location.search = '?code=test-code&redirect=/custom-path';

            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({ ok: true }) // CSRF cookie
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
                .mockResolvedValueOnce({ ok: false }); // refreshUser

            render(
                <TestWrapper>
                    <SsoCallback redirectTo="/dashboard" />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(window.location.href).toBe('/custom-path');
            });
        });
    });

    // ==========================================================================
    // React Strict Mode Tests - React Strict Modeのテスト
    // ==========================================================================

    describe('React Strict Mode handling', () => {
        it('prevents double execution of callback', async () => {
            let callCount = 0;

            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url) => {
                if (url.includes('csrf-cookie')) {
                    return { ok: true };
                }
                if (url.includes('callback')) {
                    callCount++;
                    return {
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
                    };
                }
                return { ok: false };
            });

            // React Strict Modeのような動作をシミュレート
            const { rerender } = render(
                <TestWrapper>
                    <SsoCallback />
                </TestWrapper>
            );

            // 再レンダリング
            rerender(
                <TestWrapper>
                    <SsoCallback />
                </TestWrapper>
            );

            await waitFor(() => {
                // コールバックAPIは1回だけ呼ばれる
                expect(callCount).toBe(1);
            });
        });
    });
});
