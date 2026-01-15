<?php

namespace Omnify\SsoClient\Tests\Fixtures\Models;

use Omnify\SsoClient\Models\User as SsoUser;

/**
 * テスト用Userモデル
 *
 * パッケージのテストで使用するためのモデル
 * Extends the SSO Client User model for testing.
 */
class User extends SsoUser
{
    /**
     * テスト用ファクトリーを返す
     */
    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
