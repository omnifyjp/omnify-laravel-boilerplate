'use client';

import { useCallback, useMemo } from 'react';
import { useSsoContext } from '../context/SsoContext';
import type { SsoOrganization } from '../types';

/**
 * Hook return type for organization management
 */
export interface UseOrganizationReturn {
    /** List of organizations user has access to */
    organizations: SsoOrganization[];
    /** Currently selected organization */
    currentOrg: SsoOrganization | null;
    /** Whether user has multiple organizations */
    hasMultipleOrgs: boolean;
    /** Switch to a different organization */
    switchOrg: (orgSlug: string) => void;
    /** Get current org's role */
    currentRole: string | null;
    /** Check if user has at least the given role in current org */
    hasRole: (role: string) => boolean;
}

/**
 * Role levels for comparison
 */
const ROLE_LEVELS: Record<string, number> = {
    admin: 100,
    manager: 50,
    member: 10,
};

/**
 * Hook for organization management
 *
 * @example
 * ```tsx
 * function OrgInfo() {
 *   const { currentOrg, organizations, switchOrg, hasRole } = useOrganization();
 *
 *   return (
 *     <div>
 *       <p>Current: {currentOrg?.name}</p>
 *       {hasRole('admin') && <AdminPanel />}
 *       <select onChange={(e) => switchOrg(e.target.value)}>
 *         {organizations.map((org) => (
 *           <option key={org.slug} value={org.slug}>{org.name}</option>
 *         ))}
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrganization(): UseOrganizationReturn {
    const { organizations, currentOrg, switchOrg } = useSsoContext();

    const hasMultipleOrgs = organizations.length > 1;

    const currentRole = currentOrg?.serviceRole ?? null;

    const hasRole = useCallback(
        (role: string): boolean => {
            if (!currentRole) return false;

            const requiredLevel = ROLE_LEVELS[role] ?? 0;
            const userLevel = ROLE_LEVELS[currentRole] ?? 0;

            return userLevel >= requiredLevel;
        },
        [currentRole]
    );

    const handleSwitchOrg = useCallback(
        (orgSlug: string) => {
            switchOrg(orgSlug);
        },
        [switchOrg]
    );

    return useMemo(
        () => ({
            organizations,
            currentOrg,
            hasMultipleOrgs,
            switchOrg: handleSwitchOrg,
            currentRole,
            hasRole,
        }),
        [organizations, currentOrg, hasMultipleOrgs, handleSwitchOrg, currentRole, hasRole]
    );
}
