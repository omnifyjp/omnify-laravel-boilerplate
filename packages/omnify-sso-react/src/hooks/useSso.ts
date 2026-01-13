'use client';

import { useMemo } from 'react';
import { useSsoContext } from '../context/SsoContext';
import type { SsoConfig, SsoOrganization, SsoUser } from '../types';

/**
 * Combined SSO hook return type
 */
export interface UseSsoReturn {
    // Auth
    user: SsoUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (redirectTo?: string) => void;
    logout: () => Promise<void>;
    globalLogout: (redirectTo?: string) => void;
    refreshUser: () => Promise<void>;

    // Organization
    organizations: SsoOrganization[];
    currentOrg: SsoOrganization | null;
    hasMultipleOrgs: boolean;
    switchOrg: (orgSlug: string) => void;

    // Utilities
    getHeaders: () => Record<string, string>;
    config: SsoConfig;
}

/**
 * Combined hook for all SSO functionality
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     user,
 *     isAuthenticated,
 *     currentOrg,
 *     getHeaders,
 *     login,
 *     logout,
 *   } = useSso();
 *
 *   const fetchData = async () => {
 *     const response = await fetch('/api/data', {
 *       headers: getHeaders(),
 *     });
 *     // ...
 *   };
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login()}>Login</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.name}</p>
 *       <p>Organization: {currentOrg?.name}</p>
 *       <button onClick={() => logout()}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSso(): UseSsoReturn {
    const context = useSsoContext();

    return useMemo(
        () => ({
            // Auth
            user: context.user,
            isLoading: context.isLoading,
            isAuthenticated: context.isAuthenticated,
            login: context.login,
            logout: context.logout,
            globalLogout: context.globalLogout,
            refreshUser: context.refreshUser,

            // Organization
            organizations: context.organizations,
            currentOrg: context.currentOrg,
            hasMultipleOrgs: context.organizations.length > 1,
            switchOrg: context.switchOrg,

            // Utilities
            getHeaders: context.getHeaders,
            config: context.config,
        }),
        [context]
    );
}
