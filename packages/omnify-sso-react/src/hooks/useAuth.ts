'use client';

import { useCallback } from 'react';
import { useSsoContext } from '../context/SsoContext';
import type { SsoUser } from '../types';

/**
 * Hook for authentication actions and state
 */
export interface UseAuthReturn {
    /** Current user or null */
    user: SsoUser | null;
    /** Whether auth is being loaded */
    isLoading: boolean;
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** Redirect to login */
    login: (redirectTo?: string) => void;
    /** Logout from service only */
    logout: () => Promise<void>;
    /** Logout from service and Console */
    globalLogout: (redirectTo?: string) => void;
    /** Refresh user data */
    refreshUser: () => Promise<void>;
}

/**
 * Hook for authentication
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { isAuthenticated, login, logout, user } = useAuth();
 *
 *   if (isAuthenticated) {
 *     return (
 *       <div>
 *         <span>Hello, {user?.name}</span>
 *         <button onClick={() => logout()}>Logout</button>
 *       </div>
 *     );
 *   }
 *
 *   return <button onClick={() => login()}>Login</button>;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
    const { user, isLoading, isAuthenticated, login, logout, globalLogout, refreshUser } =
        useSsoContext();

    const handleLogin = useCallback(
        (redirectTo?: string) => {
            login(redirectTo);
        },
        [login]
    );

    const handleLogout = useCallback(async () => {
        await logout();
    }, [logout]);

    const handleGlobalLogout = useCallback(
        (redirectTo?: string) => {
            globalLogout(redirectTo);
        },
        [globalLogout]
    );

    return {
        user,
        isLoading,
        isAuthenticated,
        login: handleLogin,
        logout: handleLogout,
        globalLogout: handleGlobalLogout,
        refreshUser,
    };
}
