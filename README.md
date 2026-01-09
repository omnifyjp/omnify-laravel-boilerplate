# Boilerplate

Full-stack boilerplate with Laravel backend and Next.js frontend.

## Tech Stack

| Layer    | Technology                    |
| -------- | ----------------------------- |
| Backend  | Laravel 12, PHP 8.4, MySQL 8  |
| Frontend | Next.js 16, TypeScript        |
| Schema   | [@famgia/omnify-cli](https://www.npmjs.com/package/@famgia/omnify-cli) |
| Dev      | Docker, Herd (optional)       |

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd boilerplate
npm install

# Start development
npm run dev
```

On first run, you'll be prompted for:
- **Project name** (defaults to folder name)
- Ports are auto-detected to avoid conflicts

## Development URLs

Domain is based on your folder name (`{folder}` = `basename $(pwd)`):

| Service    | With Herd           | Without Herd       |
| ---------- | ------------------- | ------------------ |
| Frontend   | `{folder}.test`     | `{folder}.app`     |
| API        | `api.{folder}.test` | `api.{folder}.app` |
| phpMyAdmin | `pma.{folder}.test` | `pma.{folder}.app` |

## Database

```
Host: mysql (Docker) / 127.0.0.1:3306 (local)
Database: omnify
Username: omnify
Password: secret
```

## Commands

```bash
# Laravel Artisan (runs in Docker)
./artisan migrate
./artisan make:model Post -mcr
./artisan tinker

# Composer (runs in Docker)
./composer require package/name
./composer update

# Omnify - schema-driven code generation
npx omnify generate   # Generate migrations + TypeScript types
npx omnify validate   # Validate schemas
```

## Project Structure

```
├── backend/              # Laravel application
│   ├── database/
│   │   ├── schemas/      # Omnify YAML schemas
│   │   └── migrations/
│   │       └── omnify/   # Auto-generated migrations
│   └── ...
├── frontend/             # Next.js application
│   └── src/types/model/  # Auto-generated TypeScript types
├── docker/               # Docker configs
│   ├── backend/          # PHP Dockerfile
│   ├── nginx/            # Nginx + SSL certs
│   └── scripts/          # Dev scripts
├── docker-compose.yml
├── .env                  # Auto-generated (project name + ports)
└── omnify.config.ts      # Omnify configuration
```

## How It Works

### Development Environment

1. **With Herd (macOS)**: Uses Herd's built-in Nginx + SSL for `.test` domains
2. **Without Herd**: Uses Docker Nginx + mkcert for `.app` domains

### Schema-Driven Development

Define your models in `backend/database/schemas/*.yaml`:

```yaml
# backend/database/schemas/Post.yaml
name: Post
columns:
  - name: title
    type: string
  - name: content
    type: text
  - name: published_at
    type: timestamp
    nullable: true
```

Then generate:

```bash
npx omnify generate
```

This creates:
- Laravel migration in `backend/database/migrations/omnify/`
- TypeScript types in `frontend/src/types/model/`

## License

MIT
