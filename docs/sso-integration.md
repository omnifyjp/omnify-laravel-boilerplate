# SSO Integration Design

## Overview

Hệ thống SSO kết nối Service (boilerplate) với Console (auth.test).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONSOLE (auth.test)                            │
│                                                                             │
│   • SSO Provider (JWT RS256)                                                │
│   • User/Org/Team Management                                                │
│   • Source of truth cho Identity                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ SSO (JWT RS256)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE (boilerplate.app)                          │
│                                                                             │
│   ┌─────────────────────┐         ┌─────────────────────┐                  │
│   │     SERVICE FE      │         │     SERVICE BE      │                  │
│   │     (Next.js)       │  HTTP   │     (Laravel)       │                  │
│   │                     │◄───────▶│                     │                  │
│   │  • @omnify/sso-react│         │  • omnify/sso-client│                  │
│   │  • Sanctum Cookie   │         │  • Sanctum Auth     │                  │
│   │  • Org Selector     │         │  • User Sync        │                  │
│   └─────────────────────┘         └─────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Console APIs (Đã có sẵn)

| API                          | Mục đích                       |
| ---------------------------- | ------------------------------ |
| `POST /api/sso/token`        | Exchange SSO Code → Tokens     |
| `POST /api/sso/refresh`      | Refresh access token           |
| `POST /api/sso/revoke`       | Revoke token (logout)          |
| `GET /api/sso/access`        | Get user authorization cho org |
| `GET /api/sso/organizations` | List orgs user có access       |
| `GET /.well-known/jwks.json` | Public keys để verify JWT      |

## Console APIs (Cần implement thêm)

| API                  | Mục đích                   | Status    |
| -------------------- | -------------------------- | --------- |
| `GET /api/sso/teams` | Get user's teams trong org | ⏳ Pending |

---

## Authentication Flow

### Flow 1: Web/SPA Login (Cookie-based)

```
Browser          Service FE       Service BE        Console
   │                 │                 │                │
   │ (1) /login      │                 │                │
   │────────────────▶│                 │                │
   │                 │                 │                │
   │ (2) Redirect    │                 │                │
   │◀────────────────│                 │                │
   │  → Console SSO  │                 │                │
   │                 │                 │                │
   │ (3) Login at Console              │                │
   │───────────────────────────────────────────────────▶│
   │                 │                 │                │
   │ (4) Redirect with code            │                │
   │◀───────────────────────────────────────────────────│
   │                 │                 │                │
   │ (5) /sso/callback?code=xxx        │                │
   │────────────────▶│                 │                │
   │                 │                 │                │
   │                 │ (6) POST /api/sso/callback       │
   │                 │────────────────▶│                │
   │                 │                 │                │
   │                 │                 │ (7) Exchange code
   │                 │                 │───────────────▶│
   │                 │                 │                │
   │                 │                 │◀───────────────│
   │                 │                 │ {access_token, │
   │                 │                 │  refresh_token}│
   │                 │                 │                │
   │                 │                 │ (8) Verify JWT │
   │                 │                 │                │
   │                 │                 │ (9) Create/    │
   │                 │                 │ Update User    │
   │                 │                 │                │
   │                 │                 │ (10) Save      │
   │                 │                 │ Console tokens │
   │                 │                 │                │
   │                 │                 │ (11) Fetch orgs│
   │                 │                 │───────────────▶│
   │                 │                 │◀───────────────│
   │                 │                 │                │
   │                 │                 │ (12) Sanctum   │
   │                 │                 │ session        │
   │                 │                 │                │
   │                 │◀────────────────│                │
   │                 │ Set-Cookie      │                │
   │                 │ {user, orgs}    │                │
   │                 │                 │                │
   │◀────────────────│                 │                │
   │ Dashboard       │                 │                │
```

### Flow 2: Mobile App Login (Token-based)

```
Mobile App           Service BE        Console
   │                      │                │
   │ (1) WebView → Console SSO            │
   │─────────────────────────────────────▶│
   │                      │                │
   │ (2) Login, redirect with code        │
   │◀─────────────────────────────────────│
   │                      │                │
   │ (3) POST /api/sso/callback           │
   │─────────────────────▶│                │
   │  { code, device }    │                │
   │                      │                │
   │                      │ (4-11) Same    │
   │                      │                │
   │                      │ (12) Sanctum   │
   │                      │ API Token      │
   │                      │                │
   │◀─────────────────────│                │
   │ { token, user, orgs }│                │
   │                      │                │
   │ (13) Store in Keychain               │
```

### Flow 3: API Request with Org Access

```
Client           Service FE       Service BE        Console
   │                 │                 │                │
   │ Action          │                 │                │
   │────────────────▶│                 │                │
   │                 │                 │                │
   │                 │ GET /api/xxx    │                │
   │                 │────────────────▶│                │
   │                 │ Cookie/Token    │                │
   │                 │ X-Org-Id: abc   │                │
   │                 │                 │                │
   │                 │                 │ (1) Sanctum auth
   │                 │                 │                │
   │                 │                 │ (2) Cache check
   │                 │                 │ org_access:    │
   │                 │                 │ {uid}:{org}    │
   │                 │                 │                │
   │                 │                 │ [MISS]         │
   │                 │                 │                │
   │                 │                 │ (3) Check token
   │                 │                 │ expired?       │
   │                 │                 │ → Refresh      │
   │                 │                 │───────────────▶│
   │                 │                 │◀───────────────│
   │                 │                 │                │
   │                 │                 │ (4) Call Console
   │                 │                 │───────────────▶│
   │                 │                 │ GET /sso/access│
   │                 │                 │◀───────────────│
   │                 │                 │ {role}         │
   │                 │                 │                │
   │                 │                 │ (5) Cache 5min │
   │                 │                 │                │
   │                 │                 │ (6) Process    │
   │                 │                 │                │
   │                 │◀────────────────│                │
   │◀────────────────│                 │                │
```

### Flow 4: Switch Organization

```
Client           Service FE       Service BE
   │                 │                 │
   │ Select "XYZ"    │                 │
   │────────────────▶│                 │
   │                 │                 │
   │                 │ Update          │
   │                 │ localStorage    │
   │                 │ selectedOrg=xyz │
   │                 │                 │
   │                 │ GET /api/xxx    │
   │                 │────────────────▶│
   │                 │ X-Org-Id: xyz   │ ← Changed!
   │                 │                 │
   │                 │◀────────────────│
   │◀────────────────│                 │

※ KHÔNG cần login lại
※ KHÔNG cần token mới
※ Chỉ đổi X-Org-Id header
```

---

## Token Storage

### Service Database

```sql
-- users table
CREATE TABLE users (
    id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
    console_user_id             BIGINT UNIQUE NOT NULL,
    email                       VARCHAR(255) NOT NULL,
    name                        VARCHAR(100) NOT NULL,
    console_access_token        TEXT NULL,          -- encrypted
    console_refresh_token       TEXT NULL,          -- encrypted
    console_token_expires_at    TIMESTAMP NULL,
    created_at                  TIMESTAMP,
    updated_at                  TIMESTAMP
);

-- personal_access_tokens (Sanctum - Mobile)
-- → Laravel Sanctum tự tạo

-- sessions (Sanctum - Web)
-- → Laravel tự tạo
```

### Service Cache (Redis)

```
sso:jwks
→ JWKS từ Console
→ TTL: 60 phút

sso:org_access:{console_user_id}:{org_slug}
→ { service_role, org_role, ... }
→ TTL: 5 phút
```

### Frontend Storage

| Platform  | Storage           | Content                |
| --------- | ----------------- | ---------------------- |
| Web (SPA) | Cookie (HttpOnly) | Sanctum session        |
| Web (SPA) | localStorage      | selectedOrg, orgs list |
| Mobile    | Keychain/Keystore | Sanctum API token      |
| Mobile    | App State         | selectedOrg, orgs list |

---

## Token Summary

| Token                 | Thuộc về | Storage                       | Mục đích             |
| --------------------- | -------- | ----------------------------- | -------------------- |
| Console Access Token  | Console  | `users.console_access_token`  | Call Console API     |
| Console Refresh Token | Console  | `users.console_refresh_token` | Refresh access token |
| Sanctum Session       | Service  | `sessions` + Cookie           | Web auth             |
| Sanctum API Token     | Service  | `personal_access_tokens`      | Mobile auth          |
| JWKS                  | Console  | Redis cache                   | Verify JWT           |
| Org Access            | Service  | Redis cache                   | Authorization        |

---

## Laravel Package: `omnify/sso-client`

### Cấu trúc thư mục

