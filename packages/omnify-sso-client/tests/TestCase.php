<?php

namespace Omnify\SsoClient\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Orchestra\Testbench\TestCase as OrchestraTestCase;
use Omnify\SsoClient\SsoClientServiceProvider;
use Omnify\SsoClient\Tests\Fixtures\Models\User;

/**
 * Base TestCase
 *
 * テストの基底クラス
 */
abstract class TestCase extends OrchestraTestCase
{
    use RefreshDatabase;

    protected function getPackageProviders($app): array
    {
        return [
            SsoClientServiceProvider::class,
            \Laravel\Sanctum\SanctumServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        // SSO Client設定
        $app['config']->set('sso-client.console.url', 'https://test.console.omnify.jp');
        $app['config']->set('sso-client.service.slug', 'test-service');
        $app['config']->set('sso-client.service.secret', 'test-secret');
        $app['config']->set('sso-client.user_model', User::class);

        // データベース設定
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]);

        // 認証設定
        $app['config']->set('auth.defaults.guard', 'web');
        $app['config']->set('auth.guards.web', [
            'driver' => 'session',
            'provider' => 'users',
        ]);
        $app['config']->set('auth.providers.users', [
            'driver' => 'eloquent',
            'model' => User::class,
        ]);

        // Sanctum設定
        $app['config']->set('sanctum.stateful', ['localhost', '127.0.0.1']);
    }

    protected function defineDatabaseMigrations(): void
    {
        // usersテーブルのマイグレーション
        $this->loadMigrationsFrom(__DIR__.'/Fixtures/database/migrations');
    }

    /**
     * テスト用ユーザーを作成
     */
    protected function createUser(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }
}
