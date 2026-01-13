# Omnify SSO Client

Laravel package for integrating with Omnify Console SSO.

## Installation

```bash
composer require omnify/sso-client
```

The package will automatically register its service provider.

## Setup

### 1. Run Install Command (Optional)

```bash
php artisan sso:install
```

This will:
- Publish the config file for customization
- Optionally publish migrations for customization
- Guide you through setup

> **Note:** The package works automatically after `composer require`. Migrations run from the package, routes are registered, middleware is available. The install command is for customization.

### 2. Add Traits to User Model

```php
use Omnify\SsoClient\Models\Traits\HasConsoleSso;
use Omnify\SsoClient\Models\Traits\HasTeamPermissions;

class User extends Authenticatable
{
    use HasConsoleSso, HasTeamPermissions;
    
    // ...
}
```

### 3. Configure Environment

```env
SSO_CONSOLE_URL=http://auth.test
SSO_SERVICE_SLUG=your-service-slug
```

### 4. Run Migrations

```bash
php artisan migrate
```

### 5. Seed Default Roles

```bash
php artisan db:seed --class=\\Omnify\\SsoClient\\Database\\Seeders\\SsoRolesSeeder
```

## Configuration

Publish and customize the config file:

```bash
php artisan vendor:publish --tag=sso-client-config
```

See `config/sso-client.php` for all available options.

## Usage

### Middleware

The package provides these middleware:

- `sso.auth` - Authenticate via Sanctum
- `sso.org` - Check organization access (requires X-Org-Id header)
- `sso.role:{role}` - Check minimum role level
- `sso.permission:{permission}` - Check specific permission

```php
Route::middleware(['sso.auth', 'sso.org'])->group(function () {
    Route::get('/projects', [ProjectController::class, 'index']);
    
    Route::middleware('sso.role:admin')->group(function () {
        Route::post('/settings', [SettingController::class, 'update']);
    });
    
    Route::middleware('sso.permission:projects.create')->group(function () {
        Route::post('/projects', [ProjectController::class, 'store']);
    });
});
```

### Check Permissions in Code

```php
// Check single permission
if ($user->hasPermission('projects.create', $orgId)) {
    // ...
}

// Check any permission
if ($user->hasAnyPermission(['projects.create', 'projects.update'], $orgId)) {
    // ...
}

// Check all permissions
if ($user->hasAllPermissions(['projects.view', 'reports.view'], $orgId)) {
    // ...
}

// Get all permissions
$permissions = $user->getAllPermissions($orgId);
```

### Console API Service

```php
use Omnify\SsoClient\Facades\SsoClient;

// Exchange SSO code for tokens
$tokens = SsoClient::exchangeCode($code);

// Get organizations
$orgs = SsoClient::getOrganizations($accessToken);

// Get user teams
$teams = SsoClient::getUserTeams($accessToken, $orgSlug);
```

## Routes

### Auth Routes (prefix: `/api/sso`)

| Method | URI            | Description              |
| ------ | -------------- | ------------------------ |
| POST   | `/callback`    | SSO callback handler     |
| POST   | `/logout`      | Logout user              |
| GET    | `/user`        | Get current user         |
| GET    | `/tokens`      | List API tokens (mobile) |
| DELETE | `/tokens/{id}` | Revoke token             |

### Admin Routes (prefix: `/api/admin/sso`)

Requires `sso.role:admin` middleware.

| Method | URI                       | Description           |
| ------ | ------------------------- | --------------------- |
| GET    | `/roles`                  | List roles            |
| POST   | `/roles`                  | Create role           |
| GET    | `/roles/{id}`             | Get role              |
| PUT    | `/roles/{id}`             | Update role           |
| DELETE | `/roles/{id}`             | Delete role           |
| GET    | `/roles/{id}/permissions` | Get role permissions  |
| PUT    | `/roles/{id}/permissions` | Sync role permissions |
| GET    | `/permissions`            | List permissions      |
| POST   | `/permissions`            | Create permission     |
| GET    | `/permissions/{id}`       | Get permission        |
| PUT    | `/permissions/{id}`       | Update permission     |
| DELETE | `/permissions/{id}`       | Delete permission     |
| GET    | `/permission-matrix`      | Get permission matrix |
| GET    | `/teams/permissions`      | List team permissions |
| PUT    | `/teams/{id}/permissions` | Sync team permissions |
| GET    | `/teams/orphaned`         | List orphaned teams   |
| DELETE | `/teams/orphaned`         | Cleanup orphaned      |

## Commands

```bash
# Install package
php artisan sso:install

# Cleanup orphaned team permissions
php artisan sso:cleanup-orphan-teams

# Force hard delete old orphaned records
php artisan sso:cleanup-orphan-teams --force --older-than=30
```

## License

MIT
