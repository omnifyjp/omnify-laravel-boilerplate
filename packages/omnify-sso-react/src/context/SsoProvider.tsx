'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SsoContext } from './SsoContext';
import type {
    SsoCallbackResponse,
    SsoConfig,
    SsoOrganization,
    SsoProviderProps,
    SsoUser,
} from '../types';

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
 * Get storage instance based on type
 */
function getStorage(type: 'localStorage' | 'sessionStorage'): Storage | null {
    if (typeof window === 'undefined') return null;
    return type === 'localStorage' ? window.localStorage : window.sessionStorage;
}

/**
 * Get XSRF token from cookie (for Sanctum CSRF protection)
 */
function getXsrfToken(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
}

/**
 * SSO Provider component
 */
export function SsoProvider({ children, config, onAuthChange }: SsoProviderProps) {
    const [user, setUser] = useState<SsoUser | null>(null);
    const [organizations, setOrganizations] = useState<SsoOrganization[]>([]);
    const [currentOrg, setCurrentOrg] = useState<SsoOrganization | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const storageKey = config.storageKey ?? 'sso_selected_org';
    const storage = getStorage(config.storage ?? 'localStorage');

    /**
     * Load selected org from storage
     */
    const loadSelectedOrg = useCallback(
        (orgs: SsoOrganization[]) => {
            if (!storage || orgs.length === 0) return null;

            const savedSlug = storage.getItem(storageKey);
            if (savedSlug) {
                const found = orgs.find((o) => o.slug === savedSlug);
                if (found) return found;
            }

            // Default to first org
            return orgs[0];
        },
        [storage, storageKey]
    );

    /**
     * Save selected org to storage
     */
    const saveSelectedOrg = useCallback(
        (org: SsoOrganization | null) => {
            if (!storage) return;

            if (org) {
                storage.setItem(storageKey, org.slug);
            } else {
                storage.removeItem(storageKey);
            }
        },
        [storage, storageKey]
    );

    /**
     * Fetch current user from backend (Sanctum cookie-based auth)
     */
    const fetchUser = useCallback(async () => {
        try {
            const xsrfToken = getXsrfToken();
            const headers: Record<string, string> = {
                'Accept': 'application/json',
            };
            if (xsrfToken) {
                headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
            }

            const response = await fetch(`${config.apiUrl}/api/sso/user`, {
                headers,
                credentials: 'include',
            });

            if (!response.ok) {
                return null;
            }

            const data: { user: SsoCallbackResponse['user']; organizations: SsoCallbackResponse['organizations'] } =
                await response.json();

            const transformedUser = transformUser(data.user);
            const transformedOrgs = transformOrganizations(data.organizations);

            return { user: transformedUser, organizations: transformedOrgs };
        } catch {
            return null;
        }
    }, [config.apiUrl]);

    /**
     * Initialize auth state
     */
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            setIsLoading(true);

            const result = await fetchUser();

            if (!mounted) return;

            if (result) {
                setUser(result.user);
                setOrganizations(result.organizations);
                const selectedOrg = loadSelectedOrg(result.organizations);
                setCurrentOrg(selectedOrg);
                onAuthChange?.(true, result.user);
            } else {
                setUser(null);
                setOrganizations([]);
                setCurrentOrg(null);
                onAuthChange?.(false, null);
            }

            setIsLoading(false);
        };

        init();

        return () => {
            mounted = false;
        };
    }, [fetchUser, loadSelectedOrg, onAuthChange]);

    /**
     * Login - redirect to Console
     */
    const login = useCallback(
        (redirectTo?: string) => {
            const callbackUrl = new URL('/sso/callback', window.location.origin);
            if (redirectTo) {
                callbackUrl.searchParams.set('redirect', redirectTo);
            }

            const loginUrl = new URL('/sso/authorize', config.consoleUrl);
            loginUrl.searchParams.set('service', config.serviceSlug);
            loginUrl.searchParams.set('redirect_uri', callbackUrl.toString());

            window.location.href = loginUrl.toString();
        },
        [config.consoleUrl, config.serviceSlug]
    );

    /**
     * Logout from service (Sanctum cookie-based)
     */
    const logout = useCallback(async () => {
        try {
            const xsrfToken = getXsrfToken();
            const headers: Record<string, string> = {};
            if (xsrfToken) {
                headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
            }

            await fetch(`${config.apiUrl}/api/sso/logout`, {
                method: 'POST',
                headers,
                credentials: 'include',
            });
        } catch {
            // Ignore errors
        }

        setUser(null);
        setOrganizations([]);
        setCurrentOrg(null);
        saveSelectedOrg(null);
        onAuthChange?.(false, null);
    }, [config.apiUrl, saveSelectedOrg, onAuthChange]);

    /**
     * Global logout - logout from Console too
     */
    const globalLogout = useCallback(
        async (redirectTo?: string) => {
            // First logout from service
            await logout();

            // Then redirect to Console logout
            const redirectUri = redirectTo ?? window.location.origin;
            const logoutUrl = new URL('/sso/logout', config.consoleUrl);
            logoutUrl.searchParams.set('redirect_uri', redirectUri);

            window.location.href = logoutUrl.toString();
        },
        [logout, config.consoleUrl]
    );

    /**
     * Switch organization
     */
    const switchOrg = useCallback(
        (orgSlug: string) => {
            const org = organizations.find((o) => o.slug === orgSlug);
            if (org) {
                setCurrentOrg(org);
                saveSelectedOrg(org);
            }
        },
        [organizations, saveSelectedOrg]
    );

    /**
     * Refresh user data
     */
    const refreshUser = useCallback(async () => {
        const result = await fetchUser();

        if (result) {
            setUser(result.user);
            setOrganizations(result.organizations);

            // Keep current org if still valid
            if (currentOrg) {
                const stillValid = result.organizations.find((o) => o.slug === currentOrg.slug);
                if (!stillValid) {
                    const newOrg = loadSelectedOrg(result.organizations);
                    setCurrentOrg(newOrg);
                }
            }
        }
    }, [fetchUser, currentOrg, loadSelectedOrg]);

    /**
     * Get headers for API requests
     */
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {};

        if (currentOrg) {
            headers['X-Org-Id'] = currentOrg.slug;
        }

        return headers;
    }, [currentOrg]);

    const value = useMemo(
        () => ({
            user,
            organizations,
            currentOrg,
            isLoading,
            isAuthenticated: !!user,
            config,
            login,
            logout,
            globalLogout,
            switchOrg,
            refreshUser,
            getHeaders,
        }),
        [
            user,
            organizations,
            currentOrg,
            isLoading,
            config,
            login,
            logout,
            globalLogout,
            switchOrg,
            refreshUser,
            getHeaders,
        ]
    );

    return <SsoContext.Provider value={value}>{children}</SsoContext.Provider>;
}
