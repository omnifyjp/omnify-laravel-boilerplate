import { http, HttpResponse } from "msw";

// Mock data
export const mockSsoUser = {
  id: 1,
  console_user_id: 54321,
  email: "test@example.com",
  name: "Test User",
};

export const mockOrganizations = [
  { id: 100, slug: "acme-corp", name: "ACME Corporation", role: "admin" },
  { id: 101, slug: "test-org", name: "Test Organization", role: "member" },
];

export const mockRoles = [
  {
    id: 1,
    name: "Administrator",
    slug: "admin",
    description: "Full access",
    level: 100,
    permissions_count: 10,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Manager",
    slug: "manager",
    description: "Manager role",
    level: 50,
    permissions_count: 5,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export const mockPermissions = [
  {
    id: 1,
    name: "Create Projects",
    slug: "projects.create",
    group: "projects",
    description: null,
    roles_count: 2,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Edit Projects",
    slug: "projects.edit",
    group: "projects",
    description: null,
    roles_count: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export const mockTokens = [
  {
    id: 1,
    name: "iPhone 15",
    last_used_at: "2024-01-15T10:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    is_current: true,
  },
  {
    id: 2,
    name: "MacBook Pro",
    last_used_at: null,
    created_at: "2024-01-02T00:00:00Z",
    is_current: false,
  },
];

export const mockTeamsWithPermissions = [
  {
    console_team_id: 12345,
    name: "Development Team",
    path: "/engineering/development",
    permissions: [
      { id: 1, slug: "projects.create" },
      { id: 2, slug: "projects.edit" },
    ],
  },
];

export const mockOrphanedTeams = [
  {
    console_team_id: 99999,
    permissions_count: 3,
    permissions: ["projects.create", "projects.edit", "projects.delete"],
    deleted_at: "2024-01-10T00:00:00Z",
  },
];

// Handlers
export const handlers = [
  // ==========================================================================
  // SSO Auth
  // ==========================================================================
  http.post(`/api/sso/callback`, async ({ request }) => {
    const body = (await request.json()) as { code: string; device_name?: string };
    if (body.code === "invalid") {
      return HttpResponse.json(
        { error: "INVALID_CODE", message: "Failed to exchange SSO code" },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      user: mockSsoUser,
      organizations: mockOrganizations,
      token: body.device_name ? "test-token-123" : undefined,
    });
  }),

  http.post(`/api/sso/logout`, () => {
    return HttpResponse.json({ message: "Logged out successfully" });
  }),

  http.get(`/api/sso/user`, () => {
    return HttpResponse.json({
      user: mockSsoUser,
      organizations: mockOrganizations,
    });
  }),

  http.get(`/api/sso/global-logout-url`, ({ request }) => {
    const url = new URL(request.url);
    const redirectUri = url.searchParams.get("redirect_uri") || "http://localhost";
    return HttpResponse.json({
      logout_url: `https://console.example.com/sso/logout?redirect_uri=${redirectUri}`,
    });
  }),

  // ==========================================================================
  // SSO Tokens
  // ==========================================================================
  http.get(`/api/sso/tokens`, () => {
    return HttpResponse.json({ tokens: mockTokens });
  }),

  http.delete(`/api/sso/tokens/:tokenId`, ({ params }) => {
    const tokenId = Number(params.tokenId);
    if (tokenId === 999) {
      return HttpResponse.json(
        { error: "TOKEN_NOT_FOUND", message: "Token not found" },
        { status: 404 }
      );
    }
    return HttpResponse.json({ message: "Token revoked successfully" });
  }),

  http.post(`/api/sso/tokens/revoke-others`, () => {
    return HttpResponse.json({
      message: "Tokens revoked successfully",
      revoked_count: 1,
    });
  }),

  // ==========================================================================
  // SSO Read-Only (Roles)
  // ==========================================================================
  http.get(`/api/sso/roles`, () => {
    return HttpResponse.json({ data: mockRoles });
  }),

  http.get(`/api/sso/roles/:id`, ({ params }) => {
    const id = Number(params.id);
    const role = mockRoles.find((r) => r.id === id);
    if (!role) {
      return HttpResponse.json({ message: "Role not found" }, { status: 404 });
    }
    return HttpResponse.json({
      data: { ...role, permissions: mockPermissions },
    });
  }),

  // ==========================================================================
  // SSO Read-Only (Permissions)
  // ==========================================================================
  http.get(`/api/sso/permissions`, () => {
    return HttpResponse.json({
      data: mockPermissions,
      groups: ["projects"],
    });
  }),

  http.get(`/api/sso/permission-matrix`, () => {
    return HttpResponse.json({
      roles: mockRoles.map((r) => ({ id: r.id, slug: r.slug, name: r.name })),
      permissions: {
        projects: mockPermissions.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
        })),
      },
      matrix: {
        admin: ["projects.create", "projects.edit"],
        manager: ["projects.create"],
      },
    });
  }),

  // ==========================================================================
  // Admin - Roles
  // ==========================================================================
  http.get(`/api/admin/sso/roles`, () => {
    return HttpResponse.json({ data: mockRoles });
  }),

  http.get(`/api/admin/sso/roles/:id`, ({ params }) => {
    const id = Number(params.id);
    const role = mockRoles.find((r) => r.id === id);
    if (!role) {
      return HttpResponse.json({ message: "Role not found" }, { status: 404 });
    }
    return HttpResponse.json({
      data: { ...role, permissions: mockPermissions },
    });
  }),

  http.post(`/api/admin/sso/roles`, async ({ request }) => {
    const body = (await request.json()) as { slug: string; name: string; level: number };
    return HttpResponse.json(
      {
        data: {
          id: 3,
          ...body,
          description: null,
          permissions_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Role created successfully",
      },
      { status: 201 }
    );
  }),

  http.put(`/api/admin/sso/roles/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as Partial<{ name: string; level: number }>;
    const role = mockRoles.find((r) => r.id === id);
    if (!role) {
      return HttpResponse.json({ message: "Role not found" }, { status: 404 });
    }
    return HttpResponse.json({
      data: { ...role, ...body },
      message: "Role updated successfully",
    });
  }),

  http.delete(`/api/admin/sso/roles/:id`, ({ params }) => {
    const id = Number(params.id);
    if (id === 1) {
      return HttpResponse.json(
        { error: "CANNOT_DELETE_SYSTEM_ROLE", message: "System roles cannot be deleted" },
        { status: 422 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`/api/admin/sso/roles/:id/permissions`, ({ params }) => {
    const id = Number(params.id);
    const role = mockRoles.find((r) => r.id === id);
    return HttpResponse.json({
      role: { id: role?.id, slug: role?.slug, name: role?.name },
      permissions: mockPermissions,
    });
  }),

  http.put(`/api/admin/sso/roles/:id/permissions`, () => {
    return HttpResponse.json({
      message: "Permissions synced successfully",
      attached: 2,
      detached: 1,
    });
  }),

  // ==========================================================================
  // Admin - Permissions
  // ==========================================================================
  http.get(`/api/admin/sso/permissions`, () => {
    return HttpResponse.json({
      data: mockPermissions,
      groups: ["projects"],
    });
  }),

  http.get(`/api/admin/sso/permissions/:id`, ({ params }) => {
    const id = Number(params.id);
    const permission = mockPermissions.find((p) => p.id === id);
    if (!permission) {
      return HttpResponse.json({ message: "Permission not found" }, { status: 404 });
    }
    return HttpResponse.json({ data: permission });
  }),

  http.post(`/api/admin/sso/permissions`, async ({ request }) => {
    const body = (await request.json()) as { slug: string; name: string; group?: string };
    return HttpResponse.json(
      {
        data: {
          id: 3,
          ...body,
          description: null,
          roles_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Permission created successfully",
      },
      { status: 201 }
    );
  }),

  http.put(`/api/admin/sso/permissions/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as Partial<{ name: string; group: string }>;
    const permission = mockPermissions.find((p) => p.id === id);
    if (!permission) {
      return HttpResponse.json({ message: "Permission not found" }, { status: 404 });
    }
    return HttpResponse.json({
      data: { ...permission, ...body },
      message: "Permission updated successfully",
    });
  }),

  http.delete(`/api/admin/sso/permissions/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`/api/admin/sso/permission-matrix`, () => {
    return HttpResponse.json({
      roles: mockRoles.map((r) => ({ id: r.id, slug: r.slug, name: r.name })),
      permissions: {
        projects: mockPermissions.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
        })),
      },
      matrix: {
        admin: ["projects.create", "projects.edit"],
        manager: ["projects.create"],
      },
    });
  }),

  // ==========================================================================
  // Admin - Team Permissions
  // ==========================================================================
  http.get(`/api/admin/sso/teams/permissions`, () => {
    return HttpResponse.json({ teams: mockTeamsWithPermissions });
  }),

  http.get(`/api/admin/sso/teams/:teamId/permissions`, ({ params }) => {
    const teamId = Number(params.teamId);
    return HttpResponse.json({
      console_team_id: teamId,
      permissions: mockPermissions.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
      })),
    });
  }),

  http.put(`/api/admin/sso/teams/:teamId/permissions`, ({ params }) => {
    const teamId = Number(params.teamId);
    return HttpResponse.json({
      message: "Team permissions synced",
      console_team_id: teamId,
      attached: 2,
      detached: 1,
    });
  }),

  http.delete(`/api/admin/sso/teams/:teamId/permissions`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ==========================================================================
  // Admin - Orphaned Team Permissions
  // ==========================================================================
  http.get(`/api/admin/sso/teams/orphaned`, () => {
    return HttpResponse.json({
      orphaned_teams: mockOrphanedTeams,
      total_orphaned_permissions: 3,
    });
  }),

  http.post(`/api/admin/sso/teams/orphaned/:teamId/restore`, ({ params }) => {
    const teamId = Number(params.teamId);
    return HttpResponse.json({
      message: "Team permissions restored",
      console_team_id: teamId,
      restored_count: 3,
    });
  }),

  http.delete(`/api/admin/sso/teams/orphaned`, () => {
    return HttpResponse.json({
      message: "Orphaned team permissions permanently deleted",
      deleted_count: 3,
    });
  }),

  // ==========================================================================
  // CSRF Cookie
  // ==========================================================================
  http.get(`/sanctum/csrf-cookie`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
