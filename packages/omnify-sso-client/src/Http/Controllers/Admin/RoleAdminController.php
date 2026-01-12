<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Http\Controllers\Admin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Omnify\SsoClient\Cache\RolePermissionCache;
use Omnify\SsoClient\Models\Permission;
use Omnify\SsoClient\Models\Role;

class RoleAdminController extends Controller
{
    /**
     * List all roles.
     */
    public function index(): JsonResponse
    {
        $roles = Role::withCount('permissions')
            ->orderBy('level', 'desc')
            ->get();

        return response()->json([
            'data' => $roles,
        ]);
    }

    /**
     * Create a new role.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:100', 'unique:roles,slug'],
            'display_name' => ['required', 'string', 'max:100'],
            'level' => ['required', 'integer', 'min:0', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        $role = Role::create($validated);

        return response()->json([
            'data' => $role,
            'message' => 'Role created successfully',
        ], 201);
    }

    /**
     * Get a specific role.
     */
    public function show(int $id): JsonResponse
    {
        $role = Role::with('permissions')->findOrFail($id);

        return response()->json([
            'data' => $role,
        ]);
    }

    /**
     * Update a role.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'display_name' => ['sometimes', 'string', 'max:100'],
            'level' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        // Slug cannot be changed
        unset($validated['slug']);

        $role->update($validated);

        // Clear cache
        RolePermissionCache::clear($role->slug);

        return response()->json([
            'data' => $role->fresh(),
            'message' => 'Role updated successfully',
        ]);
    }

    /**
     * Delete a role.
     */
    public function destroy(int $id): JsonResponse
    {
        $role = Role::findOrFail($id);

        // Check if it's a system role
        $systemRoles = ['admin', 'manager', 'member'];
        if (in_array($role->slug, $systemRoles, true)) {
            return response()->json([
                'error' => 'CANNOT_DELETE_SYSTEM_ROLE',
                'message' => 'System roles cannot be deleted',
            ], 422);
        }

        // Clear cache before delete
        RolePermissionCache::clear($role->slug);

        $role->delete();

        return response()->json(null, 204);
    }

    /**
     * Get role's permissions.
     */
    public function permissions(int $id): JsonResponse
    {
        $role = Role::with('permissions')->findOrFail($id);

        return response()->json([
            'role' => [
                'id' => $role->id,
                'slug' => $role->slug,
                'display_name' => $role->display_name,
            ],
            'permissions' => $role->permissions,
        ]);
    }

    /**
     * Sync role's permissions.
     */
    public function syncPermissions(Request $request, int $id): JsonResponse
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['required'],
        ]);

        // Handle both IDs and slugs
        $permissionIds = collect($validated['permissions'])->map(function ($item) {
            if (is_numeric($item)) {
                return (int) $item;
            }

            // Find by slug
            $permission = Permission::where('slug', $item)->first();

            return $permission?->id;
        })->filter()->values()->toArray();

        // Get current permissions for diff
        $currentIds = $role->permissions()->pluck('permissions.id')->toArray();

        // Sync permissions
        $role->permissions()->sync($permissionIds);

        // Calculate attached and detached
        $attached = count(array_diff($permissionIds, $currentIds));
        $detached = count(array_diff($currentIds, $permissionIds));

        // Clear cache
        RolePermissionCache::clear($role->slug);

        return response()->json([
            'message' => 'Permissions synced successfully',
            'attached' => $attached,
            'detached' => $detached,
        ]);
    }
}