```
packages/omnify-sso-client/
├── composer.json
├── config/sso-client.php
├── database/
│   ├── schemas/
│   │   └── Sso/
│   │       ├── UserSso.yaml           # partial → extend User
│   │       ├── Role.yaml              # global roles
│   │       ├── Permission.yaml        # global permissions
│   │       └── RolePermission.yaml    # pivot table
│   └── seeders/
│       └── SsoRolesSeeder.php         # default roles
├── src/
│   ├── SsoClientServiceProvider.php
│   ├── Facades/
│   │   └── Console.php                 # Facade for ConsoleApiService
│   ├── Console/
│   │   └── SsoInstallCommand.php
│   ├── Services/
│   │   ├── ConsoleApiService.php       # ← Wrap all Console API calls
│   │   ├── JwksService.php
│   │   ├── JwtVerifier.php
│   │   ├── ConsoleTokenService.php
│   │   └── OrgAccessService.php
│   ├── Exceptions/
│   │   ├── ConsoleApiException.php
│   │   ├── ConsoleAuthException.php
│   │   ├── ConsoleAccessDeniedException.php
│   │   ├── ConsoleNotFoundException.php
│   │   └── ConsoleServerException.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── SsoCallbackController.php
│   │   │   ├── SsoTokenController.php      # Mobile token management
│   │   │   ├── RoleAdminController.php     # Role CRUD + permissions
│   │   │   ├── PermissionAdminController.php
│   │   │   └── TeamPermissionAdminController.php
│   │   └── Middleware/
│   │       ├── SsoAuthenticate.php         # sso.auth
│   │       ├── SsoOrganizationAccess.php   # sso.org
│   │       ├── SsoRoleCheck.php            # sso.role:{role}
│   │       └── SsoPermissionCheck.php      # sso.permission:{perm}
│   ├── Models/
│   │   ├── Role.php
│   │   ├── Permission.php
│   │   ├── RolePermission.php
│   │   └── TeamPermission.php
│   │       └── Traits/
│   │           ├── HasConsoleSso.php
│   │           └── HasTeamPermissions.php
│   └── Cache/
│       ├── RolePermissionCache.php
│       ├── TeamPermissionCache.php
│       └── ConsoleTeamsCache.php
└── routes/
    └── sso.php
```

### Chi tiết từng component

#### SsoClientServiceProvider

Service provider auto-discovered - đăng ký tất cả services, middleware, routes và commands.

**Auto-configured (zero-config):**
- Đăng ký bindings cho các services (JwksService, JwtVerifier, etc.)
- Đăng ký middleware aliases: `sso.auth`, `sso.org`, `sso.role`, `sso.permission`
- Load routes từ `routes/sso.php` (callback route bypasses CSRF automatically)
- Load migrations từ package (không cần publish)
- Đăng ký command `sso:install` (optional, cho customization)
- Publish config file `sso-client.php` (optional)

#### SsoInstallCommand (`php artisan sso:install`) - Optional

Command để customize SSO setup (package works zero-config without this):

1. **Publish config**: Optional - config cho customization
2. **Publish migrations**: Optional - migrations run từ package automatically
3. **Detect Omnify schemas**: Tìm `omnify.config.ts` và schemas folder
4. **Hỏi chạy omnify generate**: Prompt user có muốn chạy `npx omnify generate` không
5. **Output hướng dẫn**: Hiển thị các bước tiếp theo (add trait vào User model, config .env)

> **Zero-Config:** Package hoạt động ngay sau `composer require` - migrations chạy từ vendor, routes tự động register, CSRF bypass đã configure.

#### JwksService

Service quản lý JWKS (JSON Web Key Set) từ Console:

- **getJwks()**: Fetch JWKS từ `{console_url}/.well-known/jwks.json`, cache kết quả với TTL từ config (default 60 phút)
- **getPublicKey(kid)**: Lấy public key theo key ID, convert từ JWK format sang PEM format
- **clearCache()**: Xóa cache JWKS khi cần force refresh

#### JwtVerifier

Service verify JWT từ Console:

- **verify(token)**: Parse JWT, lấy `kid` từ header, fetch public key từ JwksService, verify signature bằng RS256
- **getClaims(token)**: Trả về claims từ JWT đã verify (sub, email, name)
- Sử dụng `lcobucci/jwt` library (cùng version với Console)

#### ConsoleTokenService

Service quản lý Console tokens của user:

- **refreshIfNeeded(user)**: Kiểm tra `console_token_expires_at`, nếu sắp hết hạn (< 5 phút) thì gọi `POST /api/sso/refresh` để lấy token mới, update vào database
- **getAccessToken(user)**: Lấy access token, tự động refresh nếu cần
- **revokeTokens(user)**: Gọi `POST /api/sso/revoke` khi user logout
- Tokens được encrypt khi lưu vào database (dùng Laravel Crypt)

#### ConsoleApiService

Service wrapper để gọi tất cả Console APIs:

**Endpoints được wrap:**

| Method                            | Console API                  | Mô tả                        |
| --------------------------------- | ---------------------------- | ---------------------------- |
| `exchangeCode(code)`              | `POST /api/sso/token`        | Đổi SSO code lấy tokens      |
| `refreshToken(refreshToken)`      | `POST /api/sso/refresh`      | Refresh access token         |
| `revokeToken(refreshToken)`       | `POST /api/sso/revoke`       | Revoke refresh token         |
| `getAccess(accessToken, orgSlug)` | `GET /api/sso/access`        | Lấy authorization cho org    |
| `getOrganizations(accessToken)`   | `GET /api/sso/organizations` | List orgs user có access     |
| `getUserTeams(user, orgId)`       | `GET /api/sso/teams`         | Lấy teams của user trong org |
| `getJwks()`                       | `GET /.well-known/jwks.json` | Lấy JWKS                     |

**Chi tiết methods:**

```
exchangeCode(code: string): TokenResponse|null
─────────────────────────────────────────────
Input:
  - code: SSO code từ Console redirect

Process:
  1. POST {console_url}/api/sso/token
     Body: { code, service_slug }
  2. Parse response

Return:
  {
    access_token: string,
    refresh_token: string,
    expires_in: int (seconds)
  }
  hoặc null nếu failed


refreshToken(refreshToken: string): TokenResponse|null
──────────────────────────────────────────────────────
Input:
  - refreshToken: Console refresh token

Process:
  1. POST {console_url}/api/sso/refresh
     Body: { refresh_token }
  2. Parse response

Return:
  {
    access_token: string,
    refresh_token: string,     // Token mới (rotation)
    expires_in: int
  }
  hoặc null nếu failed


revokeToken(refreshToken: string): bool
───────────────────────────────────────
Input:
  - refreshToken: Console refresh token

Process:
  1. POST {console_url}/api/sso/revoke
     Body: { refresh_token }

Return: true nếu thành công


getAccess(accessToken: string, orgSlug: string): AccessResponse|null
────────────────────────────────────────────────────────────────────
Input:
  - accessToken: Console JWT
  - orgSlug: Organization slug

Process:
  1. GET {console_url}/api/sso/access?organization_slug={orgSlug}
     Headers: Authorization: Bearer {accessToken}

Return:
  {
    organization_id: int,
    organization_slug: string,
    org_role: string,
    service_role: string|null,
    service_role_level: int
  }
  hoặc null nếu không có quyền


getOrganizations(accessToken: string): array<OrganizationAccess>
────────────────────────────────────────────────────────────────
Input:
  - accessToken: Console JWT

Process:
  1. GET {console_url}/api/sso/organizations
     Headers: Authorization: Bearer {accessToken}

Return: Array of
  {
    organization_id: int,
    organization_slug: string,
    organization_name: string,
    org_role: string,
    service_role: string|null
  }


getUserTeams(user: User, orgId: int): array<Team>
─────────────────────────────────────────────────
Input:
  - user: User model (để lấy access token)
  - orgId: Organization ID từ Console

Process:
  1. Get access token từ user (auto refresh nếu cần)
  2. Get org slug từ cache/DB
  3. GET {console_url}/api/sso/teams?organization_slug={orgSlug}
     Headers: Authorization: Bearer {accessToken}

Return: Array of
  {
    id: int,           // Console team ID
    name: string,
    path: string|null,
    parent_id: int|null,
    is_leader: bool    // User có phải team leader không
  }

Caching:
  - Cache key: "sso:user_teams:{user_id}:{org_id}"
  - TTL: 5 minutes (teams có thể thay đổi)


getJwks(): array
────────────────
Process:
  1. GET {console_url}/.well-known/jwks.json
  2. Cache result (delegate to JwksService)

Return: JWKS array
```

**Error Handling:**

| HTTP Status | Exception                            |
| ----------- | ------------------------------------ |
| 400         | `ConsoleApiException` với error code |
| 401         | `ConsoleAuthException`               |
| 403         | `ConsoleAccessDeniedException`       |
| 404         | `ConsoleNotFoundException`           |
| 5xx         | `ConsoleServerException`             |

**Configuration:**

```php
// config/sso-client.php
'console' => [
    'url' => env('SSO_CONSOLE_URL'),
    'timeout' => env('SSO_CONSOLE_TIMEOUT', 10),
    'retry' => env('SSO_CONSOLE_RETRY', 2),
],
```

---

#### OrgAccessService

Service kiểm tra quyền truy cập organization:

- **checkAccess(user, orgSlug)**: Kiểm tra user có quyền access org không
  1. Check cache `sso:org_access:{console_user_id}:{org_slug}`
  2. Cache miss → lấy access token từ ConsoleTokenService → call `GET /api/sso/access?organization_slug={slug}`
  3. Cache result với TTL 5 phút
  4. Return `{allowed, org_role, service_role, service_role_level}`
- **getOrganizations(user)**: Lấy danh sách orgs user có access, call `GET /api/sso/organizations`
- **clearCache(user, orgSlug?)**: Xóa cache khi cần

#### SsoCallbackController

Controller xử lý SSO callback:

**POST /api/sso/callback**
- Input: `{code, device_name?}`
- Process:
  1. Gọi Console `POST /api/sso/token` với code và service_slug
  2. Nhận `{access_token, refresh_token, expires_in}`
  3. Verify JWT để lấy user info (sub, email, name)
  4. Tìm hoặc tạo User trong database theo `console_user_id`
  5. Lưu Console tokens vào user (encrypted)
  6. Fetch danh sách organizations từ Console
  7. Tạo Sanctum auth:
     - Web (không có device_name): `Auth::login($user)` → session cookie
     - Mobile (có device_name): `$user->createToken($device_name)` → API token
  8. Return `{user, organizations, token?}`

