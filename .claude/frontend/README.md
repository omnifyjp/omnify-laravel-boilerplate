# Frontend Architecture Guide

> **Related docs:**
> - [Design Philosophy](./design-philosophy.md) ⭐ **Start here** - Architecture, principles
> - [Types Guide](./types-guide.md) - Where to define types
> - [Service Pattern](./service-pattern.md) - API services
> - [TanStack Query](./tanstack-query.md) - Data fetching
> - [Ant Design](./antd-guide.md) - UI components
> - [i18n](./i18n-guide.md) - Multi-language
> - [DateTime](./datetime-guide.md) - Day.js, UTC handling
> - [Laravel Integration](./laravel-integration.md) - Backend integration
> - [Checklists](./checklist.md) - Before commit, new resource

## Overview

See [Design Philosophy](./design-philosophy.md) for architecture diagram and principles.

**Stack**: Next.js 16 + TypeScript + Ant Design 6 + TanStack Query + Axios

---

## Directory Structure

```
frontend/src/
├── app/                        # Next.js App Router (Pages)
│   ├── layout.tsx              # Root: Providers wrapper
│   ├── page.tsx                # Public: Home page
│   │
│   ├── (auth)/                 # Group: Auth pages (no layout)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   └── (dashboard)/            # Group: Protected pages
│       ├── layout.tsx          # Shared: Sidebar + Header
│       ├── page.tsx            # /dashboard
│       └── users/              # Resource: Users
│           ├── page.tsx        # GET    /users      (List)
│           ├── new/page.tsx    # POST   /users      (Create)
│           └── [id]/
│               ├── page.tsx    # GET    /users/:id  (Show)
│               └── edit/page.tsx # PUT  /users/:id  (Edit)
│
├── components/                 # Reusable UI Components
│   ├── providers/              # Context Providers
│   │   └── AntdThemeProvider.tsx
│   ├── layouts/                # Layout Components
│   │   ├── DashboardLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── forms/                  # Form Components
│   │   └── UserForm.tsx
│   └── common/                 # Shared Components
│       ├── DataTable.tsx
│       └── PageHeader.tsx
│
├── lib/                        # Core Infrastructure (Centralized configs)
│   ├── api.ts                  # Axios instance + interceptors
│   ├── query.tsx               # QueryClient provider
│   ├── queryKeys.ts            # Query key factory
│   └── dayjs.ts                # Day.js config + utilities
│
├── services/                   # API Service Layer
│   ├── auth.ts                 # POST /login, /logout, /register
│   └── users.ts                # CRUD /api/users
│
├── hooks/                      # Custom React Hooks
│   └── useAuth.ts              # Auth state management
│
├── i18n/                       # Internationalization
│   ├── config.ts               # Locales config
│   ├── request.ts              # Server-side locale detection
│   └── messages/               # Translation files
│       ├── ja.json
│       ├── en.json
│       └── vi.json
│
└── types/                      # TypeScript Types
    └── model/                  # Omnify auto-generated types
```

---

## Naming Conventions

### Files

| Type      | Pattern                  | Example                         |
| --------- | ------------------------ | ------------------------------- |
| Component | PascalCase               | `UserForm.tsx`, `DataTable.tsx` |
| Hook      | camelCase + `use` prefix | `useAuth.ts`, `useUsers.ts`     |
| Service   | camelCase                | `users.ts`, `auth.ts`           |
| Utility   | camelCase                | `utils.ts`, `formatters.ts`     |
| Type      | camelCase or PascalCase  | `types.ts`, `User.ts`           |
| Page      | lowercase                | `page.tsx`, `layout.tsx`        |

### Code

| Type           | Pattern               | Example                     |
| -------------- | --------------------- | --------------------------- |
| Component      | PascalCase            | `function UserForm()`       |
| Hook           | camelCase + `use`     | `function useAuth()`        |
| Service object | camelCase + `Service` | `const userService = {}`    |
| Interface      | PascalCase            | `interface User`            |
| Type           | PascalCase            | `type UserFormData`         |
| Constant       | UPPER_SNAKE_CASE      | `const API_TIMEOUT = 30000` |
| Function       | camelCase             | `function formatDate()`     |
| Variable       | camelCase             | `const userData = ...`      |

---

## Types

See [Types Guide](./types-guide.md) for complete type definition rules.

**Quick reference:**

| Type               | Location                                |
| ------------------ | --------------------------------------- |
| Model (User, Post) | `@/types/model` (Omnify auto-generated) |
| Input types        | Service file (colocated)                |
| Props              | Component file                          |
| API Response       | `lib/api.ts`                            |

**Omnify files:**
- `base/`, `rules/`, `enum/` → ❌ DO NOT EDIT
- `User.ts` (root level) → ✅ CAN EDIT (extension)

See also: [Omnify TypeScript Guide](../omnify/typescript-guide.md)
