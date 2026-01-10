# CLAUDE.md

## Stack

- **Backend**: Laravel 12, PHP 8.4, MySQL 8
- **Frontend**: Next.js 16, TypeScript
- **Dev**: Docker, mkcert (SSL)

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

Domain based on folder name: `{folder}.app`

| Service    | URL                       |
| ---------- | ------------------------- |
| Frontend   | https://{folder}.app      |
| API        | https://api.{folder}.app  |
| phpMyAdmin | https://{folder}.app:8080 |
| Mailpit    | https://{folder}.app:8025 |
| MinIO      | https://{folder}.app:9001 |

## Database

```
Host: mysql | DB: omnify | User: omnify | Pass: secret
```

## SMTP (Mailpit)

```
Host: mailpit | Port: 1025 | No auth
```

## S3 (MinIO)

```
Endpoint: http://minio:9000 | Key: minioadmin | Secret: minioadmin | Bucket: local
```

## Auto-generated Files (gitignored)

- `backend/.env` - Laravel env
- `docker/nginx/nginx.conf` - Generated from template

## Ports

- Frontend: auto-detected on first run (starts at 3000, runs on host)
- Backend/phpMyAdmin: internal Docker network only (accessed via nginx)

## Rules

- Do NOT run `git commit` without asking
- Do NOT run code/tests automatically
- Use `./artisan` and `./composer` wrappers (PHP 8.4 in Docker)

---

## Omnify Schema Integration

This project uses **Omnify** for schema-driven code generation.

For detailed Omnify documentation, see:
- `.claude/omnify/schema-guide.md` - Complete schema format guide
- `.claude/omnify/examples.md` - Example schemas

### Quick Commands
- `npx omnify generate` - Generate code from schemas
- `npx omnify validate` - Validate all schemas
