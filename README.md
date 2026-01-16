# Omnify Laravel + Next.js Boilerplate

Production-ready full-stack boilerplate with Laravel API, Next.js frontend, and Omnify SSO integration.

## Tech Stack

| Layer    | Technology                                                                 |
| -------- | -------------------------------------------------------------------------- |
| Backend  | Laravel 12, PHP 8.4, MySQL 8, Laravel Sanctum                              |
| Frontend | Next.js 16, TypeScript, Ant Design 6, TanStack Query                       |
| Auth     | Omnify SSO (`@famgia/omnify-client-sso-react`, `omnifyjp/omnify-client-laravel-sso`) |
| Schema   | [@famgia/omnify-cli](https://www.npmjs.com/package/@famgia/omnify-cli)     |
| Dev      | Docker, Omnify Tunnel (auto HTTPS)                                         |

## Prerequisites

- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Composer** (auto-installed if missing on macOS/Linux)

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url> my-project
cd my-project

# 2. Install dependencies
npm install

# 3. Setup backend + database (first time only)
npm run setup

# 4. Start development
npm run dev
```

That's it! After ~2 minutes, you'll see:

```
 Tunnel Development Environment Ready!

   Frontend:    https://my-project.your-name.dev.omnify.jp
   API:         https://api.my-project.your-name.dev.omnify.jp
   WebSocket:   wss://ws.my-project.your-name.dev.omnify.jp
   phpMyAdmin:  https://pma.my-project.your-name.dev.omnify.jp
   Mailpit:     https://mail.my-project.your-name.dev.omnify.jp
   MinIO:       https://minio.my-project.your-name.dev.omnify.jp
```

## SSO Authentication

This boilerplate includes **Omnify SSO** integration out of the box.

### How it works

1. User clicks "Login with SSO" on frontend
2. Redirect to `dev.console.omnify.jp` for authentication
3. After login, redirected back with auth code
4. Backend exchanges code for tokens
5. User session created, dashboard shown

### Test Credentials (dev.console.omnify.jp)

| Email               | Password      |
| ------------------- | ------------- |
| admin@tempofast.com | @Famgia2025.  |

### SSO Features

- ✅ Single Sign-On with Omnify Console
- ✅ Organization switching
- ✅ Role-based access control
- ✅ Global logout (logout from all services)
- ✅ Token refresh

## Database

```
Host:     mysql (inside Docker)
Port:     3306
Database: omnify
Username: omnify
Password: secret
```

Access phpMyAdmin at `https://pma.{project}.{user}.dev.omnify.jp`

## Commands

### Development

```bash
npm run dev      # Start dev environment with tunnel
npm run setup    # Fresh setup (creates backend if missing)
```

### Laravel Artisan

```bash
./artisan migrate              # Run migrations
./artisan migrate:fresh        # Reset database
./artisan make:model Post -mcr # Create model with controller/migration
./artisan tinker               # Interactive shell
```

### Composer

```bash
./composer require package/name   # Install package
./composer update                 # Update packages
```

### Omnify (Schema-Driven Development)

```bash
npx omnify generate    # Generate migrations + TypeScript types
npx omnify validate    # Validate schemas
npx omnify reset -y    # Reset all generated files
```

## Project Structure

```
├── backend/                    # Laravel 12 API (auto-generated)
│   ├── app/
│   │   ├── Models/
│   │   │   ├── User.php        # User model with SSO trait
│   │   │   └── OmnifyBase/     # Auto-generated base models
│   │   └── Http/
│   │       └── Controllers/
│   ├── config/
│   │   ├── cors.php            # CORS config (*.dev.omnify.jp)
│   │   └── sso-client.php      # SSO configuration
│   ├── bootstrap/
│   │   └── app.php             # Middleware (CSRF, statefulApi)
│   └── database/
│       └── migrations/
│           └── omnify/         # Auto-generated migrations
│
├── frontend/                   # Next.js 16 + Ant Design
│   ├── src/
│   │   ├── app/                # App router pages
│   │   │   ├── page.tsx        # Home with SSO login
│   │   │   ├── dashboard/      # Protected dashboard
│   │   │   └── sso/callback/   # SSO callback handler
│   │   ├── components/
│   │   │   └── SsoWrapper.tsx  # SSO provider wrapper
│   │   ├── hooks/
│   │   │   └── useAuth.ts      # Auth hooks
│   │   └── omnify/             # Auto-generated TypeScript
│   └── .env.local              # Frontend env (auto-generated)
│
├── docker/
│   ├── scripts/
│   │   ├── setup.sh            # Setup script
│   │   └── dev.sh              # Dev script with tunnel
│   └── stubs/                  # Template files
│       ├── cors.php.stub
│       ├── bootstrap-app.php.stub
│       └── User.php.stub
│
├── schemas/                    # Omnify YAML schemas
│   └── auth/
│       └── User.yaml
│
├── docker-compose.yml          # Docker services
├── omnify.config.ts            # Omnify configuration
└── package.json
```

## Schema-Driven Development

Define models in `schemas/` folder using YAML:

```yaml
# schemas/blog/Post.yaml
displayName:
  ja: 投稿
  en: Post

properties:
  title:
    type: String
    length: 255
    required: true
    displayName:
      ja: タイトル
      en: Title

  content:
    type: Text
    displayName:
      ja: 本文
      en: Content

  published_at:
    type: DateTime
    nullable: true

associations:
  author:
    type: ManyToOne
    target: User
```

Generate code:

```bash
npx omnify generate
```

This creates:
- Laravel migration in `backend/database/migrations/omnify/`
- Laravel model in `backend/app/Models/OmnifyBase/`
- TypeScript types in `frontend/src/omnify/`
- Zod validation schemas

## Environment Variables

### Backend (.env)

```env
# Database
DB_CONNECTION=mysql
DB_HOST=mysql
DB_DATABASE=omnify
DB_USERNAME=omnify
DB_PASSWORD=secret

# Session (cross-origin cookies)
SESSION_DRIVER=cookie
SESSION_DOMAIN=.{project}.{user}.dev.omnify.jp
SESSION_SAME_SITE=none
SESSION_SECURE_COOKIE=true

# Sanctum SPA auth
SANCTUM_STATEFUL_DOMAINS={project}.{user}.dev.omnify.jp,api.{project}.{user}.dev.omnify.jp

# SSO
SSO_CONSOLE_URL=https://dev.console.omnify.jp
SSO_SERVICE_SLUG=test-service
SSO_SERVICE_SECRET=test_secret_2026_dev_only_do_not_use_in_prod
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.{project}.{user}.dev.omnify.jp
NEXT_PUBLIC_SSO_CONSOLE_URL=https://dev.console.omnify.jp
```

## Docker Services

| Service    | Port (internal) | Description          |
| ---------- | --------------- | -------------------- |
| backend    | 8000            | Laravel PHP server   |
| mysql      | 3306            | MySQL 8 database     |
| redis      | 6379            | Cache & queue        |
| horizon    | -               | Queue worker         |
| reverb     | 8080            | WebSocket server     |
| mailpit    | 8025            | Email testing        |
| minio      | 9000/9001       | S3-compatible storage|
| phpmyadmin | 80              | Database admin       |

## Troubleshooting

### Backend 500 Error

```bash
# Check Laravel logs
docker compose logs backend --tail 50

# Or read log file
docker compose exec backend cat storage/logs/laravel.log | tail -50
```

### CORS Errors

Ensure these are set in `backend/.env`:
```env
SESSION_SAME_SITE=none
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=your-domain.dev.omnify.jp,api.your-domain.dev.omnify.jp
```

### SSO "auth.test" Error

Update `backend/.env`:
```env
SSO_CONSOLE_URL=https://dev.console.omnify.jp
```

Then clear config:
```bash
docker compose exec backend php artisan config:clear
```

### Database Connection Error

```bash
# Check if MySQL is running
docker compose ps mysql

# Reset database
docker compose exec backend php artisan migrate:fresh
```

### Fresh Start

```bash
# Complete reset
docker compose down -v
rm -rf backend
npm run setup
npm run dev
```

## License

MIT
