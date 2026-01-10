# CLAUDE.md

## Stack

- **Backend**: Laravel 12, PHP 8.4, MySQL 8
- **Frontend**: Next.js 16, TypeScript, Ant Design 6, TanStack Query
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
# First time setup (Docker, SSL, Backend, Frontend)
npm run setup

# Dev server (requires setup first)
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

## Frontend Documentation

When working on **frontend**, read these guides in `.claude/frontend/`:

| Guide                                                              | Content                             |
| ------------------------------------------------------------------ | ----------------------------------- |
| [design-philosophy.md](/.claude/frontend/design-philosophy.md)     | ⭐ Why this architecture, principles |
| [README.md](/.claude/frontend/README.md)                           | Directory Structure, Naming         |
| [types-guide.md](/.claude/frontend/types-guide.md)                 | Where & how to define types         |
| [service-pattern.md](/.claude/frontend/service-pattern.md)         | Service Layer                       |
| [tanstack-query.md](/.claude/frontend/tanstack-query.md)           | Query, Mutation, Tips               |
| [antd-guide.md](/.claude/frontend/antd-guide.md)                   | Components, Deprecated Props        |
| [i18n-guide.md](/.claude/frontend/i18n-guide.md)                   | Multi-language                      |
| [datetime-guide.md](/.claude/frontend/datetime-guide.md)           | Day.js, Timezone, UTC handling      |
| [laravel-integration.md](/.claude/frontend/laravel-integration.md) | Sanctum, Error Handling             |
| [checklist.md](/.claude/frontend/checklist.md)                     | New Resource, Before Commit         |

**Quick patterns:**
```typescript
// Query
const { data } = useQuery({
  queryKey: queryKeys.users.list(filters),
  queryFn: () => userService.list(filters),
});

// Mutation
const mutation = useMutation({
  mutationFn: userService.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
});
```

---

## Laravel Documentation

When working on **backend**, read these guides in `.claude/laravel/`:

| Guide                                                   | Content                      |
| ------------------------------------------------------- | ---------------------------- |
| [datetime-guide.md](/.claude/laravel/datetime-guide.md) | Carbon, UTC, API Date Format |

**Key rules:**
- `config/app.php` timezone must be `UTC`
- All API dates return ISO 8601 UTC: `->toISOString()`
- Always use `Carbon`, never raw `DateTime` or `date()`

---

## Omnify

This project uses Omnify for schema-driven code generation.

**Documentation**: `.claude/omnify/`
- `schema-guide.md` - Schema format and property types
- `config-guide.md` - Configuration (omnify.config.ts)
- `laravel-guide.md` - Laravel generator (if installed)
- `typescript-guide.md` - TypeScript generator (if installed)
- `antdesign-guide.md` - Ant Design Form integration (if installed)

**Commands**:
- `npx omnify generate` - Generate code from schemas
- `npx omnify validate` - Validate schemas
