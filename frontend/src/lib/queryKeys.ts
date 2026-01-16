/**
 * Query Keys - Centralized key management for TanStack Query
 *
 * @see .claude/frontend/tanstack-query.md for usage patterns
 */

import type { UserListParams } from "@/services/users";

export const queryKeys = {
  // Auth - current user
  user: ["user"] as const,

  // Users CRUD
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (params?: UserListParams) => [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
  },

  // SSO - Auth, Tokens, Roles, Permissions, Teams
  sso: {
    all: ["sso"] as const,

    // SSO Auth
    auth: {
      all: () => [...queryKeys.sso.all, "auth"] as const,
      user: () => [...queryKeys.sso.auth.all(), "user"] as const,
      globalLogoutUrl: (redirectUri?: string) =>
        [...queryKeys.sso.auth.all(), "global-logout-url", redirectUri] as const,
    },

    // SSO Tokens
    tokens: {
      all: () => [...queryKeys.sso.all, "tokens"] as const,
      list: () => [...queryKeys.sso.tokens.all(), "list"] as const,
    },

    // Roles (read-only)
    roles: {
      all: () => [...queryKeys.sso.all, "roles"] as const,
      list: () => [...queryKeys.sso.roles.all(), "list"] as const,
      detail: (id: number) => [...queryKeys.sso.roles.all(), "detail", id] as const,
    },

    // Permissions (read-only)
    permissions: {
      all: () => [...queryKeys.sso.all, "permissions"] as const,
      list: (params?: { group?: string; search?: string; grouped?: boolean }) =>
        [...queryKeys.sso.permissions.all(), "list", params] as const,
      matrix: () => [...queryKeys.sso.permissions.all(), "matrix"] as const,
    },

    // Admin - Roles
    adminRoles: {
      all: (orgSlug: string) => [...queryKeys.sso.all, "admin", orgSlug, "roles"] as const,
      list: (orgSlug: string) => [...queryKeys.sso.adminRoles.all(orgSlug), "list"] as const,
      detail: (orgSlug: string, id: number) =>
        [...queryKeys.sso.adminRoles.all(orgSlug), "detail", id] as const,
      permissions: (orgSlug: string, id: number) =>
        [...queryKeys.sso.adminRoles.all(orgSlug), id, "permissions"] as const,
    },

    // Admin - Permissions
    adminPermissions: {
      all: (orgSlug: string) => [...queryKeys.sso.all, "admin", orgSlug, "permissions"] as const,
      list: (orgSlug: string, params?: { group?: string; search?: string; grouped?: boolean }) =>
        [...queryKeys.sso.adminPermissions.all(orgSlug), "list", params] as const,
      detail: (orgSlug: string, id: number) =>
        [...queryKeys.sso.adminPermissions.all(orgSlug), "detail", id] as const,
      matrix: (orgSlug: string) =>
        [...queryKeys.sso.adminPermissions.all(orgSlug), "matrix"] as const,
    },

    // Admin - Teams
    adminTeams: {
      all: (orgSlug: string) => [...queryKeys.sso.all, "admin", orgSlug, "teams"] as const,
      permissions: (orgSlug: string) =>
        [...queryKeys.sso.adminTeams.all(orgSlug), "permissions"] as const,
      teamPermissions: (orgSlug: string, teamId: number) =>
        [...queryKeys.sso.adminTeams.all(orgSlug), teamId, "permissions"] as const,
      orphaned: (orgSlug: string) =>
        [...queryKeys.sso.adminTeams.all(orgSlug), "orphaned"] as const,
    },
  },
} as const;