**POST /api/sso/logout**
- Revoke Console tokens
- Destroy Sanctum session/token
- Return success

#### SsoAuthenticate Middleware (`sso.auth`)

Middleware bọc Sanctum authentication:

- Tương đương `auth:sanctum` nhưng có thêm logic set request attributes
- Set `$request->ssoUser` với thông tin từ authenticated user
- Reject với 401 nếu chưa authenticated

#### SsoOrganizationAccess Middleware (`sso.org`)

Middleware kiểm tra organization access:

- Đọc `X-Org-Id` header từ request
- Reject với 400 nếu không có header
- Gọi OrgAccessService để kiểm tra quyền
- Reject với 403 nếu không có quyền
- Set request attributes: `$request->orgId`, `$request->orgSlug`, `$request->orgRole`, `$request->serviceRole`

#### SsoRoleCheck Middleware (`sso.role:{role}`)

Middleware kiểm tra role tối thiểu:

- Parameter: role name (admin, manager, member, etc.)
- Kiểm tra `$request->serviceRole` có >= role yêu cầu không
- Role levels được define trong config
- Reject với 403 nếu role không đủ

#### SsoPermissionCheck Middleware (`sso.permission:{permission}`)

Middleware kiểm tra permission cụ thể:

- Parameter: permission slug (e.g., `projects.create`)
- Kiểm tra user có permission qua Role HOẶC Team
- Sử dụng `$user->hasPermission($permission, $orgId)`
- Reject với 403 nếu không có permission

**Usage:**
```php
Route::middleware(['sso.auth', 'sso.org', 'sso.permission:projects.create'])
    ->post('/projects', [ProjectController::class, 'store']);

// Multiple permissions (OR logic)
Route::middleware(['sso.auth', 'sso.org', 'sso.permission:projects.update|projects.manage'])
    ->put('/projects/{id}', [ProjectController::class, 'update']);
```

---

## Omnify Schema Integration

### Package Schema Registration

```php
// SsoClientServiceProvider.php
public function boot(): void
{
    if (class_exists(\Omnify\Omnify::class)) {
        \Omnify\Omnify::addSchemaPath(__DIR__.'/../database/schemas');
    }
}
```

### Package Schemas

```
packages/omnify-sso-client/
└── database/
    └── schemas/
        └── Sso/
            ├── UserSso.yaml          # partial → extend User
            ├── Role.yaml             # global roles
            ├── Permission.yaml       # global permissions
            ├── RolePermission.yaml   # pivot: role ↔ permission
            └── TeamPermission.yaml   # team-based permissions (soft delete)
```

### UserSso.yaml (Partial Schema)

```yaml
kind: partial
target: User

properties:
  console_user_id:
    type: UnsignedBigInteger
    unique: true
    displayName:
      ja: Console User ID
      en: Console User ID
  console_access_token:
    type: Text
    nullable: true
    displayName:
      ja: Console Access Token
      en: Console Access Token
  console_refresh_token:
    type: Text
    nullable: true
    displayName:
      ja: Console Refresh Token
      en: Console Refresh Token
  console_token_expires_at:
    type: Timestamp
    nullable: true
    displayName:
      ja: Console Token有効期限
      en: Console Token Expires At
```

### Role.yaml (Global - No org_id)

```yaml
displayName:
  ja: ロール
  en: Role
options:
  timestamps: true
properties:
  slug:
    type: String
    length: 50
    unique: true
    displayName:
      ja: スラッグ
      en: Slug
  display_name:
    type: String
    length: 100
    displayName:
      ja: 表示名
      en: Display Name
  level:
    type: Integer
    default: 0
    displayName:
      ja: レベル
      en: Level
  description:
    type: Text
    nullable: true
    displayName:
      ja: 説明
      en: Description
relationships:
  permissions:
    type: BelongsToMany
    model: Permission
    pivot: role_permissions
```

### Permission.yaml (Global - No org_id)

```yaml
displayName:
  ja: 権限
  en: Permission
options:
  timestamps: true
properties:
  slug:
    type: String
    length: 100
    unique: true
    displayName:
      ja: スラッグ
      en: Slug
  display_name:
    type: String
    length: 100
    displayName:
      ja: 表示名
      en: Display Name
  group:
    type: String
    length: 50
    nullable: true
    index: true
    displayName:
      ja: グループ
      en: Group
  description:
    type: Text
    nullable: true
    displayName:
      ja: 説明
      en: Description
relationships:
  roles:
    type: BelongsToMany
    model: Role
    pivot: role_permissions
```

### RolePermission.yaml (Pivot)

```yaml
displayName:
  ja: ロール権限
  en: Role Permission
options:
  timestamps: false
properties:
  role_id:
    type: UnsignedBigInteger
  permission_id:
    type: UnsignedBigInteger
indexes:
  primary:
    columns: [role_id, permission_id]
    unique: true
relationships:
  role:
    type: BelongsTo
    model: Role
  permission:
    type: BelongsTo
    model: Permission
```

---

## Role & Permission System

### Relationship với Console

```
┌─────────────────────────────────────────────────────────────────┐
│                         CONSOLE                                 │
├─────────────────────────────────────────────────────────────────┤
│  service_roles (định nghĩa roles cho service)                   │
│  ├── admin (level: 100)                                         │
│  ├── manager (level: 50)                                        │
│  └── member (level: 10)                                         │
│                                                                 │
│  User assignments (per org)                                     │
│  └── User X in Org ABC → service_role: "admin"                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ service_role string
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVICE                                 │
├─────────────────────────────────────────────────────────────────┤
│  roles table (map 1:1 with Console service_role)                │
│  ├── slug: "admin" → permissions: [all]                         │
│  ├── slug: "manager" → permissions: [projects.*, reports.*]     │
│  └── slug: "member" → permissions: [projects.view]              │
│                                                                 │
│  permissions table                                              │
│  ├── projects.create                                            │
│  ├── projects.update                                            │
│  ├── projects.delete                                            │
│  ├── projects.view                                              │
│  └── ...                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Authorization Flow

```
Request với X-Org-Id: abc
        ↓
Console trả về: service_role = "admin"
        ↓
Service lookup: Role::where('slug', 'admin')->first()
        ↓
Check: $role->permissions->contains('slug', 'projects.delete')
        ↓
Allow/Deny
```

### Default Roles Seeder

Package cung cấp seeder với default roles mapping Console service_roles:

```php
// database/seeders/SsoRolesSeeder.php
public function run(): void
{
    $roles = [
        [
            'slug' => 'admin',
            'display_name' => 'Administrator',
            'level' => 100,
            'description' => 'Full access to all features',
        ],
        [
            'slug' => 'manager', 
            'display_name' => 'Manager',
            'level' => 50,
            'description' => 'Can manage most features',
        ],
        [
            'slug' => 'member',
            'display_name' => 'Member',
            'level' => 10,
            'description' => 'Basic access',
        ],
    ];

    foreach ($roles as $role) {
        Role::updateOrCreate(
            ['slug' => $role['slug']],
            $role
        );
    }
}
```

### Permission Check trong Code

```php
// Middleware check
Route::middleware(['sso.auth', 'sso.org', 'sso.can:projects.delete'])
    ->delete('/projects/{id}', [ProjectController::class, 'destroy']);

// Manual check trong controller
public function destroy(Request $request, $id)
{
    // $request->serviceRole = "admin" (từ Console)
    $role = Role::where('slug', $request->serviceRole)->first();
    
    if (!$role->hasPermission('projects.delete')) {
        abort(403, 'Permission denied');
    }
    
    // ...
}

// Hoặc dùng helper
if ($request->can('projects.delete')) {
    // ...
}
```

### Trait: HasPermissions (cho Role model)

```php
trait HasPermissions
{
    public function hasPermission(string $permission): bool
    {
        return $this->permissions()
            ->where('slug', $permission)
            ->exists();
    }
    
    public function hasAnyPermission(array $permissions): bool
    {
        return $this->permissions()
            ->whereIn('slug', $permissions)
            ->exists();
    }
    
    public function hasAllPermissions(array $permissions): bool
    {
        return $this->permissions()
            ->whereIn('slug', $permissions)
            ->count() === count($permissions);
    }
}
```

---

## Role & Permission Administration

### Admin Routes

Package cung cấp routes cho quản trị roles/permissions:

```
Routes (prefix: /api/admin/sso):

Roles:
  GET    /roles                    → List all roles
  POST   /roles                    → Create role
  GET    /roles/{id}               → Get role detail
  PUT    /roles/{id}               → Update role
  DELETE /roles/{id}               → Delete role (nếu không phải system role)
  GET    /roles/{id}/permissions   → Get role's permissions
  PUT    /roles/{id}/permissions   → Sync role's permissions

Permissions:
  GET    /permissions              → List all permissions (grouped)
  POST   /permissions              → Create permission
  GET    /permissions/{id}         → Get permission detail
  PUT    /permissions/{id}         → Update permission
  DELETE /permissions/{id}         → Delete permission
```

### Controllers

#### RoleAdminController

```
GET /api/admin/sso/roles
────────────────────────
Response:
{
  "data": [
    {
      "id": 1,
      "slug": "admin",
      "display_name": "Administrator",
      "level": 100,
      "description": "Full access",
      "is_system": true,
      "permissions_count": 15,
      "created_at": "..."
    },
    ...
  ]
}


POST /api/admin/sso/roles
─────────────────────────
Request:
{
  "slug": "supervisor",
  "display_name": "Supervisor",
  "level": 75,
  "description": "Can supervise teams"
}

Response: Created role


