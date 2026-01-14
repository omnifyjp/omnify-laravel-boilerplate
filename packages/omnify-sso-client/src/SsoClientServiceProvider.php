<?php

declare(strict_types=1);

namespace Omnify\SsoClient;

use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Omnify\SsoClient\Console\Commands\SsoCleanupOrphanTeamsCommand;
use Omnify\SsoClient\Console\Commands\SsoInstallCommand;
use Omnify\SsoClient\Console\Commands\SsoSyncPermissionsCommand;
use Omnify\SsoClient\Http\Middleware\SsoAuthenticate;
use Omnify\SsoClient\Http\Middleware\SsoOrganizationAccess;
use Omnify\SsoClient\Http\Middleware\SsoPermissionCheck;
use Omnify\SsoClient\Http\Middleware\SsoRoleCheck;
use Omnify\SsoClient\Services\ConsoleApiService;
use Omnify\SsoClient\Services\ConsoleTokenService;
use Omnify\SsoClient\Services\JwksService;
use Omnify\SsoClient\Services\JwtVerifier;
use Omnify\SsoClient\Services\OrgAccessService;

class SsoClientServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Merge config
        $this->mergeConfigFrom(
            __DIR__.'/../config/sso-client.php',
            'sso-client'
        );

        // Register services as singletons
        $this->app->singleton(JwksService::class, function ($app) {
            return new JwksService(
                config('sso-client.console.url'),
                config('sso-client.cache.jwks_ttl')
            );
        });

        $this->app->singleton(JwtVerifier::class, function ($app) {
            return new JwtVerifier(
                $app->make(JwksService::class)
            );
        });

        $this->app->singleton(ConsoleApiService::class, function ($app) {
            return new ConsoleApiService(
                config('sso-client.console.url'),
                config('sso-client.service.slug'),
                config('sso-client.console.timeout'),
                config('sso-client.console.retry')
            );
        });

        $this->app->singleton(ConsoleTokenService::class, function ($app) {
            return new ConsoleTokenService(
                $app->make(ConsoleApiService::class)
            );
        });

        $this->app->singleton(OrgAccessService::class, function ($app) {
            return new OrgAccessService(
                $app->make(ConsoleApiService::class),
                $app->make(ConsoleTokenService::class),
                config('sso-client.cache.org_access_ttl')
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerPublishing();
        $this->registerMigrations();
        $this->registerRoutes();
        $this->registerMiddleware();
        $this->registerCommands();
        $this->registerGates();
        $this->registerOmnifySchemas();
    }

    /**
     * Register the package migrations.
     * マイグレーションは自動ロードしない（publishが必要）
     * これにより、ユーザーがマイグレーションの順序を制御できる
     */
    protected function registerMigrations(): void
    {
        // マイグレーションは自動ロードしない
        // ユーザーはsso:installコマンドまたは手動でpublishする必要がある
        // $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }

    /**
     * Register the package's publishable resources.
     */
    protected function registerPublishing(): void
    {
        if ($this->app->runningInConsole()) {
            // Publish config
            $this->publishes([
                __DIR__.'/../config/sso-client.php' => config_path('sso-client.php'),
            ], 'sso-client-config');

            // Publish migrations
            $this->publishes([
                __DIR__.'/../database/migrations' => database_path('migrations'),
            ], 'sso-client-migrations');

            // Publish all
            $this->publishes([
                __DIR__.'/../config/sso-client.php' => config_path('sso-client.php'),
                __DIR__.'/../database/migrations' => database_path('migrations'),
            ], 'sso-client');
        }
    }

    /**
     * Register the package routes.
     */
    protected function registerRoutes(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/sso.php');
    }

    /**
     * Register the package middleware.
     */
    protected function registerMiddleware(): void
    {
        /** @var Router $router */
        $router = $this->app->make(Router::class);

        $router->aliasMiddleware('sso.auth', SsoAuthenticate::class);
        $router->aliasMiddleware('sso.org', SsoOrganizationAccess::class);
        $router->aliasMiddleware('sso.role', SsoRoleCheck::class);
        $router->aliasMiddleware('sso.permission', SsoPermissionCheck::class);
    }

    /**
     * Register the package commands.
     */
    protected function registerCommands(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                SsoInstallCommand::class,
                SsoCleanupOrphanTeamsCommand::class,
                SsoSyncPermissionsCommand::class,
            ]);
        }
    }

    /**
     * Register permission gates.
     */
    protected function registerGates(): void
    {
        // Define gates based on permissions from database
        Gate::before(function ($user, $ability) {
            // Super admin bypass (optional)
            if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
                return true;
            }

            // Check role-based permissions
            if (method_exists($user, 'hasPermission')) {
                return $user->hasPermission($ability) ?: null;
            }

            return null;
        });

        // Dynamic permission gates from database
        $this->app->booted(function () {
            try {
                $permissions = \Omnify\SsoClient\Models\Permission::all();
                foreach ($permissions as $permission) {
                    Gate::define($permission->slug, function ($user) use ($permission) {
                        return $user->hasPermission($permission->slug);
                    });
                }
            } catch (\Exception $e) {
                // Database might not be ready yet (migrations not run)
            }
        });
    }

    /**
     * Register Omnify schema paths if Omnify is available.
     */
    protected function registerOmnifySchemas(): void
    {
        // Check if Omnify is available and register schema path
        if (class_exists(\Omnify\Omnify::class)) {
            \Omnify\Omnify::addSchemaPath(__DIR__.'/../database/schemas');
        }
    }
}
