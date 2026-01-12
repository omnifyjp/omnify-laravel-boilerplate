<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Http\Controllers\Admin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Omnify\SsoClient\Models\Permission;
use Omnify\SsoClient\Models\Role;

class PermissionAdminController extends Controller
{
    /**
     * List all permissions.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Permission::withCount('roles');

        // Filter by group
        if ($request->has('group')) {
            $query->where('group', $request->query('group'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('slug', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%");
            });
        }

        // Check if grouped response is requested
        if ($request->boolean('grouped')) {
            $permissions = $query->orderBy('group')->orderBy('slug')->get();

            $grouped = $permissions->groupBy('group')->map(fn ($items) => $items->values());

            return response()->json($grouped);
        }

        $permissions = $query->orderBy('group')->orderBy('slug')->get();

        // Get unique groups
        $groups = Permission::distinct()->pluck('group')->filter()->values();

        return response()->json([
            'data' => $permissions,
            'groups' => $groups,
        ]);
    }

    /**
     * Create a new permission.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:100', 'unique:permissions,slug'],
            'display_name' => ['required', 'string', 'max:100'],
            'group' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
        ]);

        $permission = Permission::create($validated);

        return response()->json([
            'data' => $permission,
            'message' => 'Permission created successfully',
        ], 201);
    }

    /**
     * Get a specific permission.
     */
    public function show(int $id): JsonResponse
    {
        $permission = Permission::with('roles')->findOrFail($id);

        return response()->json([
            'data' => $permission,
        ]);
    }

    /**
     * Update a permission.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $permission = Permission::findOrFail($id);

        $validated = $request->validate([
            'display_name' => ['sometimes', 'string', 'max:100'],
            'group' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
        ]);

        // Slug cannot be changed
        unset($validated['slug']);

        $permission->update($validated);

        return response()->json([
            'data' => $permission->fresh(),
            'message' => 'Permission updated successfully',
        ]);
    }

    /**
     * Delete a permission.
     */
    public function destroy(int $id): JsonResponse
    {
        $permission = Permission::findOrFail($id);

        // This will automatically detach from all roles due to cascade
        $permission->delete();

        return response()->json(null, 204);
    }

    /**
     * Get permission matrix (roles x permissions).
     */
    public function matrix(): JsonResponse
    {
        $roles = Role::orderBy('level', 'desc')->get(['id', 'slug', 'display_name']);

        $permissions = Permission::orderBy('group')
            ->orderBy('slug')
            ->get()
            ->groupBy('group')
            ->map(fn ($items) => $items->map(fn ($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'display_name' => $p->display_name,
            ])->values());

        // Build matrix
        $matrix = [];
        foreach ($roles as $role) {
            $rolePermissions = $role->permissions()->pluck('slug')->toArray();
            $matrix[$role->slug] = $rolePermissions;
        }

        return response()->json([
            'roles' => $roles,
            'permissions' => $permissions,
            'matrix' => $matrix,
        ]);
    }
}