PUT /api/admin/sso/roles/{id}
─────────────────────────────
Request:
{
  "display_name": "Updated Name",
  "level": 80,
  "description": "Updated description"
}

Note: slug không thể thay đổi sau khi tạo


DELETE /api/admin/sso/roles/{id}
────────────────────────────────
- Không thể xóa system roles (admin, manager, member)
- Không thể xóa nếu role đang được sử dụng ở Console

Response: 204 No Content hoặc 422 nếu không thể xóa


GET /api/admin/sso/roles/{id}/permissions
─────────────────────────────────────────
Response:
{
  "role": { "id": 1, "slug": "admin", ... },
  "permissions": [
    { "id": 1, "slug": "projects.create", "group": "projects" },
    { "id": 2, "slug": "projects.update", "group": "projects" },
    ...
  ]
}


PUT /api/admin/sso/roles/{id}/permissions
─────────────────────────────────────────
Request:
{
  "permissions": [1, 2, 3, 5, 8]  // Permission IDs to sync
}

hoặc:
{
  "permissions": ["projects.create", "projects.update", "reports.view"]  // Permission slugs
}

Response:
{
  "message": "Permissions synced",
  "attached": 2,
  "detached": 1
}
```

#### PermissionAdminController

```
GET /api/admin/sso/permissions
──────────────────────────────
Query params:
  - group: filter by group
  - search: search in slug/display_name

Response:
{
  "data": [
    {
      "id": 1,
      "slug": "projects.create",
      "display_name": "Create Projects",
      "group": "projects",
      "description": "...",
      "roles_count": 2
    },
    ...
  ],
  "groups": ["projects", "reports", "settings", "users"]
}


GET /api/admin/sso/permissions?grouped=true
───────────────────────────────────────────
Response (grouped by group):
{
  "projects": [
    { "id": 1, "slug": "projects.create", ... },
    { "id": 2, "slug": "projects.update", ... },
    { "id": 3, "slug": "projects.delete", ... },
    { "id": 4, "slug": "projects.view", ... }
  ],
  "reports": [
    { "id": 5, "slug": "reports.view", ... },
    { "id": 6, "slug": "reports.export", ... }
  ],
  ...
}


POST /api/admin/sso/permissions
───────────────────────────────
Request:
{
  "slug": "projects.archive",
  "display_name": "Archive Projects",
  "group": "projects",
  "description": "Can archive completed projects"
}

Response: Created permission


PUT /api/admin/sso/permissions/{id}
───────────────────────────────────
Request:
{
  "display_name": "Updated Name",
  "group": "new-group",
  "description": "Updated description"
}

Note: slug không thể thay đổi


DELETE /api/admin/sso/permissions/{id}
──────────────────────────────────────
- Tự động detach từ tất cả roles
- Response: 204 No Content
```

### Permission Matrix UI

Package có thể cung cấp data cho Permission Matrix UI:

```
GET /api/admin/sso/permission-matrix
────────────────────────────────────
Response:
{
  "roles": [
    { "id": 1, "slug": "admin", "display_name": "Administrator" },
    { "id": 2, "slug": "manager", "display_name": "Manager" },
    { "id": 3, "slug": "member", "display_name": "Member" }
  ],
  "permissions": {
    "projects": [
      { "id": 1, "slug": "projects.create", "display_name": "Create" },
      { "id": 2, "slug": "projects.update", "display_name": "Update" },
      { "id": 3, "slug": "projects.delete", "display_name": "Delete" },
      { "id": 4, "slug": "projects.view", "display_name": "View" }
    ],
    "reports": [...]
  },
  "matrix": {
    "admin": ["projects.create", "projects.update", "projects.delete", "projects.view", ...],
    "manager": ["projects.create", "projects.update", "projects.view", ...],
    "member": ["projects.view"]
  }
}
```

**UI có thể render:**
```
                    │ admin │ manager │ member │
────────────────────┼───────┼─────────┼────────┤
Projects            │       │         │        │
  • Create          │  ✓    │   ✓     │        │
  • Update          │  ✓    │   ✓     │        │
  • Delete          │  ✓    │         │        │
  • View            │  ✓    │   ✓     │   ✓    │
────────────────────┼───────┼─────────┼────────┤
Reports             │       │         │        │
  • View            │  ✓    │   ✓     │   ✓    │
  • Export          │  ✓    │   ✓     │        │
```

### Middleware Protection

Admin routes cần được protect:

```php
// routes trong package
Route::middleware(['sso.auth', 'sso.org', 'sso.role:admin'])
    ->prefix('api/admin/sso')
    ->group(function () {
        Route::apiResource('roles', RoleAdminController::class);
        Route::get('roles/{role}/permissions', [RoleAdminController::class, 'permissions']);
        Route::put('roles/{role}/permissions', [RoleAdminController::class, 'syncPermissions']);
        
        Route::apiResource('permissions', PermissionAdminController::class);
        Route::get('permission-matrix', [PermissionAdminController::class, 'matrix']);
    });
```

### Seeder: Default Permissions

Package cung cấp base permissions seeder, app có thể extend:

```php
// database/seeders/SsoPermissionsSeeder.php
public function run(): void
{
    $permissions = [
        // Group: users
        ['slug' => 'users.view', 'display_name' => 'View Users', 'group' => 'users'],
        ['slug' => 'users.create', 'display_name' => 'Create Users', 'group' => 'users'],
        ['slug' => 'users.update', 'display_name' => 'Update Users', 'group' => 'users'],
        ['slug' => 'users.delete', 'display_name' => 'Delete Users', 'group' => 'users'],
        
        // Group: roles (admin only)
        ['slug' => 'roles.view', 'display_name' => 'View Roles', 'group' => 'roles'],
        ['slug' => 'roles.manage', 'display_name' => 'Manage Roles', 'group' => 'roles'],
        
        // App cần define thêm permissions cho business logic
    ];

    foreach ($permissions as $perm) {
        Permission::updateOrCreate(
            ['slug' => $perm['slug']],
            $perm
        );
    }

    // Default role-permission mapping
    $this->assignDefaultPermissions();
}

private function assignDefaultPermissions(): void
{
    $admin = Role::where('slug', 'admin')->first();
    $manager = Role::where('slug', 'manager')->first();
    $member = Role::where('slug', 'member')->first();

    // Admin gets all
    $admin?->permissions()->sync(Permission::pluck('id'));

    // Manager gets most
    $manager?->permissions()->sync(
        Permission::whereNotIn('slug', ['users.delete', 'roles.manage'])
            ->pluck('id')
    );

    // Member gets view only
    $member?->permissions()->sync(
        Permission::where('slug', 'like', '%.view')->pluck('id')
    );
}
```

### App Custom Permissions

App có thể define thêm permissions riêng:

```php
// App's database/seeders/PermissionsSeeder.php
public function run(): void
{
    // Run package seeder first
    $this->call(SsoPermissionsSeeder::class);

    // Add app-specific permissions
    $appPermissions = [
        ['slug' => 'projects.create', 'display_name' => 'Create Projects', 'group' => 'projects'],
        ['slug' => 'projects.update', 'display_name' => 'Update Projects', 'group' => 'projects'],
        ['slug' => 'projects.delete', 'display_name' => 'Delete Projects', 'group' => 'projects'],
        ['slug' => 'projects.view', 'display_name' => 'View Projects', 'group' => 'projects'],
        ['slug' => 'projects.archive', 'display_name' => 'Archive Projects', 'group' => 'projects'],
        
        ['slug' => 'reports.view', 'display_name' => 'View Reports', 'group' => 'reports'],
        ['slug' => 'reports.export', 'display_name' => 'Export Reports', 'group' => 'reports'],
        
        // ... more app permissions
    ];

    foreach ($appPermissions as $perm) {
        Permission::updateOrCreate(['slug' => $perm['slug']], $perm);
    }

    // Custom role-permission mapping
    $this->assignAppPermissions();
}
```

### Caching

Role-Permission relationships được cache để tăng performance:

```php
// RolePermissionCache
class RolePermissionCache
{
    private const CACHE_KEY = 'sso:role_permissions';
    private const TTL = 3600; // 1 hour

    public static function get(string $roleSlug): array
    {
        return Cache::remember(
            self::CACHE_KEY . ':' . $roleSlug,
            self::TTL,
            fn () => Role::where('slug', $roleSlug)
                ->first()
                ?->permissions()
                ->pluck('slug')
                ->toArray() ?? []
        );
    }

    public static function clear(?string $roleSlug = null): void
    {
        if ($roleSlug) {
            Cache::forget(self::CACHE_KEY . ':' . $roleSlug);
        } else {
            // Clear all role caches
            foreach (Role::pluck('slug') as $slug) {
                Cache::forget(self::CACHE_KEY . ':' . $slug);
            }
        }
    }
}

// Auto clear cache when role-permission changes
// In RoleAdminController::syncPermissions()
RolePermissionCache::clear($role->slug);
```

---

## Team-based Permissions

Service hỗ trợ assign permissions cho Teams (từ Console), không chỉ Roles.

### Console API: GET /api/sso/teams

**Yêu cầu Console implement endpoint mới:**

```
GET /api/sso/teams?organization_slug=xxx
Authorization: Bearer {console_access_token}

