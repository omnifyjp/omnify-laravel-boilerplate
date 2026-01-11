# CLAUDE.md

## Stack

- **Backend**: Laravel 12, PHP 8.4, MySQL 8
- **Frontend**: Next.js 16, TypeScript, Ant Design 6, TanStack Query
- **Dev**: Docker, mkcert (SSL)

## Commands

```bash
npm run setup                # First time setup
npm run dev                  # Dev server

./artisan migrate            # Run migrations
./artisan test               # Run all tests
./artisan l5-swagger:generate  # Generate OpenAPI

./composer require pkg/name  # Add package

npx omnify generate          # Generate from schemas
```

## URLs

| Service  | URL                                        |
| -------- | ------------------------------------------ |
| Frontend | https://{folder}.app                       |
| API      | https://api.{folder}.app                   |
| Docs     | https://api.{folder}.app/api/documentation |

## Database

```
Host: mysql | User: omnify | Pass: secret
Dev: omnify | Test: omnify_testing
```

## Rules

- ❌ Do NOT run `git commit` without asking
- ❌ Do NOT run tests automatically
- ✅ Use `./artisan` and `./composer` wrappers

---

## Documentation (BMAD Structure)

> **Entry point**: [.claude/README.md](/.claude/README.md)

| Purpose        | Folder                                      | Description                             |
| -------------- | ------------------------------------------- | --------------------------------------- |
| **Agents**     | [.claude/agents/](/.claude/agents/)         | AI personas (developer, reviewer, etc.) |
| **Workflows**  | [.claude/workflows/](/.claude/workflows/)   | Step-by-step processes                  |
| **Rules**      | [.claude/rules/](/.claude/rules/)           | Security, performance, naming           |
| **Guides**     | [.claude/guides/](/.claude/guides/)         | Implementation reference                |
| **Checklists** | [.claude/checklists/](/.claude/checklists/) | Quick verification                      |
| **Schema**     | [.claude/omnify/](/.claude/omnify/)         | Auto-generated                          |

### Agents

| Agent                                      | Use For            |
| ------------------------------------------ | ------------------ |
| [@developer](/.claude/agents/developer.md) | Implement features |
| [@reviewer](/.claude/agents/reviewer.md)   | Code review        |
| [@architect](/.claude/agents/architect.md) | System design      |
| [@tester](/.claude/agents/tester.md)       | Write tests        |

### Quick Links

| Task           | Go To                                                           |
| -------------- | --------------------------------------------------------------- |
| New feature    | [workflows/new-feature.md](/.claude/workflows/new-feature.md)   |
| Bug fix        | [workflows/bug-fix.md](/.claude/workflows/bug-fix.md)           |
| Code review    | [workflows/code-review.md](/.claude/workflows/code-review.md)   |
| Security rules | [rules/security.md](/.claude/rules/security.md)                 |
| Backend guide  | [guides/backend/README.md](/.claude/guides/backend/README.md)   |
| Frontend guide | [guides/frontend/README.md](/.claude/guides/frontend/README.md) |

---

## Quick Patterns

### Backend (Thin Controller)

```php
public function store(UserStoreRequest $request): UserResource
{
    return new UserResource(User::create($request->validated()));
}
```

### Frontend (TanStack Query)

```typescript
const { data } = useQuery({
  queryKey: queryKeys.users.list(filters),
  queryFn: () => userService.list(filters),
});
```

---

## Key Principles

1. **Schema-First**: `.omnify/schemas/` → generate everything
2. **Thin Controllers**: Validate → Delegate → Respond
3. **UTC Everywhere**: Store UTC, send `toISOString()`
4. **Test Everything**: 正常系 + 異常系
5. **Don't Over-Engineer**: Simple CRUD = Controller + Model

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
