# CLAUDE.md

## Stack

- **Backend**: Laravel 12, PHP 8.4, MySQL 8
- **Frontend**: Next.js 16, TypeScript
- **Dev**: Docker, Herd (optional)

## Structure

```
backend/           → Laravel app
  database/
    schemas/       → Omnify YAML schemas
    migrations/
      omnify/      → Auto-generated migrations
frontend/          → Next.js app
  src/types/model/ → Auto-generated TypeScript types
docker/            → Dockerfiles & scripts
```

## Commands

```bash
# Dev server
npm run dev

# Artisan (runs in Docker)
./artisan migrate
./artisan make:model Post -mcr

# Composer (runs in Docker)
./composer require package/name

# Omnify - schema-driven code generation
npx omnify generate   # Generate migrations + types
npx omnify validate   # Validate schemas
```

## URLs

Domain based on folder name: `{folder}` = `basename $(pwd)`

| Service    | With Herd         | Without Herd     |
| ---------- | ----------------- | ---------------- |
| Frontend   | {folder}.test     | {folder}.app     |
| API        | api.{folder}.test | api.{folder}.app |
| phpMyAdmin | pma.{folder}.test | pma.{folder}.app |

## Database

```
Host: mysql | DB: omnify | User: omnify | Pass: secret
```

## Auto-generated Files (gitignored)

- `.env` - Project name + ports (docker-compose reads this)
- `backend/.env` - Laravel env with dynamic APP_URL

## Ports

Auto-detected on first run to avoid conflicts:
- Frontend: starts at 3000
- Backend: starts at 8000  
- phpMyAdmin: starts at 8081

## Rules

- Do NOT run `git commit` without asking
- Do NOT run code/tests automatically
- Use `./artisan` and `./composer` wrappers (PHP 8.4 in Docker)