Response:
{
  "teams": [
    {
      "id": 1,
      "name": "Dev Team",
      "path": "/engineering/dev",
      "parent_id": null,
      "is_leader": true
    },
    {
      "id": 2,
      "name": "QA Team", 
      "path": "/engineering/qa",
      "parent_id": null,
      "is_leader": false
    }
  ]
}
```

### Database Schema

```yaml
# TeamPermission.yaml (trong package)
TeamPermission:
  tableName: team_permissions
  primaryKey: id
  timestamps: true
  softDeletes: true          # ← Soft delete support
  
  properties:
    console_team_id:
      type: integer
      required: true
      description: "Team ID from Console"
    
    console_org_id:
      type: integer
      required: true
      description: "Organization ID from Console (for scoping)"
    
    permission_id:
      type: integer
      required: true
      relation:
        model: Permission
        type: belongsTo
  
  indexes:
    - columns: [console_team_id, permission_id]
      unique: true
    - columns: [console_org_id]
    - columns: [deleted_at]    # ← Index for soft delete queries
```

**Soft Delete Flow:**
```
Console xóa Team A
       │
       ↓
Service detect Team A không còn trong Console API
       │
       ↓
Admin vào Team Permissions page
       │
       ↓
Show: "Team A (orphaned) - 3 permissions" [Restore] [Delete Permanently]
       │
       ├── Click [Restore]: Chờ Console khôi phục team
       │                    Permissions vẫn còn (soft deleted)
       │
       └── Click [Delete Permanently]: Hard delete, không thể khôi phục
```

### Permission Check Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION CHECK WITH TEAMS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Request → Middleware sso.permission:projects.create                │
│                                                                          │
│  Step 1: Get user's role permissions                                     │
│  ─────────────────────────────────────────────────────────────────────  │
│  $rolePermissions = RolePermissionCache::get($user->service_role);       │
│  // ['projects.view', 'reports.view']                                   │
│                                                                          │
│  Step 2: Get user's teams from Console (cached)                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  $teams = ConsoleApiService::getUserTeams($orgSlug);                    │
│  // Cache key: "sso:user_teams:{user_id}:{org_id}"                      │
│  // [{ id: 1, name: "Dev Team" }, { id: 2, name: "QA Team" }]           │
│                                                                          │
│  Step 3: Get team permissions                                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  $teamIds = collect($teams)->pluck('id');                               │
│  $teamPermissions = TeamPermissionCache::getForTeams($teamIds);         │
│  // ['projects.create', 'projects.update']                              │
│                                                                          │
│  Step 4: Merge all permissions                                           │
│  ─────────────────────────────────────────────────────────────────────  │
│  $allPermissions = array_unique([                                       │
│      ...$rolePermissions,                                               │
│      ...$teamPermissions                                                │
│  ]);                                                                    │
│  // ['projects.view', 'reports.view', 'projects.create', 'projects.update']
│                                                                          │
│  Step 5: Check permission                                                │
│  ─────────────────────────────────────────────────────────────────────  │
│  return in_array('projects.create', $allPermissions);  // true ✓        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### HasTeamPermissions Trait

```php
trait HasTeamPermissions
{
    /**
     * Get all permissions for user (role + teams)
     */
    public function getAllPermissions(?int $orgId = null): array
    {
        $orgId = $orgId ?? session('current_org_id');
        
        // 1. Role permissions
        $rolePermissions = RolePermissionCache::get($this->service_role);
        
        // 2. Team permissions
        $teamPermissions = $this->getTeamPermissions($orgId);
        
        return array_unique([...$rolePermissions, ...$teamPermissions]);
    }
    
    /**
     * Get team permissions for user in organization
     */
    public function getTeamPermissions(int $orgId): array
    {
        // Get user's teams from Console (cached)
        $teams = $this->getConsolTeams($orgId);
        
        if (empty($teams)) {
            return [];
        }
        
        $teamIds = collect($teams)->pluck('id')->toArray();
        
        return TeamPermissionCache::getForTeams($teamIds, $orgId);
    }
    
    /**
     * Check if user has permission (via role OR team)
     */
    public function hasPermission(string $permission, ?int $orgId = null): bool
    {
        return in_array($permission, $this->getAllPermissions($orgId));
    }
    
    /**
     * Get user's teams from Console (cached)
     */
    public function getConsoleTeams(int $orgId): array
    {
        $cacheKey = "sso:user_teams:{$this->id}:{$orgId}";
        
        return Cache::remember($cacheKey, 300, function () use ($orgId) {
            return app(ConsoleApiService::class)
                ->getUserTeams($this, $orgId);
        });
    }
}
```

### Team Permission Admin Routes

```
Routes (prefix: /api/admin/sso/teams):

GET    /teams/permissions                     → List teams with their permissions
GET    /teams/{consoleTeamId}/permissions     → Get specific team's permissions  
PUT    /teams/{consoleTeamId}/permissions     → Sync team's permissions
DELETE /teams/{consoleTeamId}/permissions     → Soft delete team's permissions

GET    /teams/orphaned                        → List orphaned team permissions (soft deleted)
POST   /teams/orphaned/{consoleTeamId}/restore → Restore orphaned team permissions
DELETE /teams/orphaned                        → Hard delete orphaned permissions (permanent)
```

### TeamPermissionAdminController

```
GET /api/admin/sso/teams/permissions
────────────────────────────────────
Query params:
  - org_id: required (X-Org-Id header)

Flow:
  1. Fetch teams from Console API
  2. Get team_permissions from DB
  3. Merge data

Response:
{
  "teams": [
    {
      "console_team_id": 1,
      "name": "Dev Team",
      "path": "/engineering/dev",
      "permissions": [
        { "id": 5, "slug": "projects.create" },
        { "id": 6, "slug": "projects.update" }
      ]
    },
    {
      "console_team_id": 2,
      "name": "QA Team",
      "permissions": [
        { "id": 10, "slug": "testing.execute" }
      ]
    }
  ]
}


PUT /api/admin/sso/teams/{consoleTeamId}/permissions
────────────────────────────────────────────────────
Request:
{
  "permissions": [1, 2, 3, 5]  // Permission IDs
}

hoặc:
{
  "permissions": ["projects.create", "projects.update"]  // Permission slugs
}

Response:
{
  "message": "Team permissions synced",
  "console_team_id": 1,
  "attached": 2,
  "detached": 1
}


DELETE /api/admin/sso/teams/{consoleTeamId}/permissions
───────────────────────────────────────────────────────
- Remove all permissions for this team
- Response: 204 No Content
```

### Orphaned Team Permissions (Soft Delete)

```
GET /api/admin/sso/teams/orphaned
─────────────────────────────────
Flow:
  1. Get all distinct console_team_id from team_permissions (including soft deleted)
  2. Fetch current teams from Console API
  3. Find team_ids that exist in DB but not in Console
  4. Auto soft-delete permissions của orphaned teams (nếu chưa deleted)

Response:
{
  "orphaned_teams": [
    {
      "console_team_id": 99,
      "permissions_count": 3,
      "permissions": ["old.permission1", "old.permission2", "old.permission3"],
      "deleted_at": "2026-01-13T10:00:00Z"   // Soft deleted time
    }
  ],
  "total_orphaned_permissions": 3
}


POST /api/admin/sso/teams/orphaned/{consoleTeamId}/restore
──────────────────────────────────────────────────────────
- Restore soft-deleted permissions cho team
- Use case: Console khôi phục team đã xóa

Response:
{
  "message": "Team permissions restored",
  "console_team_id": 99,
  "restored_count": 3
}


DELETE /api/admin/sso/teams/orphaned
────────────────────────────────────
- HARD DELETE all soft-deleted team_permissions (permanent!)
- Query params:
  - console_team_id: (optional) chỉ xóa team cụ thể
  - older_than_days: (optional, default: 30) chỉ xóa records đã soft-delete > N ngày

Response:
{
  "message": "Orphaned team permissions permanently deleted",
  "deleted_count": 3
}
```

### Artisan Command: Cleanup Orphans

```bash
# Soft delete orphaned teams
php artisan sso:cleanup-orphan-teams

# Output:
# Checking organization: Acme Corp (ID: 1)
#   Found 2 orphaned teams with 5 permissions
#   Soft deleted.
# Checking organization: Beta Inc (ID: 2)
#   No orphaned teams found.
# 
# Total soft deleted: 5 permissions from 2 teams

# Hard delete (permanent) - only records soft deleted > 30 days ago
php artisan sso:cleanup-orphan-teams --force --older-than=30

# Output:
# Permanently deleted 3 permissions from 1 team (soft deleted > 30 days)
```

### Admin UI: Team Permission Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Team Permission Management                              [Organization ▼]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⚠️ 1 orphaned team found (permissions are soft-deleted, can restore)   │
│     └─ Team ID: 99 - 3 permissions (deleted 5 days ago)                 │
│        [Restore] [Delete Permanently]                                    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Teams from Console:                                                     │
│  ┌──────────────┬────────────────────────────────────────────┬────────┐ │
│  │ Team         │ Permissions                                │ Action │ │
│  ├──────────────┼────────────────────────────────────────────┼────────┤ │
│  │ Dev Team     │ projects.create, projects.update           │ [Edit] │ │
│  │ QA Team      │ testing.execute, testing.view              │ [Edit] │ │
│  │ Management   │ reports.*, settings.view                   │ [Edit] │ │
│  │ Support      │ (no permissions)                           │ [Edit] │ │
│  └──────────────┴────────────────────────────────────────────┴────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Edit Permissions: Dev Team                                    [Cancel] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Projects                          Reports                               │
│  ┌───────────────────────────┐    ┌───────────────────────────┐         │
│  │ [✓] projects.create       │    │ [ ] reports.view          │         │
│  │ [✓] projects.update       │    │ [ ] reports.export        │         │
│  │ [ ] projects.delete       │    │ [ ] reports.create        │         │
│  │ [ ] projects.view         │    └───────────────────────────┘         │
│  │ [ ] projects.archive      │                                          │
│  └───────────────────────────┘    Settings                               │
│                                    ┌───────────────────────────┐         │
│  Testing                           │ [ ] settings.view         │         │
│  ┌───────────────────────────┐    │ [ ] settings.update       │         │
│  │ [ ] testing.execute       │    └───────────────────────────┘         │
│  │ [ ] testing.view          │                                          │
│  └───────────────────────────┘                          [Save Changes]  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Caching: Team Permissions

```php
class TeamPermissionCache
{
    private const CACHE_KEY = 'sso:team_permissions';
    private const TTL = 3600; // 1 hour

