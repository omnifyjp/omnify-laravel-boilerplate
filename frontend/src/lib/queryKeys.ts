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
} as const;
