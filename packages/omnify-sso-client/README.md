# Omnify SSO Client

Laravel package for integrating with Omnify Console SSO.

## Features

- 🔐 SSO authentication via Omnify Console
- 👥 Role-based access control (RBAC)
- 🔑 Permission management with groups
- 👨‍👩‍👧‍👦 Team-based permissions
- 🔄 Auto-sync with Console organizations
- 📝 OpenAPI/Swagger documentation
- 🎯 Laravel Gates integration

## Installation

```bash
composer require omnify/sso-client
```

The package will automatically register its service provider.

## Setup

### 1. Run Install Command

```bash
php artisan sso:install
```

This will:
- Publish the config file for customization
- Optionally publish migrations for customization
- **Sync admin permissions to database**
- Guide you through setup

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
SSO_CONSOLE_URL=https://console.omnify.jp
SSO_SERVICE_SLUG=your-service-slug
```

### 4. Run Migrations

```bash
php artisan migrate
```

### 5. Sync Admin Permissions

```bash
# First time or after package update
php artisan sso:sync-permissions

# Force update existing permissions
php artisan sso:sync-permissions --force
```

## Omnify Schema Integration

If your project uses Omnify for schema-driven development, this package provides partial schemas that extend your User model with SSO fields.

### Register Schema Path

Add to `storage/omnify/schema-paths.json`:

```json
{
  "paths": [
    {
      "path": "./vendor/omnify/sso-client/database/schemas",
      "namespace": "Sso"
    }
  ]
}
```

Or for monorepo/local development:

```json
{
  "paths": [
    {
      "path": "./packages/omnify-sso-client/database/schemas",
      "namespace": "Sso"
    }
  ]
}
```

### Generate Migrations

```bash
npx omnify generate
```

The package provides these schemas:
- `Sso/User.yaml` - Partial schema extending User with SSO fields
- `Sso/Role.yaml` - Role model (hidden, uses package model)
- `Sso/Permission.yaml` - Permission model (hidden, uses package model)
- `Sso/Team.yaml` - Team model (hidden, uses package model)

> **Note:** Role, Permission, Team schemas have `hidden: true` so they don't generate models in your app. The package provides its own models with business logic.

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

### Using Laravel Gates

The package automatically registers a `Gate::before` hook for permission checking:

```php
use Illuminate\Support\Facades\Gate;

// In controllers
if (Gate::allows('service-admin.role.edit')) {
    // Can edit roles
}

// In Blade templates
@can('service-admin.permission.view')
    <a href="/admin/permissions">Permissions</a>
@endcan

// In policies
public function update(User $user, Role $role)
{
    return $user->hasPermission('service-admin.role.edit');
}
```

### Authorize in Controllers

```php
class RoleController extends Controller
{
    public function __construct()
    {
        $this->middleware('can:service-admin.role.view')->only(['index', 'show']);
        $this->middleware('can:service-admin.role.edit')->only(['update']);
        $this->middleware('can:service-admin.role.delete')->only(['destroy']);
    }
}
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

## Admin Permissions

The package provides pre-defined admin permissions with format `service-admin.{resource}.{action}`:

### Role Management
| Permission                            | Description                        |
| ------------------------------------- | ---------------------------------- |
| `service-admin.role.view`             | View roles list and details        |
| `service-admin.role.create`           | Create new roles                   |
| `service-admin.role.edit`             | Edit existing roles                |
| `service-admin.role.delete`           | Delete roles (except system roles) |
| `service-admin.role.sync-permissions` | Assign/remove permissions to roles |

### Permission Management
| Permission                        | Description                       |
| --------------------------------- | --------------------------------- |
| `service-admin.permission.view`   | View permissions list and details |
| `service-admin.permission.create` | Create new permissions            |
| `service-admin.permission.edit`   | Edit existing permissions         |
| `service-admin.permission.delete` | Delete permissions                |
| `service-admin.permission.matrix` | View role-permission matrix       |

### Team Management
| Permission                   | Description                                |
| ---------------------------- | ------------------------------------------ |
| `service-admin.team.view`    | View team permissions                      |
| `service-admin.team.edit`    | Assign/remove permissions to teams         |
| `service-admin.team.delete`  | Remove all permissions from a team         |
| `service-admin.team.cleanup` | View and cleanup orphaned team permissions |

### User Management
| Permission                       | Description                 |
| -------------------------------- | --------------------------- |
| `service-admin.user.view`        | View users list and details |
| `service-admin.user.create`      | Create new users            |
| `service-admin.user.edit`        | Edit existing users         |
| `service-admin.user.delete`      | Delete users                |
| `service-admin.user.assign-role` | Assign roles to users       |

### Default Roles

| Role      | Level | Permissions                         |
| --------- | ----- | ----------------------------------- |
| `admin`   | 100   | All 19 admin permissions            |
| `manager` | 50    | View + limited edit (8 permissions) |
| `member`  | 10    | No admin permissions                |

## Commands

```bash
# Install package (includes permission sync)
php artisan sso:install

# Sync admin permissions
php artisan sso:sync-permissions

# Force update existing permissions (after package update)
php artisan sso:sync-permissions --force

# Cleanup orphaned team permissions
php artisan sso:cleanup-orphan-teams

# Force hard delete old orphaned records
php artisan sso:cleanup-orphan-teams --force --older-than=30
```

## Upgrade Guide

After updating the package:

```bash
# Update composer
composer update omnify/sso-client

# Sync new permissions
php artisan sso:sync-permissions --force

# Run any new migrations
php artisan migrate
```

## OpenAPI/Swagger

All controllers have OpenAPI annotations. Generate Swagger docs:

```bash
php artisan l5-swagger:generate
```

API documentation will be available at `/api/documentation`.

## Testing

```bash
cd packages/omnify-sso-client
./vendor/bin/pest
```

## License

MIT
