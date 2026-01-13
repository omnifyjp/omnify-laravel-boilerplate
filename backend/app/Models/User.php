<?php

namespace App\Models;

use App\Models\OmnifyBase\UserBaseModel;
use Illuminate\Auth\Authenticatable;
use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\Access\Authorizable as AuthorizableContract;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\Access\Authorizable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Omnify\SsoClient\Models\Traits\HasConsoleSso;
use Omnify\SsoClient\Models\Traits\HasTeamPermissions;

/**
 * User Model
 * 
 * SSO統合用のユーザーモデル
 */
class User extends UserBaseModel implements
    AuthenticatableContract,
    AuthorizableContract,
    CanResetPasswordContract
{
    use Authenticatable, Authorizable, CanResetPassword, MustVerifyEmail;
    use HasApiTokens, HasFactory, Notifiable;
    use HasConsoleSso, HasTeamPermissions;

    /**
     * SSO用の追加fillable属性
     */
    protected $fillable = [
        'console_user_id',
        'name',
        'name_lastname',
        'name_firstname',
        'name_kana_lastname',
        'name_kana_firstname',
        'email',
        'email_verified_at',
        'password',
        'remember_token',
        'console_access_token',
        'console_refresh_token',
        'console_token_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
        'console_access_token',
        'console_refresh_token',
    ];

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            'password' => 'hashed',
            'console_token_expires_at' => 'datetime',
        ]);
    }
}
