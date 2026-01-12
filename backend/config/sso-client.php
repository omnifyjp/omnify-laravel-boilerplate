<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Console Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for connecting to the Omnify Console SSO Provider.
    |
    */
    'console' => [
        'url' => env('SSO_CONSOLE_URL', 'http://auth.test'),
        'timeout' => env('SSO_CONSOLE_TIMEOUT', 10),
        'retry' => env('SSO_CONSOLE_RETRY', 2),
    ],

    /*
    |--------------------------------------------------------------------------
    | Service Configuration
    |--------------------------------------------------------------------------
    |
    | The service slug registered in Console for this application.
    |
    */
    'service' => [
        'slug' => env('SSO_SERVICE_SLUG', 'boilerplate'),
        'callback_url' => env('SSO_CALLBACK_URL', '/sso/callback'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cache Configuration
    |--------------------------------------------------------------------------
    |
    | Cache TTL settings for various SSO data.
    |
    */
    'cache' => [
        // JWKS cache TTL in minutes
        'jwks_ttl' => env('SSO_JWKS_CACHE_TTL', 60),

        // Organization access cache TTL in seconds
        'org_access_ttl' => env('SSO_ORG_ACCESS_CACHE_TTL', 300),

        // User teams cache TTL in seconds
        'user_teams_ttl' => env('SSO_USER_TEAMS_CACHE_TTL', 300),

        // Role permissions cache TTL in seconds
        'role_permissions_ttl' => env('SSO_ROLE_PERMISSIONS_CACHE_TTL', 3600),

        // Team permissions cache TTL in seconds
        'team_permissions_ttl' => env('SSO_TEAM_PERMISSIONS_CACHE_TTL', 3600),
    ],

    /*
    |--------------------------------------------------------------------------
    | Role Levels
    |--------------------------------------------------------------------------
    |
    | Role level hierarchy for role-based access control.
    | Higher level = more permissions.
    |
    */
    'role_levels' => [
        'admin' => 100,
        'manager' => 50,
        'member' => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Routes Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for package routes.
    |
    */
    'routes' => [
        // Route prefix for SSO routes
        'prefix' => 'api/sso',

        // Route prefix for admin routes
        'admin_prefix' => 'api/admin/sso',

        // Middleware for SSO routes
        'middleware' => ['api'],

        // Middleware for admin routes
        'admin_middleware' => ['api', 'sso.auth', 'sso.org', 'sso.role:admin'],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Model
    |--------------------------------------------------------------------------
    |
    | The user model class that implements HasConsoleSso trait.
    |
    */
    'user_model' => env('SSO_USER_MODEL', \App\Models\User::class),

    /*
    |--------------------------------------------------------------------------
    | Locale
    |--------------------------------------------------------------------------
    |
    | Send Accept-Language header to Console for localized responses.
    |
    */
    'locale' => [
        'enabled' => env('SSO_LOCALE_ENABLED', true),
        'header' => 'Accept-Language',
    ],
];
