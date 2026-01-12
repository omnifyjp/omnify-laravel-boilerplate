<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Http\Controllers\Admin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Omnify\SsoClient\Cache\TeamPermissionCache;
use Omnify\SsoClient\Models\Permission;
use Omnify\SsoClient\Models\TeamPermission;
use Omnify\SsoClient\Services\OrgAccessService;

class TeamPermissionAdminController extends Controller
{
    public function __construct(
        private readonly OrgAccessService $orgAccessService
    ) {}

    /**
     * List all teams with their permissions.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $orgSlug = $request->attributes->get('orgSlug');
        $orgId = $request->attributes->get('orgId');

        // Get teams from Console
        $teams = $this->orgAccessService->getUserTeams($user, $orgSlug);

        // Get team permissions from DB
        $teamIds = collect($teams)->pluck('id')->toArray();

        $teamPermissions = TeamPermission::where('console_org_id', $orgId)
            ->whereIn('console_team_id', $teamIds)
            ->whereNull('deleted_at')
            ->with('permission')
            ->get()
            ->groupBy('console_team_id');

        // Merge data
        $result = collect($teams)->map(function ($team) use ($teamPermissions) {
            $permissions = $teamPermissions->get($team['id'], collect())
                ->map(fn ($tp) => [
                    'id' => $tp->permission->id,
                    'slug' => $tp->permission->slug,
                ])
                ->values();

            return [
                'console_team_id' => $team['id'],
                'name' => $team['name'],
                'path' => $team['path'] ?? null,
                'permissions' => $permissions,
            ];
        });

        return response()->json([
            'teams' => $result,
        ]);
    }

    /**
     * Get permissions for a specific team.
     */
    public function show(Request $request, int $teamId): JsonResponse
    {
        $orgId = $request->attributes->get('orgId');

        $permissions = TeamPermission::where('console_org_id', $orgId)
            ->where('console_team_id', $teamId)
            ->whereNull('deleted_at')
            ->with('permission')
            ->get()
            ->map(fn ($tp) => [
                'id' => $tp->permission->id,
                'slug' => $tp->permission->slug,
                'display_name' => $tp->permission->display_name,
            ]);

        return response()->json([
            'console_team_id' => $teamId,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Sync permissions for a team.
     */
    public function sync(Request $request, int $teamId): JsonResponse
    {
        $orgId = $request->attributes->get('orgId');

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['required'],
        ]);

        // Handle both IDs and slugs
        $permissionIds = collect($validated['permissions'])->map(function ($item) {
            if (is_numeric($item)) {
                return (int) $item;
            }

            $permission = Permission::where('slug', $item)->first();

            return $permission?->id;
        })->filter()->values()->toArray();

        // Get current permissions
        $current = TeamPermission::where('console_org_id', $orgId)
            ->where('console_team_id', $teamId)
            ->whereNull('deleted_at')
            ->pluck('permission_id')
            ->toArray();

        // Calculate diff
        $toAttach = array_diff($permissionIds, $current);
        $toDetach = array_diff($current, $permissionIds);

        // Soft delete removed permissions
        if (! empty($toDetach)) {
            TeamPermission::where('console_org_id', $orgId)
                ->where('console_team_id', $teamId)
                ->whereIn('permission_id', $toDetach)
                ->update(['deleted_at' => now()]);
        }

        // Add new permissions (or restore soft-deleted)
        foreach ($toAttach as $permissionId) {
            TeamPermission::updateOrCreate(
                [
                    'console_org_id' => $orgId,
                    'console_team_id' => $teamId,
                    'permission_id' => $permissionId,
                ],
                ['deleted_at' => null]
            );
        }

        // Clear cache
        TeamPermissionCache::clearForTeam($teamId, $orgId);

        return response()->json([
            'message' => 'Team permissions synced',
            'console_team_id' => $teamId,
            'attached' => count($toAttach),
            'detached' => count($toDetach),
        ]);
    }

    /**
     * Remove all permissions for a team (soft delete).
     */
    public function destroy(Request $request, int $teamId): JsonResponse
    {
        $orgId = $request->attributes->get('orgId');

        TeamPermission::where('console_org_id', $orgId)
            ->where('console_team_id', $teamId)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);

        TeamPermissionCache::clearForTeam($teamId, $orgId);

        return response()->json(null, 204);
    }

    /**
     * List orphaned team permissions.
     */
    public function orphaned(Request $request): JsonResponse
    {
        $user = $request->user();
        $orgSlug = $request->attributes->get('orgSlug');
        $orgId = $request->attributes->get('orgId');

        // Get current teams from Console
        $teams = $this->orgAccessService->getUserTeams($user, $orgSlug);
        $activeTeamIds = collect($teams)->pluck('id')->toArray();

        // Find orphaned (team IDs in DB but not in Console, or already soft-deleted)
        $orphaned = TeamPermission::where('console_org_id', $orgId)
            ->where(function ($query) use ($activeTeamIds) {
                $query->whereNotIn('console_team_id', $activeTeamIds)
                    ->orWhereNotNull('deleted_at');
            })
            ->with('permission')
            ->get()
            ->groupBy('console_team_id')
            ->map(function ($items, $teamId) {
                $first = $items->first();

                return [
                    'console_team_id' => $teamId,
                    'permissions_count' => $items->count(),
                    'permissions' => $items->pluck('permission.slug')->toArray(),
                    'deleted_at' => $first->deleted_at?->toIso8601String(),
                ];
            })
            ->values();

        // Auto soft-delete newly orphaned teams
        if (! empty($activeTeamIds)) {
            TeamPermission::where('console_org_id', $orgId)
                ->whereNotIn('console_team_id', $activeTeamIds)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => now()]);
        }

        return response()->json([
            'orphaned_teams' => $orphaned,
            'total_orphaned_permissions' => $orphaned->sum('permissions_count'),
        ]);
    }

    /**
     * Restore orphaned team permissions.
     */
    public function restore(Request $request, int $teamId): JsonResponse
    {
        $orgId = $request->attributes->get('orgId');

        $count = TeamPermission::where('console_org_id', $orgId)
            ->where('console_team_id', $teamId)
            ->whereNotNull('deleted_at')
            ->update(['deleted_at' => null]);

        TeamPermissionCache::clearForTeam($teamId, $orgId);

        return response()->json([
            'message' => 'Team permissions restored',
            'console_team_id' => $teamId,
            'restored_count' => $count,
        ]);
    }

    /**
     * Hard delete orphaned team permissions.
     */
    public function cleanupOrphaned(Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('orgId');

        $validated = $request->validate([
            'console_team_id' => ['nullable', 'integer'],
            'older_than_days' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = TeamPermission::where('console_org_id', $orgId)
            ->whereNotNull('deleted_at');

        if (isset($validated['console_team_id'])) {
            $query->where('console_team_id', $validated['console_team_id']);
        }

        if (isset($validated['older_than_days'])) {
            $query->where('deleted_at', '<', now()->subDays($validated['older_than_days']));
        }

        $count = $query->forceDelete();

        TeamPermissionCache::clearForOrg($orgId);

        return response()->json([
            'message' => 'Orphaned team permissions permanently deleted',
            'deleted_count' => $count,
        ]);
    }
}
