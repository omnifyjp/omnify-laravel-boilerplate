<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Team extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'console_team_id',
        'console_org_id',
        'name',
    ];

    protected $casts = [
        'console_team_id' => 'integer',
        'console_org_id' => 'integer',
    ];

    /**
     * Get permissions for this team.
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'team_permissions')
            ->withTimestamps();
    }

    /**
     * Check if team has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        return $this->permissions()->where('slug', $permission)->exists();
    }

    /**
     * Check if team has any of the given permissions.
     */
    public function hasAnyPermission(array $permissions): bool
    {
        return $this->permissions()->whereIn('slug', $permissions)->exists();
    }

    /**
     * Check if team has all of the given permissions.
     */
    public function hasAllPermissions(array $permissions): bool
    {
        return $this->permissions()->whereIn('slug', $permissions)->count() === count($permissions);
    }

    /**
     * Find team by Console team ID.
     */
    public static function findByConsoleId(int $consoleTeamId): ?self
    {
        return static::where('console_team_id', $consoleTeamId)->first();
    }

    /**
     * Get teams by Console organization ID.
     */
    public static function getByOrgId(int $consoleOrgId): \Illuminate\Database\Eloquent\Collection
    {
        return static::where('console_org_id', $consoleOrgId)->get();
    }
}
