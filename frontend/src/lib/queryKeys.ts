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

  // SSO - Roles, Permissions, Teams
  sso: {
    all: ["sso"] as const,
    roles: {
      all: () => [...queryKeys.sso.all, "roles"] as const,
      list: () => [...queryKeys.sso.roles.all(), "list"] as const,
      detail: (id: number) => [...queryKeys.sso.roles.all(), "detail", id] as const,
      permissions: (id: number) => [...queryKeys.sso.roles.all(), id, "permissions"] as const,
    },
    permissions: {
      all: () => [...queryKeys.sso.all, "permissions"] as const,
      list: (group?: string) => [...queryKeys.sso.permissions.all(), "list", group] as const,
      matrix: () => [...queryKeys.sso.permissions.all(), "matrix"] as const,
    },
    teams: {
      all: () => [...queryKeys.sso.all, "teams"] as const,
      permissions: () => [...queryKeys.sso.teams.all(), "permissions"] as const,
      teamPermissions: (teamId: number) => [...queryKeys.sso.teams.all(), teamId, "permissions"] as const,
    },
  },
} as const;
