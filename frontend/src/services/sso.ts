/**
 * SSO Service - Roles, Permissions, Teams
 *
 * API endpoints for SSO admin data
 */

import api from "@/lib/api";

// =============================================================================
// Types
// =============================================================================

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  group: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface PermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<number, number[]>; // role_id: permission_ids[]
}

export interface TeamPermission {
  console_team_id: number;
  console_org_id: number;
  team_name?: string;
  permissions: Permission[];
}

// =============================================================================
// Service
// =============================================================================

export const ssoService = {
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
  getPermissions: async (group?: string): Promise<{ data: Permission[] }> => {
    const params = group ? { group } : {};
    const { data } = await api.get<{ data: Permission[] }>(
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
   * Create role (admin only)
   * POST /api/admin/sso/roles
   */
  createRole: async (
    role: Partial<Role>,
    orgSlug: string
  ): Promise<{ data: Role }> => {
    const { data } = await api.post<{ data: Role }>("/api/admin/sso/roles", role, {
      headers: { "X-Org-Id": orgSlug },
    });
    return data;
  },

  /**
   * Update role (admin only)
   * PUT /api/admin/sso/roles/{id}
   */
  updateRole: async (
    id: number,
    role: Partial<Role>,
    orgSlug: string
  ): Promise<{ data: Role }> => {
    const { data } = await api.put<{ data: Role }>(
      `/api/admin/sso/roles/${id}`,
      role,
      { headers: { "X-Org-Id": orgSlug } }
    );
    return data;
  },

  /**
   * Delete role (admin only)
   * DELETE /api/admin/sso/roles/{id}
   */
  deleteRole: async (id: number, orgSlug: string): Promise<void> => {
    await api.delete(`/api/admin/sso/roles/${id}`, {
      headers: { "X-Org-Id": orgSlug },
    });
  },

  // =========================================================================
  // Admin - Teams (requires admin role + org context)
  // =========================================================================

  /**
   * Get all team permissions (admin only)
   * GET /api/admin/sso/teams/permissions
   */
  getTeamPermissions: async (
    orgSlug: string
  ): Promise<{ data: TeamPermission[] }> => {
    const { data } = await api.get<{ data: TeamPermission[] }>(
      "/api/admin/sso/teams/permissions",
      { headers: { "X-Org-Id": orgSlug } }
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
  ): Promise<{ data: TeamPermission }> => {
    const { data } = await api.get<{ data: TeamPermission }>(
      `/api/admin/sso/teams/${teamId}/permissions`,
      { headers: { "X-Org-Id": orgSlug } }
    );
    return data;
  },
};
