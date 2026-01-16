/**
 * Query Keys - Centralized key management for TanStack Query
 *
 * SSO keys imported from @famgia/omnify-client-sso-react
 * App-specific keys defined here
 */

import { ssoQueryKeys } from "@famgia/omnify-client-sso-react";
import type { UserListParams } from "@/services/users";

export const queryKeys = {
  // Auth - current user
  user: ["user"] as const,

  // Users CRUD (app-specific)
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (params?: UserListParams) => [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
  },

  // SSO - from package
  sso: ssoQueryKeys,
} as const;
