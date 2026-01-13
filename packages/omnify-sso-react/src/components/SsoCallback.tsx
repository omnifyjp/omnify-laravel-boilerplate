'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSsoContext } from '../context/SsoContext';
import type { SsoCallbackProps, SsoCallbackResponse, SsoOrganization, SsoUser } from '../types';

/**
 * Transform backend response to frontend format
 */
function transformUser(data: SsoCallbackResponse['user']): SsoUser {
    return {
        id: data.id,
        consoleUserId: data.console_user_id,
        email: data.email,
        name: data.name,
    };
}

/**
 * Transform organizations from backend format
 */
function transformOrganizations(
    data: SsoCallbackResponse['organizations']
): SsoOrganization[] {
    return data.map((org) => ({
        id: org.organization_id,
        slug: org.organization_slug,
        name: org.organization_name,
        orgRole: org.org_role,
        serviceRole: org.service_role,
    }));
}

/**
 * Default loading component
 */
function DefaultLoading() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px'
        }}>
            <div>Authenticating...</div>
        </div>
    );
}

/**
 * Default error component
 */
function DefaultError({ error }: { error: Error }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            color: 'red'
        }}>
            <div>Authentication Error</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{error.message}</div>
        </div>
    );
}

/**
 * SSO Callback component
 * 
 * Place this component at your callback route (e.g., /sso/callback)
 * It handles the SSO code exchange and redirects after successful login.
 *
 * @example
 * ```tsx
 * // pages/sso/callback.tsx or app/sso/callback/page.tsx
 * export default function CallbackPage() {
 *   return (
 *     <SsoCallback
 *       redirectTo="/dashboard"
 *       onSuccess={(user, orgs) => console.log('Logged in:', user)}
 *       onError={(error) => console.error('Login failed:', error)}
 *     />
 *   );
 * }
 * ```
 */
export function SsoCallback({
    onSuccess,
    onError,
    redirectTo = '/',
    loadingComponent,
    errorComponent,
}: SsoCallbackProps) {
    const { config, refreshUser } = useSsoContext();
    const [error, setError] = useState<Error | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);
    // 二重呼び出し防止フラグ（React Strict Mode対応）
    const isProcessingRef = useRef(false);

    useEffect(() => {
        // 既に処理中の場合はスキップ
        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;

        const processCallback = async () => {
            try {
                // Get code from URL
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const redirectParam = urlParams.get('redirect');

                if (!code) {
                    throw new Error('No authorization code received');
                }

                // Get CSRF cookie first (required for Sanctum SPA auth)
                await fetch(`${config.apiUrl}/sanctum/csrf-cookie`, {
                    credentials: 'include',
                });

                // Get XSRF token from cookie
                const xsrfToken = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1];

                // Exchange code for session
                const response = await fetch(`${config.apiUrl}/api/sso/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...(xsrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfToken) } : {}),
                    },
                    credentials: 'include',
                    body: JSON.stringify({ code }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to authenticate');
                }

                const data: SsoCallbackResponse = await response.json();

                // Transform data
                const user = transformUser(data.user);
                const organizations = transformOrganizations(data.organizations);

                // Refresh context
                await refreshUser();

                // Call success callback
                onSuccess?.(user, organizations);

                // Redirect
                const finalRedirect = redirectParam || redirectTo;
                window.location.href = finalRedirect;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Authentication failed');
                setError(error);
                onError?.(error);
                // エラー時はフラグをリセットして再試行可能に
                isProcessingRef.current = false;
            } finally {
                setIsProcessing(false);
            }
        };

        processCallback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (error) {
        if (errorComponent) {
            return <>{errorComponent(error)}</>;
        }
        return <DefaultError error={error} />;
    }

    if (isProcessing) {
        if (loadingComponent) {
            return <>{loadingComponent}</>;
        }
        return <DefaultLoading />;
    }

    return null;
}
