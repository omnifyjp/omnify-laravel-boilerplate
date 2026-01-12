<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeamPermission extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'console_team_id',
        'console_org_id',
        'permission_id',
    ];

    protected $casts = [
        'console_team_id' => 'integer',
        'console_org_id' => 'integer',
        'permission_id' => 'integer',
    ];

    /**
     * Get the permission.
     */
    public function permission(): BelongsTo
    {
        return $this->belongsTo(Permission::class);
    }
}