    /**
     * Get permissions for multiple teams
     * Note: TeamPermission model uses SoftDeletes trait,
     *       so soft-deleted records are automatically excluded
     */
    public static function getForTeams(array $teamIds, int $orgId): array
    {
        if (empty($teamIds)) {
            return [];
        }
        
        $cacheKey = self::CACHE_KEY . ':' . $orgId . ':' . md5(implode(',', $teamIds));
        
        return Cache::remember($cacheKey, self::TTL, function () use ($teamIds, $orgId) {
            // SoftDeletes trait auto-excludes deleted_at IS NOT NULL
            return TeamPermission::query()
                ->where('console_org_id', $orgId)
                ->whereIn('console_team_id', $teamIds)
                ->with('permission')
                ->get()
                ->pluck('permission.slug')
                ->unique()
                ->toArray();
        });
    }

    /**
     * Clear cache for team
     */
    public static function clearForTeam(int $teamId, int $orgId): void
    {
        // Clear all caches containing this team
        // In practice, may need to use cache tags or broader clear
        Cache::flush(); // Simplified - use tags in production
    }
    
    /**
     * Clear all team permission caches for org
     */
    public static function clearForOrg(int $orgId): void
    {
        // Clear all team-related caches for this org
    }
}
```

### Console Teams Cache (User-level)

```php
class ConsoleTeamsCache
{
    private const CACHE_KEY = 'sso:user_teams';
    private const TTL = 300; // 5 minutes (shorter TTL as teams can change)

    public static function get(int $userId, int $orgId): ?array
    {
        return Cache::get(self::CACHE_KEY . ":{$userId}:{$orgId}");
    }

    public static function set(int $userId, int $orgId, array $teams): void
    {
        Cache::put(
            self::CACHE_KEY . ":{$userId}:{$orgId}",
            $teams,
            self::TTL
        );
    }

    public static function clear(int $userId, ?int $orgId = null): void
    {
        if ($orgId) {
            Cache::forget(self::CACHE_KEY . ":{$userId}:{$orgId}");
        } else {
            // Clear all org caches for user
            // Requires cache tags or pattern-based clearing
        }
    }
}
```

### Updated Middleware: CheckPermission

```php
class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        $user = $request->user();
        
        if (!$user) {
            abort(401);
        }
        
        $orgId = $request->header('X-Org-Id');
        
        // Check permission (role + team combined)
        if (!$user->hasPermission($permission, $orgId)) {
            abort(403, "Permission denied: {$permission}");
        }
        
        return $next($request);
    }
}
```

---

#### HasConsoleSso Trait

Trait thêm vào User model:

- Define các columns: `console_user_id`, `console_access_token`, `console_refresh_token`, `console_token_expires_at`
- Attribute casting: `console_access_token` và `console_refresh_token` được encrypt
- **scopeByConsoleUserId($query, $id)**: Query scope tìm user theo console_user_id
- **getConsoleAccessToken()**: Decrypt và return access token
- **setConsoleTokens($access, $refresh, $expiresAt)**: Encrypt và lưu tokens

#### Routes (routes/sso.php)

```
# Auth routes
POST /api/sso/callback       → SsoCallbackController@callback
POST /api/sso/logout         → SsoCallbackController@logout
GET  /api/sso/user           → SsoCallbackController@user

# Mobile token management
GET    /api/sso/tokens         → SsoTokenController@index
DELETE /api/sso/tokens/{id}    → SsoTokenController@destroy

# Admin routes (protected by sso.role:admin)
# Roles
GET    /api/admin/sso/roles                    → RoleAdminController@index
POST   /api/admin/sso/roles                    → RoleAdminController@store
GET    /api/admin/sso/roles/{id}               → RoleAdminController@show
PUT    /api/admin/sso/roles/{id}               → RoleAdminController@update
DELETE /api/admin/sso/roles/{id}               → RoleAdminController@destroy
GET    /api/admin/sso/roles/{id}/permissions   → RoleAdminController@permissions
PUT    /api/admin/sso/roles/{id}/permissions   → RoleAdminController@syncPermissions

# Permissions
GET    /api/admin/sso/permissions              → PermissionAdminController@index
POST   /api/admin/sso/permissions              → PermissionAdminController@store
GET    /api/admin/sso/permissions/{id}         → PermissionAdminController@show
PUT    /api/admin/sso/permissions/{id}         → PermissionAdminController@update
DELETE /api/admin/sso/permissions/{id}         → PermissionAdminController@destroy
GET    /api/admin/sso/permission-matrix        → PermissionAdminController@matrix

# Team Permissions
GET    /api/admin/sso/teams/permissions                     → TeamPermissionAdminController@index
GET    /api/admin/sso/teams/{teamId}/permissions            → TeamPermissionAdminController@show
PUT    /api/admin/sso/teams/{teamId}/permissions            → TeamPermissionAdminController@sync
DELETE /api/admin/sso/teams/{teamId}/permissions            → TeamPermissionAdminController@destroy
GET    /api/admin/sso/teams/orphaned                        → TeamPermissionAdminController@orphaned
POST   /api/admin/sso/teams/orphaned/{teamId}/restore       → TeamPermissionAdminController@restore
DELETE /api/admin/sso/teams/orphaned                        → TeamPermissionAdminController@cleanupOrphaned
```

---

## Organization Selection Flow

### Khi nào lấy danh sách Organizations?

**Thời điểm:** Ngay sau SSO callback thành công, trước khi redirect user vào app.

```
SSO Callback thành công
        ↓
Service BE có JWT + User đã tạo/update
        ↓
Service BE gọi Console: GET /api/sso/organizations
        ↓
Console trả về danh sách orgs user có access cho service này
        ↓
Service BE return cho Frontend: { user, organizations }
        ↓
Frontend lưu organizations vào state
        ↓
User vào app
```

### Console API: GET /api/sso/organizations

**Request:**
```
GET /api/sso/organizations
Authorization: Bearer {console_access_token}
```

**Response:**
```json
[
  {
    "organization_id": 1,
    "organization_slug": "company-abc",
    "organization_name": "Company ABC",
    "org_role": "admin",
    "service_role": "admin"
  },
  {
    "organization_id": 2,
    "organization_slug": "company-xyz",
    "organization_name": "Company XYZ",
    "org_role": "member",
    "service_role": "member"
  }
]
```

**Lưu ý:**
- API này trả về **chỉ những orgs mà user có access đến SERVICE này**
- Mỗi org có cả `org_role` (role trong org) và `service_role` (role cho service cụ thể)
- `service_role` có thể null nếu user chỉ có org access nhưng chưa được grant service access

### Flow: User chọn Organization

```
┌──────────────────────────────────────────────────────────────────┐
│                     ORGANIZATION SELECTION                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CASE 1: User có 1 org                                           │
│  ─────────────────────                                           │
│  → Auto select org đó                                            │
│  → Lưu vào localStorage: selectedOrg = "company-abc"             │
│  → Redirect vào dashboard                                        │
│                                                                  │
│  CASE 2: User có nhiều orgs                                      │
│  ──────────────────────────                                      │
│  Option A: Hiển thị Organization Picker                          │
│    → User chọn org                                               │
│    → Lưu selectedOrg                                             │
│    → Redirect vào dashboard                                      │
│                                                                  │
│  Option B: Auto select org mặc định (nếu có)                     │
│    → Console có thể trả về default_org                           │
│    → Hoặc dùng org đã chọn lần trước (từ localStorage)           │
│                                                                  │
│  CASE 3: User có 0 org                                           │
│  ─────────────────────                                           │
│  → Hiển thị error: "No access to any organization"               │
│  → Option: Link về Console để request access                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Frontend: Lưu và sử dụng Selected Org

**Storage:**
```typescript
// Lưu khi user chọn org
localStorage.setItem('selectedOrg', 'company-abc');

// Load khi app start
const savedOrg = localStorage.getItem('selectedOrg');
```

**Gửi kèm mỗi API request:**
```typescript
// Mọi API call đều phải có X-Org-Id header
fetch('/api/projects', {
  headers: {
    'Authorization': 'Bearer xxx',      // hoặc Cookie tự động
    'X-Org-Id': currentOrg.slug         // ← BẮT BUỘC
  }
});
```

### Flow: Lấy Service Role cho Org

**Cách 1: Đã có trong organizations list (từ SSO callback)**

```typescript
// Frontend đã có organizations từ login response
const orgs = [
  { slug: "company-abc", serviceRole: "admin" },
  { slug: "company-xyz", serviceRole: "member" }
];

// Khi user chọn org
const currentOrg = orgs.find(o => o.slug === selectedOrgSlug);
console.log(currentOrg.serviceRole); // "admin"
```

**Cách 2: Service BE verify lại khi cần (API request)**

