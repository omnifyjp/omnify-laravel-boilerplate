# Boilerplate

Full-stack boilerplate with Laravel backend and Next.js frontend.

## Tech Stack

| Layer    | Technology                                                             |
| -------- | ---------------------------------------------------------------------- |
| Backend  | Laravel 12, PHP 8.4, MySQL 8                                           |
| Frontend | Next.js 16, TypeScript                                                 |
| Schema   | [@famgia/omnify-cli](https://www.npmjs.com/package/@famgia/omnify-cli) |
| Dev      | Docker, mkcert (SSL)                                                   |

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd boilerplate
npm install

# Start development
npm run dev
```

On first run:
- **Project name** = folder name (automatic)
- **Frontend port** = auto-detected to avoid conflicts

## Development URLs

Domain is based on your folder name (`{folder}` = `basename $(pwd)`):

| Service    | URL                         |
| ---------- | --------------------------- |
| Frontend   | `https://{folder}.app`      |
| API        | `https://api.{folder}.app`  |
| phpMyAdmin | `https://{folder}.app:8080` |
| Mailpit    | `https://{folder}.app:8025` |
| MinIO      | `https://{folder}.app:9001` |

## Database

```
Host: mysql (Docker)
Database: omnify
Username: omnify
Password: secret
```

## SMTP (Mailpit)

```
Host: mailpit
Port: 1025
Auth: none
```

## S3 Storage (MinIO)

```
Endpoint: http://minio:9000
Access Key: minioadmin
Secret Key: minioadmin
Bucket: local
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
└── omnify.config.ts      # Omnify configuration
```

## How It Works

### Development Environment

- Uses Docker Nginx + mkcert for `.app` domains with SSL
- First run sets up SSL certificates and `/etc/hosts` automatically
- Requires `sudo` once for hosts file modification

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
