<?php

namespace Omnify\SsoClient\Tests\Fixtures\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Omnify\SsoClient\Models\Traits\HasConsoleSso;
use Omnify\SsoClient\Models\Traits\HasTeamPermissions;

/**
 * テスト用Userモデル
 *
 * パッケージのテストで使用するためのモデル
 */
class User extends Model implements AuthenticatableContract
{
    use Authenticatable;
    use HasApiTokens, HasFactory, Notifiable;
    use HasConsoleSso, HasTeamPermissions;

    protected $table = 'users';

    protected $fillable = [
        'name',
        'email',
        'password',
        'console_user_id',
        'console_access_token',
        'console_refresh_token',
        'console_token_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'console_token_expires_at' => 'datetime',
        ];
    }

    /**
     * テスト用ファクトリーを返す
     */
    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
