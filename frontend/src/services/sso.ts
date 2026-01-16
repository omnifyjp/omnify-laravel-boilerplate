/**
 * SSO Service - Auth, Tokens, Roles, Permissions, Teams
 *
 * API endpoints for SSO authentication and admin data
 */

import api, { csrf } from "@/lib/api";

// =============================================================================
// Types
// =============================================================================

export interface SsoUser {
  id: number;
  console_user_id: number;
  email: string;
  name: string;
}

export interface Organization {
  id: number;
  slug: string;
  name: string;
  role: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  level: number;
  permissions_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  group: string | null;
  description?: string | null;
  roles_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface PermissionMatrix {
  roles: Pick<Role, "id" | "slug" | "name">[];
  permissions: Record<string, Pick<Permission, "id" | "slug" | "name">[]>;
  matrix: Record<string, string[]>; // role_slug: permission_slugs[]
}

export interface ApiToken {
  id: number;
  name: string;
  last_used_at: string | null;
  created_at: string;
  is_current: boolean;
}

export interface TeamWithPermissions {
  console_team_id: number;
  name: string;
  path: string | null;
  permissions: Pick<Permission, "id" | "slug">[];
}

export interface TeamPermissionDetail {
  console_team_id: number;
  permissions: Pick<Permission, "id" | "slug" | "name">[];
}

export interface OrphanedTeam {
  console_team_id: number;
  permissions_count: number;
  permissions: string[];
  deleted_at: string | null;
}

// Input types
export interface SsoCallbackInput {
  code: string;
  device_name?: string;
}

export interface CreateRoleInput {
  slug: string;
  name: string;
  level: number;
  description?: string;
}

export interface UpdateRoleInput {
  name?: string;
  level?: number;
  description?: string | null;
}

export interface CreatePermissionInput {
  slug: string;
  name: string;
  group?: string;
  description?: string;
}

export interface UpdatePermissionInput {
  name?: string;
  group?: string | null;
  description?: string | null;
}

export interface SyncPermissionsInput {
  permissions: (number | string)[];
}

export interface CleanupOrphanedInput {
  console_team_id?: number;
  older_than_days?: number;
}

// =============================================================================
// Service
// =============================================================================

export const ssoService = {
  // =========================================================================
  // SSO Auth
  // =========================================================================

  /**
   * Exchange SSO authorization code for tokens
   * POST /api/sso/callback
   */
  callback: async (
    input: SsoCallbackInput
  ): Promise<{
    user: SsoUser;
    organizations: Organization[];
    token?: string;
  }> => {
    await csrf();
    const { data } = await api.post("/api/sso/callback", input);
    return data;
  },

  /**
   * Logout current user and revoke tokens
   * POST /api/sso/logout
   */
  logout: async (): Promise<{ message: string }> => {
    const { data } = await api.post("/api/sso/logout");
    return data;
  },

  /**
   * Get current authenticated user with organizations
   * GET /api/sso/user
   */
  getUser: async (): Promise<{
    user: SsoUser;
    organizations: Organization[];
  }> => {
    const { data } = await api.get("/api/sso/user");
    return data;
  },

  /**
   * Get Console SSO global logout URL
   * GET /api/sso/global-logout-url
   */
  getGlobalLogoutUrl: async (
    redirectUri?: string
  ): Promise<{ logout_url: string }> => {
    const params = redirectUri ? { redirect_uri: redirectUri } : {};
    const { data } = await api.get("/api/sso/global-logout-url", { params });
    return data;
  },

  // =========================================================================
  // SSO Tokens (for mobile apps)
  // =========================================================================

  /**
   * List all API tokens for current user
   * GET /api/sso/tokens
   */
  getTokens: async (): Promise<{ tokens: ApiToken[] }> => {
    const { data } = await api.get("/api/sso/tokens");
    return data;
  },

  /**
   * Revoke a specific token
   * DELETE /api/sso/tokens/{tokenId}
   */
  revokeToken: async (tokenId: number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/api/sso/tokens/${tokenId}`);
    return data;
  },

  /**
   * Revoke all tokens except current
   * POST /api/sso/tokens/revoke-others
   */
  revokeOtherTokens: async (): Promise<{
    message: string;
    revoked_count: number;
  }> => {
    const { data } = await api.post("/api/sso/tokens/revoke-others");
    return data;
  },

  // =========================================================================
  // Roles (Read-only for authenticated users)
  // =========================================================================

  /**
   * Get all roles
   * GET /api/sso/roles
   */
  getRoles: async (): Promise<{ data: Role[] }> => {
    const { data } = await api.get<{ data: Role[] }>("/api/sso/roles");
    return data;
  },

  /**
   * Get single role with permissions
   * GET /api/sso/roles/{id}
   */
  getRole: async (id: number): Promise<{ data: RoleWithPermissions }> => {
    const { data } = await api.get<{ data: RoleWithPermissions }>(
      `/api/sso/roles/${id}`
    );
    return data;
  },

  // =========================================================================
  // Permissions (Read-only for authenticated users)
  // =========================================================================

  /**
   * Get all permissions
   * GET /api/sso/permissions
   */
  getPermissions: async (params?: {
    group?: string;
    search?: string;
    grouped?: boolean;
  }): Promise<{ data: Permission[]; groups: string[] }> => {
    const { data } = await api.get<{ data: Permission[]; groups: string[] }>(
      "/api/sso/permissions",
      { params }
    );
    return data;
  },

  /**
   * Get permission matrix (roles x permissions)
   * GET /api/sso/permission-matrix
   */
  getPermissionMatrix: async (): Promise<PermissionMatrix> => {
    const { data } = await api.get<PermissionMatrix>(
      "/api/sso/permission-matrix"
    );
    return data;
  },

  // =========================================================================
  // Admin - Roles (requires admin role + org context)
  // =========================================================================

  /**
   * List all roles (admin)
   * GET /api/admin/sso/roles
   */
  adminGetRoles: async (orgSlug: string): Promise<{ data: Role[] }> => {
    const { data } = await api.get<{ data: Role[] }>("/api/admin/sso/roles", {
      headers: { "X-Org-Slug": orgSlug },
    });
    return data;
  },

  /**
   * Get single role (admin)
   * GET /api/admin/sso/roles/{id}
   */
  adminGetRole: async (
    id: number,
    orgSlug: string
  ): Promise<{ data: RoleWithPermissions }> => {
    const { data } = await api.get<{ data: RoleWithPermissions }>(
      `/api/admin/sso/roles/${id}`,
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  /**
   * Create role (admin only)
   * POST /api/admin/sso/roles
   */
  createRole: async (
    input: CreateRoleInput,
    orgSlug: string
  ): Promise<{ data: Role; message: string }> => {
    const { data } = await api.post("/api/admin/sso/roles", input, {
      headers: { "X-Org-Slug": orgSlug },
    });
    return data;
  },

  /**
   * Update role (admin only)
   * PUT /api/admin/sso/roles/{id}
   */
  updateRole: async (
    id: number,
    input: UpdateRoleInput,
    orgSlug: string
  ): Promise<{ data: Role; message: string }> => {
    const { data } = await api.put(`/api/admin/sso/roles/${id}`, input, {
      headers: { "X-Org-Slug": orgSlug },
    });
    return data;
  },

  /**
   * Delete role (admin only)
   * DELETE /api/admin/sso/roles/{id}
   */
  deleteRole: async (id: number, orgSlug: string): Promise<void> => {
    await api.delete(`/api/admin/sso/roles/${id}`, {
      headers: { "X-Org-Slug": orgSlug },
    });
  },

  /**
   * Get role's permissions (admin)
   * GET /api/admin/sso/roles/{id}/permissions
   */
  getRolePermissions: async (
    id: number,
    orgSlug: string
  ): Promise<{
    role: Pick<Role, "id" | "slug" | "name">;
    permissions: Permission[];
  }> => {
    const { data } = await api.get(`/api/admin/sso/roles/${id}/permissions`, {
      headers: { "X-Org-Slug": orgSlug },
    });
    return data;
  },

  /**
   * Sync role's permissions (admin)
   * PUT /api/admin/sso/roles/{id}/permissions
   */
  syncRolePermissions: async (
    id: number,
    input: SyncPermissionsInput,
    orgSlug: string
  ): Promise<{ message: string; attached: number; detached: number }> => {
    const { data } = await api.put(
      `/api/admin/sso/roles/${id}/permissions`,
      input,
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  // =========================================================================
  // Admin - Permissions (requires admin role + org context)
  // =========================================================================

  /**
   * List all permissions (admin)
   * GET /api/admin/sso/permissions
   */
  adminGetPermissions: async (
    orgSlug: string,
    params?: { group?: string; search?: string; grouped?: boolean }
  ): Promise<{ data: Permission[]; groups: string[] }> => {
    const { data } = await api.get<{ data: Permission[]; groups: string[] }>(
      "/api/admin/sso/permissions",
      { headers: { "X-Org-Slug": orgSlug }, params }
    );
    return data;
  },

  /**
   * Get single permission (admin)
   * GET /api/admin/sso/permissions/{id}
   */
  adminGetPermission: async (
    id: number,
    orgSlug: string
  ): Promise<{ data: Permission }> => {
    const { data } = await api.get<{ data: Permission }>(
      `/api/admin/sso/permissions/${id}`,
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  /**
   * Create permission (admin only)
   * POST /api/admin/sso/permissions
   */
  createPermission: async (
    input: CreatePermissionInput,
    orgSlug: string
  ): Promise<{ data: Permission; message: string }> => {
    const { data } = await api.post("/api/admin/sso/permissions", input, {
      headers: { "X-Org-Slug": orgSlug },
    });
    return data;
  },

  /**
   * Update permission (admin only)
   * PUT /api/admin/sso/permissions/{id}
   */
  updatePermission: async (
    id: number,
    input: UpdatePermissionInput,
    orgSlug: string
  ): Promise<{ data: Permission; message: string }> => {
    const { data } = await api.put(`/api/admin/sso/permissions/${id}`, input, {
      headers: { "X-Org-Slug": orgSlug },
    });
    return data;
  },

  /**
   * Delete permission (admin only)
   * DELETE /api/admin/sso/permissions/{id}
   */
  deletePermission: async (id: number, orgSlug: string): Promise<void> => {
    await api.delete(`/api/admin/sso/permissions/${id}`, {
      headers: { "X-Org-Slug": orgSlug },
    });
  },

  /**
   * Get permission matrix (admin)
   * GET /api/admin/sso/permission-matrix
   */
  adminGetPermissionMatrix: async (
    orgSlug: string
  ): Promise<PermissionMatrix> => {
    const { data } = await api.get<PermissionMatrix>(
      "/api/admin/sso/permission-matrix",
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  // =========================================================================
  // Admin - Team Permissions (requires admin role + org context)
  // =========================================================================

  /**
   * Get all teams with their permissions (admin only)
   * GET /api/admin/sso/teams/permissions
   */
  getTeamPermissions: async (
    orgSlug: string
  ): Promise<{ teams: TeamWithPermissions[] }> => {
    const { data } = await api.get<{ teams: TeamWithPermissions[] }>(
      "/api/admin/sso/teams/permissions",
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  /**
   * Get specific team permissions (admin only)
   * GET /api/admin/sso/teams/{teamId}/permissions
   */
  getTeamPermission: async (
    teamId: number,
    orgSlug: string
  ): Promise<TeamPermissionDetail> => {
    const { data } = await api.get<TeamPermissionDetail>(
      `/api/admin/sso/teams/${teamId}/permissions`,
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  /**
   * Sync team permissions (admin only)
   * PUT /api/admin/sso/teams/{teamId}/permissions
   */
  syncTeamPermissions: async (
    teamId: number,
    input: SyncPermissionsInput,
    orgSlug: string
  ): Promise<{
    message: string;
    console_team_id: number;
    attached: number;
    detached: number;
  }> => {
    const { data } = await api.put(
      `/api/admin/sso/teams/${teamId}/permissions`,
      input,
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  /**
   * Remove all permissions for a team (admin only)
   * DELETE /api/admin/sso/teams/{teamId}/permissions
   */
  removeTeamPermissions: async (
    teamId: number,
    orgSlug: string
  ): Promise<void> => {
    await api.delete(`/api/admin/sso/teams/${teamId}/permissions`, {
      headers: { "X-Org-Slug": orgSlug },
    });
  },

  // =========================================================================
  // Admin - Orphaned Team Permissions (requires admin role + org context)
  // =========================================================================

  /**
   * List orphaned team permissions (admin only)
   * GET /api/admin/sso/teams/orphaned
   */
  getOrphanedTeamPermissions: async (
    orgSlug: string
  ): Promise<{
    orphaned_teams: OrphanedTeam[];
    total_orphaned_permissions: number;
  }> => {
    const { data } = await api.get("/api/admin/sso/teams/orphaned", {
      headers: { "X-Org-Slug": orgSlug },
    });
    return data;
  },

  /**
   * Restore orphaned team permissions (admin only)
   * POST /api/admin/sso/teams/orphaned/{teamId}/restore
   */
  restoreOrphanedTeamPermissions: async (
    teamId: number,
    orgSlug: string
  ): Promise<{
    message: string;
    console_team_id: number;
    restored_count: number;
  }> => {
    const { data } = await api.post(
      `/api/admin/sso/teams/orphaned/${teamId}/restore`,
      {},
      { headers: { "X-Org-Slug": orgSlug } }
    );
    return data;
  },

  /**
   * Cleanup orphaned team permissions (admin only)
   * DELETE /api/admin/sso/teams/orphaned
   */
  cleanupOrphanedTeamPermissions: async (
    orgSlug: string,
    input?: CleanupOrphanedInput
  ): Promise<{ message: string; deleted_count: number }> => {
    const { data } = await api.delete("/api/admin/sso/teams/orphaned", {
      headers: { "X-Org-Slug": orgSlug },
      data: input,
    });
    return data;
  },
};
