import { describe, it, expect } from "vitest";
import { ssoService } from "./sso";
import {
  mockSsoUser,
  mockOrganizations,
  mockRoles,
  mockPermissions,
  mockTokens,
  mockTeamsWithPermissions,
  mockOrphanedTeams,
} from "@/__tests__/mocks/handlers";

describe("ssoService", () => {
  // ==========================================================================
  // SSO Auth
  // ==========================================================================
  describe("SSO Auth", () => {
    it("callback - exchanges code for tokens (web)", async () => {
      const result = await ssoService.callback({ code: "valid-code" });

      expect(result.user).toEqual(mockSsoUser);
      expect(result.organizations).toEqual(mockOrganizations);
      expect(result.token).toBeUndefined();
    });

    it("callback - exchanges code for tokens (mobile with device_name)", async () => {
      const result = await ssoService.callback({
        code: "valid-code",
        device_name: "iPhone 15",
      });

      expect(result.user).toEqual(mockSsoUser);
      expect(result.token).toBe("test-token-123");
    });

    it("callback - returns error for invalid code", async () => {
      await expect(ssoService.callback({ code: "invalid" })).rejects.toThrow();
    });

    it("logout - logs out successfully", async () => {
      const result = await ssoService.logout();

      expect(result.message).toBe("Logged out successfully");
    });

    it("getUser - returns current user and organizations", async () => {
      const result = await ssoService.getUser();

      expect(result.user).toEqual(mockSsoUser);
      expect(result.organizations).toEqual(mockOrganizations);
    });

    it("getGlobalLogoutUrl - returns logout URL", async () => {
      const result = await ssoService.getGlobalLogoutUrl("http://localhost/callback");

      expect(result.logout_url).toContain("console.example.com/sso/logout");
      expect(result.logout_url).toContain("redirect_uri=http://localhost/callback");
    });

    it("getGlobalLogoutUrl - works without redirect URI", async () => {
      const result = await ssoService.getGlobalLogoutUrl();

      expect(result.logout_url).toContain("console.example.com/sso/logout");
    });
  });

  // ==========================================================================
  // SSO Tokens
  // ==========================================================================
  describe("SSO Tokens", () => {
    it("getTokens - returns list of tokens", async () => {
      const result = await ssoService.getTokens();

      expect(result.tokens).toEqual(mockTokens);
      expect(result.tokens).toHaveLength(2);
    });

    it("revokeToken - revokes a specific token", async () => {
      const result = await ssoService.revokeToken(1);

      expect(result.message).toBe("Token revoked successfully");
    });

    it("revokeToken - returns 404 for non-existent token", async () => {
      await expect(ssoService.revokeToken(999)).rejects.toThrow();
    });

    it("revokeOtherTokens - revokes all other tokens", async () => {
      const result = await ssoService.revokeOtherTokens();

      expect(result.message).toBe("Tokens revoked successfully");
      expect(result.revoked_count).toBe(1);
    });
  });

  // ==========================================================================
  // SSO Read-Only (Roles)
  // ==========================================================================
  describe("SSO Read-Only - Roles", () => {
    it("getRoles - returns list of roles", async () => {
      const result = await ssoService.getRoles();

      expect(result.data).toEqual(mockRoles);
      expect(result.data).toHaveLength(2);
    });

    it("getRole - returns role with permissions", async () => {
      const result = await ssoService.getRole(1);

      expect(result.data.id).toBe(1);
      expect(result.data.slug).toBe("admin");
      expect(result.data.permissions).toEqual(mockPermissions);
    });

    it("getRole - returns 404 for non-existent role", async () => {
      await expect(ssoService.getRole(999)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // SSO Read-Only (Permissions)
  // ==========================================================================
  describe("SSO Read-Only - Permissions", () => {
    it("getPermissions - returns list of permissions", async () => {
      const result = await ssoService.getPermissions();

      expect(result.data).toEqual(mockPermissions);
      expect(result.groups).toEqual(["projects"]);
    });

    it("getPermissions - accepts filter params", async () => {
      const result = await ssoService.getPermissions({ group: "projects" });

      expect(result.data).toBeDefined();
    });

    it("getPermissionMatrix - returns permission matrix", async () => {
      const result = await ssoService.getPermissionMatrix();

      expect(result.roles).toHaveLength(2);
      expect(result.permissions).toHaveProperty("projects");
      expect(result.matrix).toHaveProperty("admin");
      expect(result.matrix.admin).toContain("projects.create");
    });
  });

  // ==========================================================================
  // Admin - Roles
  // ==========================================================================
  describe("Admin - Roles", () => {
    const orgSlug = "acme-corp";

    it("adminGetRoles - returns list of roles", async () => {
      const result = await ssoService.adminGetRoles(orgSlug);

      expect(result.data).toEqual(mockRoles);
    });

    it("adminGetRole - returns role with permissions", async () => {
      const result = await ssoService.adminGetRole(1, orgSlug);

      expect(result.data.id).toBe(1);
      expect(result.data.permissions).toBeDefined();
    });

    it("createRole - creates a new role", async () => {
      const result = await ssoService.createRole(
        { slug: "editor", name: "Editor", level: 30 },
        orgSlug
      );

      expect(result.data.slug).toBe("editor");
      expect(result.message).toBe("Role created successfully");
    });

    it("updateRole - updates a role", async () => {
      const result = await ssoService.updateRole(1, { name: "Super Admin" }, orgSlug);

      expect(result.data.name).toBe("Super Admin");
      expect(result.message).toBe("Role updated successfully");
    });

    it("deleteRole - deletes a role", async () => {
      await expect(ssoService.deleteRole(2, orgSlug)).resolves.toBeUndefined();
    });

    it("deleteRole - returns 422 for system role", async () => {
      await expect(ssoService.deleteRole(1, orgSlug)).rejects.toThrow();
    });

    it("getRolePermissions - returns role permissions", async () => {
      const result = await ssoService.getRolePermissions(1, orgSlug);

      expect(result.role.id).toBe(1);
      expect(result.permissions).toEqual(mockPermissions);
    });

    it("syncRolePermissions - syncs role permissions", async () => {
      const result = await ssoService.syncRolePermissions(
        1,
        { permissions: [1, 2] },
        orgSlug
      );

      expect(result.message).toBe("Permissions synced successfully");
      expect(result.attached).toBe(2);
      expect(result.detached).toBe(1);
    });
  });

  // ==========================================================================
  // Admin - Permissions
  // ==========================================================================
  describe("Admin - Permissions", () => {
    const orgSlug = "acme-corp";

    it("adminGetPermissions - returns list of permissions", async () => {
      const result = await ssoService.adminGetPermissions(orgSlug);

      expect(result.data).toEqual(mockPermissions);
      expect(result.groups).toEqual(["projects"]);
    });

    it("adminGetPermission - returns single permission", async () => {
      const result = await ssoService.adminGetPermission(1, orgSlug);

      expect(result.data.id).toBe(1);
      expect(result.data.slug).toBe("projects.create");
    });

    it("createPermission - creates a new permission", async () => {
      const result = await ssoService.createPermission(
        { slug: "projects.delete", name: "Delete Projects", group: "projects" },
        orgSlug
      );

      expect(result.data.slug).toBe("projects.delete");
      expect(result.message).toBe("Permission created successfully");
    });

    it("updatePermission - updates a permission", async () => {
      const result = await ssoService.updatePermission(
        1,
        { name: "Create New Projects" },
        orgSlug
      );

      expect(result.data.name).toBe("Create New Projects");
      expect(result.message).toBe("Permission updated successfully");
    });

    it("deletePermission - deletes a permission", async () => {
      await expect(ssoService.deletePermission(1, orgSlug)).resolves.toBeUndefined();
    });

    it("adminGetPermissionMatrix - returns permission matrix", async () => {
      const result = await ssoService.adminGetPermissionMatrix(orgSlug);

      expect(result.roles).toHaveLength(2);
      expect(result.matrix).toHaveProperty("admin");
    });
  });

  // ==========================================================================
  // Admin - Team Permissions
  // ==========================================================================
  describe("Admin - Team Permissions", () => {
    const orgSlug = "acme-corp";

    it("getTeamPermissions - returns teams with permissions", async () => {
      const result = await ssoService.getTeamPermissions(orgSlug);

      expect(result.teams).toEqual(mockTeamsWithPermissions);
    });

    it("getTeamPermission - returns team permissions", async () => {
      const result = await ssoService.getTeamPermission(12345, orgSlug);

      expect(result.console_team_id).toBe(12345);
      expect(result.permissions).toBeDefined();
    });

    it("syncTeamPermissions - syncs team permissions", async () => {
      const result = await ssoService.syncTeamPermissions(
        12345,
        { permissions: [1, 2] },
        orgSlug
      );

      expect(result.message).toBe("Team permissions synced");
      expect(result.console_team_id).toBe(12345);
      expect(result.attached).toBe(2);
    });

    it("removeTeamPermissions - removes team permissions", async () => {
      await expect(
        ssoService.removeTeamPermissions(12345, orgSlug)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Admin - Orphaned Team Permissions
  // ==========================================================================
  describe("Admin - Orphaned Team Permissions", () => {
    const orgSlug = "acme-corp";

    it("getOrphanedTeamPermissions - returns orphaned teams", async () => {
      const result = await ssoService.getOrphanedTeamPermissions(orgSlug);

      expect(result.orphaned_teams).toEqual(mockOrphanedTeams);
      expect(result.total_orphaned_permissions).toBe(3);
    });

    it("restoreOrphanedTeamPermissions - restores orphaned permissions", async () => {
      const result = await ssoService.restoreOrphanedTeamPermissions(99999, orgSlug);

      expect(result.message).toBe("Team permissions restored");
      expect(result.console_team_id).toBe(99999);
      expect(result.restored_count).toBe(3);
    });

    it("cleanupOrphanedTeamPermissions - cleans up orphaned permissions", async () => {
      const result = await ssoService.cleanupOrphanedTeamPermissions(orgSlug);

      expect(result.message).toBe("Orphaned team permissions permanently deleted");
      expect(result.deleted_count).toBe(3);
    });

    it("cleanupOrphanedTeamPermissions - accepts filter params", async () => {
      const result = await ssoService.cleanupOrphanedTeamPermissions(orgSlug, {
        console_team_id: 99999,
        older_than_days: 30,
      });

      expect(result.deleted_count).toBe(3);
    });
  });
});