```
Request vào với X-Org-Id: company-abc
        ↓
Service BE middleware: SsoOrganizationAccess
        ↓
Check cache: sso:org_access:{console_user_id}:company-abc
        ↓
Cache MISS → Call Console: GET /api/sso/access?organization_slug=company-abc
        ↓
Console response: { service_role: "admin", org_role: "member", ... }
        ↓
Cache result, TTL 5 phút
        ↓
Set vào request: $request->serviceRole = "admin"
        ↓
Controller có thể dùng để authorize
```

### Console API: GET /api/sso/access

**Request:**
```
GET /api/sso/access?organization_slug=company-abc
Authorization: Bearer {console_access_token}
```

**Response 200 (có quyền):**
```json
{
  "organization_id": 1,
  "organization_slug": "company-abc",
  "org_role": "member",
  "service_role": "admin",
  "service_role_level": 100
}
```

**Response 403 (không có quyền):**
```json
{
  "error": "ACCESS_DENIED",
  "message": "No access to this service in the specified organization"
}
```

### Switch Organization (Không cần re-login)

```
User đang ở org "company-abc"
        ↓
Click Organization Switcher → Chọn "company-xyz"
        ↓
Frontend:
  1. Update state: currentOrg = orgs.find(o => o.slug === "company-xyz")
  2. Lưu localStorage: selectedOrg = "company-xyz"
  3. Các API call tiếp theo dùng X-Org-Id: company-xyz
        ↓
Service BE:
  1. Nhận request với X-Org-Id mới
  2. Check cache cho org mới (có thể miss)
  3. Verify access, cache result
  4. Process request
        ↓
KHÔNG cần:
  - Login lại
  - Lấy token mới
  - Gọi Console để refresh
```

### Role-based Access trong Controller

```php
// routes/api.php
Route::middleware(['sso.auth', 'sso.org'])->group(function () {
    // Tất cả authenticated users có org access
    Route::get('/projects', [ProjectController::class, 'index']);
    
    // Chỉ admin
    Route::middleware('sso.role:admin')->group(function () {
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);
    });
});

// Trong Controller
public function index(Request $request)
{
    $orgId = $request->orgId;           // Organization ID
    $orgSlug = $request->orgSlug;       // "company-abc"
    $serviceRole = $request->serviceRole; // "admin"
    $orgRole = $request->orgRole;       // "member"
    
    // Query scoped to org
    return Project::where('organization_id', $orgId)->get();
}
```

---

## User Sync Strategy

### Nguyên tắc

**Console là Source of Truth cho Identity.** Service chỉ lưu bản copy để:
- Không phải query Console mỗi request
- Lưu thêm data riêng của Service (settings, preferences, etc.)
- Foreign key cho business data

### Khi nào tạo/update User ở Service?

| Event                                 | Action                                              |
| ------------------------------------- | --------------------------------------------------- |
| **SSO Callback** (user login lần đầu) | Tạo User mới với `console_user_id`, `email`, `name` |
| **SSO Callback** (user đã có)         | Update `email`, `name` nếu thay đổi                 |
| **User bị disable ở Console**         | Không tự động sync, sẽ fail khi check access        |

### User Matching

```
JWT từ Console:
{
  "sub": "123",           ← console_user_id
  "email": "a@b.com",
  "name": "Tanaka"
}

Service tìm user:
SELECT * FROM users WHERE console_user_id = 123

Nếu không có → INSERT
Nếu có → UPDATE email, name (nếu khác)
```

### Service Users Table

```sql
CREATE TABLE users (
    id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
    console_user_id             BIGINT UNIQUE NOT NULL,  -- ← Link to Console
    email                       VARCHAR(255) NOT NULL,   -- ← Copy từ Console
    name                        VARCHAR(100) NOT NULL,   -- ← Copy từ Console
    
    -- Service-specific fields (Console không có)
    avatar_url                  VARCHAR(500) NULL,
    preferences                 JSON NULL,
    
    -- Console token storage
    console_access_token        TEXT NULL,
    console_refresh_token       TEXT NULL,
    console_token_expires_at    TIMESTAMP NULL,
    
    created_at                  TIMESTAMP,
    updated_at                  TIMESTAMP,
    
    UNIQUE INDEX (console_user_id)
);
```

### HasConsoleSso Trait - findOrCreateFromJwt()

```php
// Trong SsoCallbackController
$jwtClaims = $this->jwtVerifier->verify($accessToken);

$user = User::findOrCreateFromConsole(
    consoleUserId: (int) $jwtClaims['sub'],
    email: $jwtClaims['email'],
    name: $jwtClaims['name']
);

// HasConsoleSso trait provides:
public static function findOrCreateFromConsole(
    int $consoleUserId,
    string $email,
    string $name
): self {
    return static::updateOrCreate(
        ['console_user_id' => $consoleUserId],
        ['email' => $email, 'name' => $name]
    );
}
```

### Không sync những gì?

| Data                        | Sync? | Lý do                     |
| --------------------------- | ----- | ------------------------- |
| User identity (email, name) | ✅ Yes | Hiển thị trong UI         |
| Password                    | ❌ No  | Console quản lý           |
| Organizations               | ❌ No  | Query realtime từ Console |
| Roles                       | ❌ No  | Query realtime từ Console |
| Teams                       | ❌ No  | Console quản lý           |

### Edge Cases

**User đổi email ở Console:**
- Lần login tiếp theo → Service update email

**User bị xóa ở Console:**
- Service user vẫn còn (có business data)
- Nhưng không thể login (JWT invalid)
- Admin Service có thể soft-delete nếu cần

**Conflict console_user_id:**
- Không thể xảy ra (Console ID unique globally)
- UNIQUE constraint bảo vệ

---

## Web vs Mobile Support

### SSO Callback: Request/Response

**Request:**
```json
{
  "code": "abc123...",
  "device_name": "iPhone 15 Pro"   // Optional: có = mobile, không có = web
}
```

**Response cho Web (không có device_name):**
```json
{
  "user": {
    "id": 1,
    "console_user_id": 123,
    "email": "user@example.com",
    "name": "Tanaka"
  },
  "organizations": [
    {
      "id": 1,
      "slug": "company-abc",
      "name": "Company ABC",
      "org_role": "member",
      "service_role": "admin"
    }
  ]
}
// + HTTP Header: Set-Cookie: session=xxx; HttpOnly; Secure
```

**Response cho Mobile (có device_name):**
```json
{
  "user": {
    "id": 1,
    "console_user_id": 123,
    "email": "user@example.com",
    "name": "Tanaka"
  },
  "organizations": [...],
  "token": "1|abcdefghijk...",
  "token_type": "Bearer",
  "expires_at": null
}
// Không có Set-Cookie, mobile lưu token vào Keychain/Keystore
```

### API Authentication

**Web (SPA):**
```
GET /api/projects
Cookie: session=xxx          ← Tự động gửi bởi browser
X-Org-Id: company-abc
```

**Mobile:**
```
GET /api/projects
Authorization: Bearer 1|xxx  ← App phải gửi manually
X-Org-Id: company-abc
```

### Logout Flow

**Web - Local Logout:**
```
1. Frontend gọi POST /api/sso/logout
2. Service BE:
   - Destroy Sanctum session
   - Call Console POST /api/sso/revoke (revoke Console refresh token)
   - Clear org access cache
3. Frontend redirect về /login
```

**Web - Global Logout (logout tất cả services):**
```
1. Frontend redirect đến: {console_url}/sso/logout?redirect_uri={service_url}
2. Console:
   - Revoke tất cả refresh tokens
   - Clear Console session
   - Redirect về service
3. Service hiển thị "Logged out"

✅ Console đã implement GET /sso/logout (xem docs/sso-global-logout.md)
```

**Mobile - Logout:**
```
1. App gọi POST /api/sso/logout với Bearer token
2. Service BE:
   - Revoke Sanctum API token hiện tại
   - Call Console POST /api/sso/revoke
   - Clear org access cache
3. App clear stored token, quay về login screen
```

### Mobile Token Management

**List tokens:** `GET /api/sso/tokens`
```json
{
  "tokens": [
    {
      "id": 1,
      "name": "iPhone 15 Pro",
      "last_used_at": "2026-01-13T10:00:00Z",
      "created_at": "2026-01-10T08:00:00Z",
      "is_current": true
    },
    {
      "id": 2,
      "name": "iPad Pro",
      "last_used_at": "2026-01-12T15:00:00Z",
      "created_at": "2026-01-05T09:00:00Z",
      "is_current": false
    }
  ]
}
```

**Revoke token:** `DELETE /api/sso/tokens/{id}`
```json
{
  "message": "Token revoked successfully"
}
```

### SsoCallbackController Chi tiết

```
POST /api/sso/callback

Input:
  - code: string (required) - SSO code từ Console
  - device_name: string (optional) - Tên thiết bị, có = mobile

Process:
  1. Validate input
  2. Call Console POST /api/sso/token
     - Body: { code, service_slug }
     - Response: { access_token, refresh_token, expires_in }
  3. Verify JWT (access_token) bằng JWKS
  4. Extract user info từ JWT: sub (console_user_id), email, name
  5. Find or create User trong Service DB
     - Tìm theo console_user_id
     - Nếu chưa có: tạo mới với email, name từ JWT
     - Nếu có: update email, name nếu thay đổi
  6. Lưu Console tokens vào User (encrypted)
  7. Fetch organizations từ Console GET /api/sso/organizations
  8. Tạo Sanctum authentication:
     - Nếu KHÔNG có device_name (Web):
       Auth::login($user) → tạo session
     - Nếu CÓ device_name (Mobile):
       $token = $user->createToken($device_name)
  9. Return response (format khác nhau cho web/mobile)

POST /api/sso/logout

Input:
  - (Auth required - Cookie hoặc Bearer token)

Process:
  1. Get current user từ Sanctum
  2. Revoke Console tokens:
     - Lấy user.console_refresh_token
     - Call Console POST /api/sso/revoke
  3. Clear org access cache cho user
  4. Revoke Sanctum auth:
     - Web: Auth::logout() + session invalidate
     - Mobile: $request->user()->currentAccessToken()->delete()
  5. Return success

GET /api/sso/user

Input:
  - (Auth required)

Response:
  {
    user: { id, console_user_id, email, name },
    organizations: [...],
    current_token: { id, name } // chỉ cho mobile
  }
```

