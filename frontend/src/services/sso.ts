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
  // Roles
  // =========================================================================

  /**
   * Get all roles
   * GET /api/admin/sso/roles
   */
  getRoles: async (): Promise<{ data: Role[] }> => {
    const { data } = await api.get<{ data: Role[] }>("/api/admin/sso/roles");
    return data;
  },

  /**
   * Get single role with permissions
   * GET /api/admin/sso/roles/{id}
   */
  getRole: async (id: number): Promise<{ data: RoleWithPermissions }> => {
    const { data } = await api.get<{ data: RoleWithPermissions }>(
      `/api/admin/sso/roles/${id}`
    );
    return data;
  },

  /**
   * Get role permissions
   * GET /api/admin/sso/roles/{id}/permissions
   */
  getRolePermissions: async (id: number): Promise<{ data: Permission[] }> => {
    const { data } = await api.get<{ data: Permission[] }>(
      `/api/admin/sso/roles/${id}/permissions`
    );
    return data;
  },

  // =========================================================================
  // Permissions
  // =========================================================================

  /**
   * Get all permissions
   * GET /api/admin/sso/permissions
   */
  getPermissions: async (group?: string): Promise<{ data: Permission[] }> => {
    const params = group ? { group } : {};
    const { data } = await api.get<{ data: Permission[] }>(
      "/api/admin/sso/permissions",
      { params }
    );
    return data;
  },

  /**
   * Get permission matrix (roles x permissions)
   * GET /api/admin/sso/permission-matrix
   */
  getPermissionMatrix: async (): Promise<PermissionMatrix> => {
    const { data } = await api.get<PermissionMatrix>(
      "/api/admin/sso/permission-matrix"
    );
    return data;
  },

  // =========================================================================
  // Teams
  // =========================================================================

  /**
   * Get all team permissions
   * GET /api/admin/sso/teams/permissions
   */
  getTeamPermissions: async (): Promise<{ data: TeamPermission[] }> => {
    const { data } = await api.get<{ data: TeamPermission[] }>(
      "/api/admin/sso/teams/permissions"
    );
    return data;
  },

  /**
   * Get specific team permissions
   * GET /api/admin/sso/teams/{teamId}/permissions
   */
  getTeamPermission: async (
    teamId: number
  ): Promise<{ data: TeamPermission }> => {
    const { data } = await api.get<{ data: TeamPermission }>(
      `/api/admin/sso/teams/${teamId}/permissions`
    );
    return data;
  },
};
