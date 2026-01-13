# SSO Environment Setup

## Backend (.env)

Add these variables to `backend/.env`:

```env
# SSO Configuration
SSO_CONSOLE_URL=http://auth.test
SSO_SERVICE_SLUG=boilerplate
SSO_CALLBACK_URL=/sso/callback

# Cache TTLs (optional, defaults shown)
SSO_JWKS_CACHE_TTL=60
SSO_ORG_ACCESS_CACHE_TTL=300
SSO_USER_TEAMS_CACHE_TTL=300
SSO_ROLE_PERMISSIONS_CACHE_TTL=3600
SSO_TEAM_PERMISSIONS_CACHE_TTL=3600
```

## Frontend (.env.local)

Add these variables to `frontend/.env.local`:

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# SSO Configuration
NEXT_PUBLIC_SSO_CONSOLE_URL=http://auth.test
NEXT_PUBLIC_SSO_SERVICE_SLUG=boilerplate
```

## Installation Steps

### Backend

```bash
cd backend

# Install package (auto-configures everything)
composer update

# Run migrations (package migrations run automatically from vendor)
php artisan migrate

# Seed default roles
php artisan db:seed --class=\\Omnify\\SsoClient\\Database\\Seeders\\SsoRolesSeeder
```

> **Note:** The `omnify/sso-client` package is zero-config:
> - ServiceProvider auto-discovers (no manual registration needed)
> - Routes auto-register (`api/sso/*`)
> - Migrations run from package (no publishing needed)
> - CSRF bypass for callback is auto-configured
> - Optional: run `php artisan sso:install` for customization

### Frontend

```bash
cd frontend

# Build the SSO package first
cd ../packages/omnify-sso-react
npm install
npm run build

# Back to frontend and install
cd ../../frontend
npm install
```

## Testing

1. Start backend: `cd backend && php artisan serve`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:3000`
4. Click login to test SSO flow
