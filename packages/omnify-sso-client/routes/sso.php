<?php

use Illuminate\Support\Facades\Route;
use Omnify\SsoClient\Http\Controllers\Admin\PermissionAdminController;
use Omnify\SsoClient\Http\Controllers\Admin\RoleAdminController;
use Omnify\SsoClient\Http\Controllers\Admin\TeamPermissionAdminController;
use Omnify\SsoClient\Http\Controllers\SsoCallbackController;
use Omnify\SsoClient\Http\Controllers\SsoTokenController;

/*
|--------------------------------------------------------------------------
| SSO Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the SsoClientServiceProvider.
|
*/

$prefix = config('sso-client.routes.prefix', 'api/sso');
$middleware = config('sso-client.routes.middleware', ['api']);
$adminPrefix = config('sso-client.routes.admin_prefix', 'api/admin/sso');
$adminMiddleware = config('sso-client.routes.admin_middleware', ['api', 'sso.auth', 'sso.org', 'sso.role:admin']);

// SSO Callback Route (no CSRF, no Sanctum stateful - called from Console server)
// コールバックはConsoleサーバーから呼ばれるため、CSRFとSanctum statefulは不要
Route::prefix($prefix)
    ->middleware(['api'])
    ->group(function () {
        Route::post('/callback', [SsoCallbackController::class, 'callback']);
    });

// SSO Auth Routes (with Sanctum stateful for SPA)
Route::prefix($prefix)
    ->middleware($middleware)
    ->group(function () {
        // Authenticated routes
        Route::middleware('sso.auth')->group(function () {
            Route::post('/logout', [SsoCallbackController::class, 'logout']);
            Route::get('/user', [SsoCallbackController::class, 'user']);
            Route::get('/global-logout-url', [SsoCallbackController::class, 'globalLogoutUrl']);

            // Token management (for mobile apps)
            Route::get('/tokens', [SsoTokenController::class, 'index']);
            Route::delete('/tokens/{tokenId}', [SsoTokenController::class, 'destroy']);
            Route::post('/tokens/revoke-others', [SsoTokenController::class, 'revokeOthers']);
        });
    });

// Admin Routes
Route::prefix($adminPrefix)
    ->middleware($adminMiddleware)
    ->group(function () {
        // Roles
        Route::apiResource('roles', RoleAdminController::class);
        Route::get('roles/{role}/permissions', [RoleAdminController::class, 'permissions']);
        Route::put('roles/{role}/permissions', [RoleAdminController::class, 'syncPermissions']);

        // Permissions
        Route::apiResource('permissions', PermissionAdminController::class);
        Route::get('permission-matrix', [PermissionAdminController::class, 'matrix']);

        // Team Permissions
        Route::get('teams/permissions', [TeamPermissionAdminController::class, 'index']);
        Route::get('teams/{teamId}/permissions', [TeamPermissionAdminController::class, 'show']);
        Route::put('teams/{teamId}/permissions', [TeamPermissionAdminController::class, 'sync']);
        Route::delete('teams/{teamId}/permissions', [TeamPermissionAdminController::class, 'destroy']);

        // Orphaned Team Permissions
        Route::get('teams/orphaned', [TeamPermissionAdminController::class, 'orphaned']);
        Route::post('teams/orphaned/{teamId}/restore', [TeamPermissionAdminController::class, 'restore']);
        Route::delete('teams/orphaned', [TeamPermissionAdminController::class, 'cleanupOrphaned']);
    });