### SsoTokenController (Mobile only)

```
GET /api/sso/tokens

Input:
  - (Auth required - Bearer token)

Response:
  {
    tokens: [
      { id, name, last_used_at, created_at, is_current }
    ]
  }

DELETE /api/sso/tokens/{id}

Input:
  - (Auth required - Bearer token)
  - id: token ID to revoke

Process:
  1. Verify token belongs to current user
  2. Prevent revoke current token (phải dùng /logout)
  3. Delete token
  4. Return success
```

---

## React Package: `@omnify/sso-react`

### Cấu trúc thư mục

```
packages/omnify-sso-react/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── SsoProvider.tsx
│   ├── SsoContext.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOrganization.ts
│   │   └── useSso.ts
│   └── components/
│       ├── SsoCallback.tsx
│       ├── OrganizationSwitcher.tsx
│       └── ProtectedRoute.tsx
└── dist/
```

### Chi tiết từng component

#### SsoProvider

Context provider wrap toàn bộ app, quản lý state authentication:

**Props:**
- `apiUrl`: URL của Service Backend (e.g., `https://api.boilerplate.app`)
- `consoleUrl`: URL của Console (e.g., `http://auth.test`)
- `serviceSlug`: Service identifier (e.g., `boilerplate`)
- `storage`: `"cookie"` hoặc `"localStorage"` - cách lưu selected org
- `children`: React children

**State quản lý:**
- `user`: Object user hiện tại hoặc null
- `organizations`: Array các orgs user có access
- `currentOrg`: Org đang được chọn
- `isLoading`: Đang load initial state
- `isAuthenticated`: User đã login chưa

**Behavior:**
- Khi mount: Check session với Service BE (`GET /api/sso/user`), nếu có session thì load user và orgs
- Load `selectedOrg` từ localStorage, verify vẫn còn trong danh sách orgs
- Provide context value cho children

#### SsoContext

React Context chứa:
- State: user, organizations, currentOrg, isLoading, isAuthenticated
- Actions: login, logout, switchOrg, refreshUser

#### useAuth Hook

Hook để access authentication state và actions:

**Returns:**
- `user`: User object hoặc null
- `isLoading`: boolean
- `isAuthenticated`: boolean
- `login()`: Redirect đến Console SSO authorize page với service và redirect_uri
- `logout()`: Gọi Service BE logout, clear state, redirect về trang login

#### useOrganization Hook

Hook để quản lý organization context:

**Returns:**
- `organizations`: Array các org user có access, mỗi org có {id, slug, name, orgRole, serviceRole}
- `currentOrg`: Org đang được chọn
- `switchOrg(orgSlug)`: Đổi sang org khác, lưu vào localStorage

#### useSso Hook

Convenience hook combine cả auth và organization:

**Returns:**
- Tất cả từ useAuth
- Tất cả từ useOrganization
- `getHeaders()`: Return object headers cần gửi kèm API request: `{"X-Org-Id": currentOrg.slug}`

#### SsoCallback Component

Component xử lý trang `/sso/callback`:

**Behavior:**
1. Đọc `code` từ URL query params
2. Gọi Service BE `POST /api/sso/callback` với code
3. Nhận response: `{user, organizations, token?}`
4. Update context state
5. Lưu selected org (first org hoặc default org)
6. Redirect đến trang sau login (từ query param `redirect` hoặc default `/`)

**Props:**
- `onSuccess(user, orgs)`: Callback khi login thành công
- `onError(error)`: Callback khi có lỗi
- `redirectTo`: URL redirect sau login (default `/`)

#### OrganizationSwitcher Component

UI component để user chọn organization:

**Props:**
- `className`: CSS class
- `renderTrigger`: Custom render cho trigger button
- `renderOption`: Custom render cho mỗi option

**Default UI:**
- Dropdown button hiển thị tên org hiện tại
- Click mở menu với danh sách orgs
- Click org → gọi switchOrg, menu đóng

#### ProtectedRoute Component

Wrapper component để protect routes cần authentication:

**Props:**
- `children`: Content cần protect
- `fallback`: Component hiển thị khi chưa auth (default: redirect to login)
- `requiredRole`: Role tối thiểu để access (optional)

**Behavior:**
- Nếu `isLoading`: hiển thị loading
- Nếu `!isAuthenticated`: render fallback hoặc redirect
- Nếu có `requiredRole` và user role không đủ: hiển thị forbidden
- Else: render children

#### Types (types.ts)

```typescript
interface SsoUser {
  id: number;
  consoleUserId: number;
  email: string;
  name: string;
}

interface SsoOrganization {
  id: number;
  slug: string;
  name: string;
  orgRole: string;
  serviceRole: string | null;
}

interface SsoContextValue {
  user: SsoUser | null;
  organizations: SsoOrganization[];
  currentOrg: SsoOrganization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  switchOrg: (orgSlug: string) => void;
  getHeaders: () => Record<string, string>;
}
```

---

## Configuration

### Service Backend (.env)

```env
SSO_CONSOLE_URL=http://auth.test
SSO_SERVICE_SLUG=boilerplate
SSO_CALLBACK_URL=/sso/callback
SSO_JWKS_CACHE_TTL=60
SSO_ORG_ACCESS_CACHE_TTL=300
```

### Service Frontend (.env)

```env
NEXT_PUBLIC_SSO_CONSOLE_URL=http://auth.test
NEXT_PUBLIC_SSO_SERVICE_SLUG=boilerplate
```

---

## Decisions Log

| #   | Decision          | Choice                                   | Reason                                          |
| --- | ----------------- | ---------------------------------------- | ----------------------------------------------- |
| 1   | Package structure | Laravel + React packages                 | Reusable                                        |
| 2   | Service auth      | Sanctum (Cookie + Token)                 | Support Web + Mobile                            |
| 3   | Console tokens    | Lưu trong `users` table                  | Cần refresh                                     |
| 4   | Org access        | Cache 5 phút                             | Balance performance/consistency                 |
| 5   | JWT verify        | JWKS cache 60 phút                       | Reduce Console calls                            |
| 6   | Package naming    | `omnify/sso-client`, `@omnify/sso-react` | Consistent naming                               |
| 7   | Package location  | `packages/` (monorepo root)              | Dev phase, will extract to separate repos later |
| 8   | Laravel deps      | `lcobucci/jwt ^5.0`                      | Same as Console                                 |
| 9   | React deps        | `react ^18.0\|^19.0` (peer)              | React only, framework agnostic                  |
| 10  | Middleware        | `sso.auth`, `sso.org`, `sso.role`        | Sanctum + org access + role check               |
| 11  | Cache driver      | Laravel default                          | Use app's cache config                          |
| 12  | User integration  | `HasConsoleSso` trait                    | Flexible, integrate existing User               |
| 13  | Schema install    | `sso:install` command                    | Auto-detect omnify, merge User.yaml             |
| 14  | React state       | React Context + hooks                    | Simple, no extra deps                           |
| 15  | Org storage       | localStorage                             | Persist selectedOrg across sessions             |
| 16  | React exports     | Provider + hooks + components            | Flexible usage                                  |
| 17  | Locale header     | `Accept-Language`                        | Standard HTTP header                            |
| 18  | Schema location   | Package owns via `Omnify::addSchemaPath` | Omnify standard                                 |
| 19  | User schema       | Partial (extend User)                    | App owns User, package adds SSO fields          |
| 20  | Role/Permission   | Global (no org_id)                       | Map 1:1 with Console service_role               |
| 21  | Team info         | Separate endpoint `/api/sso/teams`       | Separation of concerns, lazy fetch              |
| 22  | Team storage      | Reference only (console_team_id)         | Console owns teams, Service references          |
| 23  | Team permissions  | Soft delete                              | Allow restore when Console restores team        |
| 24  | Orphan cleanup    | Lazy (Admin UI + artisan command)        | Manual control, no scheduled jobs               |

---

## Console APIs - Global Logout ✅

| API               | Mô tả                                                     | Status |
| ----------------- | --------------------------------------------------------- | ------ |
| `GET /sso/logout` | Global logout - revoke all tokens + clear Console session | ✅ Done |

**Global logout flow:**
```
Service redirect → Console GET /sso/logout?redirect_uri=xxx
                 → Console revoke ALL refresh_tokens của user
                 → Console clear session
                 → Audit log (sso.global_logout)
                 → Redirect về {redirect_uri}?logged_out=1
```

**Redirect URI validation:**
- Phải match với `allowed_redirect_uris` của registered services
- Invalid URI → redirect về Console login với error

---

## Checklist: Post-Development

### Service Package
- [ ] Extract `packages/omnify-sso-client` → separate git repo
- [ ] Extract `packages/omnify-sso-react` → separate git repo
- [ ] Publish to Packagist (Laravel)
- [ ] Publish to npm (React)
- [ ] Update this project to use published packages

### Console Implementation
- [x] `GET /sso/logout` - Global logout ✅
- [ ] `GET /api/sso/teams` - Get user's teams (see: `docs/sso-teams-api.md`)