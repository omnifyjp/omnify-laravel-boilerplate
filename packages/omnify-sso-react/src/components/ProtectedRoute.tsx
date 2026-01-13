'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import type { ProtectedRouteProps } from '../types';

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
            <div>Loading...</div>
        </div>
    );
}

/**
 * Default login fallback
 */
function DefaultLoginFallback({ login }: { login: () => void }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            gap: '1rem'
        }}>
            <div>Please log in to continue</div>
            <button
                onClick={login}
                style={{
                    padding: '0.5rem 1rem',
                    background: '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                }}
            >
                Log In
            </button>
        </div>
    );
}

/**
 * Default access denied component
 */
function DefaultAccessDenied({ reason }: { reason: string }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            color: '#dc2626'
        }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>Access Denied</div>
            <div style={{ marginTop: '0.5rem' }}>{reason}</div>
        </div>
    );
}

/**
 * Protected Route component
 *
 * Wraps content that requires authentication and optionally specific roles/permissions.
 *
 * @example
 * ```tsx
 * // Basic protection
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // With role requirement
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // With custom fallbacks
 * <ProtectedRoute
 *   fallback={<Spinner />}
 *   loginFallback={<CustomLoginPage />}
 *   onAccessDenied={(reason) => console.log(reason)}
 * >
 *   <ProtectedContent />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
    children,
    fallback,
    loginFallback,
    requiredRole,
    requiredPermission,
    onAccessDenied,
}: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated, login } = useAuth();
    const { hasRole, currentOrg } = useOrganization();

    // Handle access denied callback
    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            onAccessDenied?.('unauthenticated');
        } else if (requiredRole && !hasRole(requiredRole)) {
            onAccessDenied?.('insufficient_role');
        }
        // Note: Permission checking would need to be implemented with a permissions hook
    }, [isLoading, isAuthenticated, requiredRole, hasRole, onAccessDenied]);

    // Loading state
    if (isLoading) {
        return <>{fallback ?? <DefaultLoading />}</>;
    }

    // Not authenticated
    if (!isAuthenticated) {
        if (loginFallback) {
            return <>{loginFallback}</>;
        }
        return <DefaultLoginFallback login={() => login()} />;
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
        return (
            <DefaultAccessDenied
                reason={`This page requires ${requiredRole} role. Your role: ${currentOrg?.serviceRole ?? 'none'}`}
            />
        );
    }

    // Note: Permission checking would need a separate implementation
    // with a hook that checks permissions via the backend

    // All checks passed
    return <>{children}</>;
}
