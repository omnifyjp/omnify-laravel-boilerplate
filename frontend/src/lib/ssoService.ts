/**
 * SSO Service instance configured for this app
 *
 * Uses createSsoService from @famgia/omnify-client-sso-react
 */

import { createSsoService } from "@famgia/omnify-client-sso-react";

// Export types for convenience
export type {
  Role,
  Permission,
  RoleWithPermissions,
  PermissionMatrix,
  ApiToken,
  TeamWithPermissions,
  TeamPermissionDetail,
  OrphanedTeam,
  CreateRoleInput,
  UpdateRoleInput,
  CreatePermissionInput,
  UpdatePermissionInput,
  SyncPermissionsInput,
  CleanupOrphanedInput,
} from "@famgia/omnify-client-sso-react";

// Create and export the service instance
export const ssoService = createSsoService({
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "",
});
