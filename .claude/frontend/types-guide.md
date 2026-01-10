# TypeScript Types Guide

> This guide defines where and how to define types in this project.

## Type Categories

| Category            | Location             | Generated | Example                  |
| ------------------- | -------------------- | --------- | ------------------------ |
| **Model**           | `@/types/model`      | ✅ Omnify  | `User`, `Post`           |
| **Enum**            | `@/types/model/enum` | ✅ Omnify  | `PostStatus`, `UserRole` |
| **API Input**       | Service file         | ❌ Manual  | `UserCreateInput`        |
| **API Params**      | Service file         | ❌ Manual  | `UserListParams`         |
| **API Response**    | `@/lib/api.ts`       | ❌ Manual  | `PaginatedResponse<T>`   |
| **Component Props** | Component file       | ❌ Manual  | `UserTableProps`         |
| **Hook Return**     | Hook file            | ❌ Manual  | Inline or inferred       |

---

## 1. Model Types (Omnify)

**Location**: `src/types/model/`

**Source**: Auto-generated from `.omnify/schemas/`

```typescript
// ✅ Import from @/types/model
import type { User, Post } from "@/types/model";

// ❌ DON'T define model types manually
interface User {  // WRONG - already generated
  id: number;
  name: string;
}
```

### Structure

```
src/types/model/
├── base/                    ❌ DO NOT EDIT
│   ├── User.ts              # interface User { id, name, email, ... }
│   └── Post.ts
├── rules/                   ❌ DO NOT EDIT
│   ├── User.rules.ts        # getUserRules(), getUserPropertyDisplayName()
│   └── Post.rules.ts
├── enum/                    ❌ DO NOT EDIT
│   └── PostStatus.ts        # enum PostStatus, getPostStatusLabel()
├── index.ts                 ❌ DO NOT EDIT (re-exports)
├── User.ts                  ✅ CAN EDIT (extension)
└── Post.ts                  ✅ CAN EDIT (extension)
```

### Extending Model Types

```typescript
// src/types/model/User.ts (safe to edit)
import type { User as UserBase } from "./base/User.js";

export interface User extends UserBase {
  // Frontend-only computed properties
  fullName?: string;
  
  // UI state
  isSelected?: boolean;
}
```

---

## 2. API Input Types

**Location**: Service file (colocated)

**Naming**: `{Model}CreateInput`, `{Model}UpdateInput`

```typescript
// services/users.ts

import type { User } from "@/types/model";

// ─────────────────────────────────────────────────────────────────
// Input Types - Define here (not in types/ folder)
// ─────────────────────────────────────────────────────────────────

/** Input for creating a user (POST /api/users) */
export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role?: string;
}

/** Input for updating a user (PUT /api/users/:id) */
export interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

/** Query params for listing users (GET /api/users) */
export interface UserListParams {
  search?: string;
  role?: string;
  page?: number;
  per_page?: number;
  sort_by?: keyof User;
  sort_order?: "asc" | "desc";
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────

export const userService = {
  list: (params?: UserListParams) => ...,
  create: (input: UserCreateInput) => ...,
  update: (id: number, input: UserUpdateInput) => ...,
};
```

### Why Colocate?

```
✅ Good: Types next to usage
services/
  users.ts          # UserCreateInput + userService

❌ Bad: Types scattered
types/
  api/
    UserCreateInput.ts
    UserUpdateInput.ts
    UserListParams.ts
services/
  users.ts
```

**Benefits**:
- Change API = change one file
- Easy to find related types
- No orphan types

---

## 3. API Response Types

**Location**: `src/lib/api.ts`

**Naming**: `{Name}Response`, `Paginated{Name}`

```typescript
// lib/api.ts

/** Laravel paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

/** Laravel single resource response */
export interface ResourceResponse<T> {
  data: T;
}

/** Laravel validation error (422) */
export interface ValidationError {
  message: string;
  errors: Record<string, string[]>;
}
```

### Usage in Service

```typescript
import api, { PaginatedResponse } from "@/lib/api";
import type { User } from "@/types/model";

export const userService = {
  list: async (params?: UserListParams): Promise<PaginatedResponse<User>> => {
    const { data } = await api.get("/api/users", { params });
    return data;
  },
};
```

---

## 4. Component Props Types

**Location**: Same file as component (inline)

**Naming**: `{Component}Props`

```typescript
// components/tables/UserTable.tsx

import type { User } from "@/types/model";
import type { PaginatedResponse } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────
// Props - Define at top of file
// ─────────────────────────────────────────────────────────────────

interface UserTableProps {
  users: User[];
  loading?: boolean;
  pagination?: PaginatedResponse<User>["meta"];
  onPageChange?: (page: number) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function UserTable({
  users,
  loading = false,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: UserTableProps) {
  return <Table ... />;
}
```

### When to Export Props

```typescript
// ✅ Export if other components need it
export interface UserTableProps { ... }

// ✅ Don't export if only used internally
interface UserTableProps { ... }
```

---

## 5. Hook Types

**Location**: Hook file (inline or inferred)

**Approach**: Let TypeScript infer return types when possible

```typescript
// hooks/useUsers.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService, UserCreateInput } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";

export function useUsers(params?: UserListParams) {
  // Return type is inferred from userService.list
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => userService.list(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  // Return type is inferred from useMutation
  return useMutation({
    mutationFn: (input: UserCreateInput) => userService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
```

### When to Define Return Type

```typescript
// ✅ Let TypeScript infer (simpler, less maintenance)
export function useUsers(params?: UserListParams) {
  return useQuery({ ... });
}

// ✅ Define explicitly if complex or for documentation
export function useAuth(): {
  user: User | undefined;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
} {
  ...
}
```

---

## 6. Shared/Utility Types

**Location**: `src/types/index.ts` (only if used across many files)

```typescript
// types/index.ts

/** Common ID type */
export type ID = number;

/** Nullable type helper */
export type Nullable<T> = T | null;

/** Make specific keys optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Extract array element type */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;
```

### When to Use Shared Types

```typescript
// ✅ Use shared types for truly common patterns
import type { ID, Nullable } from "@/types";

interface Post {
  id: ID;
  author_id: ID;
  published_at: Nullable<string>;
}

// ❌ Don't over-abstract
// Bad: Creating shared types for every little thing
export type UserName = string;  // Just use string
export type UserId = number;    // Just use number
```

---

## Type Definition Checklist

### Before Creating a Type

1. **Is it a Model?** → Use `@/types/model` (Omnify)
2. **Is it API input?** → Define in service file
3. **Is it API response?** → Use/extend types in `lib/api.ts`
4. **Is it component props?** → Define in component file
5. **Is it used in 3+ places?** → Consider `types/index.ts`

### Type Naming Conventions

| Type         | Pattern              | Example             |
| ------------ | -------------------- | ------------------- |
| Model        | PascalCase           | `User`, `Post`      |
| Create Input | `{Model}CreateInput` | `UserCreateInput`   |
| Update Input | `{Model}UpdateInput` | `UserUpdateInput`   |
| List Params  | `{Model}ListParams`  | `UserListParams`    |
| Props        | `{Component}Props`   | `UserTableProps`    |
| Response     | `{Name}Response`     | `PaginatedResponse` |

---

## Complete Example

```typescript
// ═══════════════════════════════════════════════════════════════════
// types/model/User.ts (Omnify extension)
// ═══════════════════════════════════════════════════════════════════
import type { User as UserBase } from "./base/User.js";

export interface User extends UserBase {
  // Add frontend-only properties if needed
}

// ═══════════════════════════════════════════════════════════════════
// services/users.ts
// ═══════════════════════════════════════════════════════════════════
import api, { PaginatedResponse } from "@/lib/api";
import type { User } from "@/types/model";

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
}

export interface UserListParams {
  search?: string;
  page?: number;
}

export const userService = {
  list: async (params?: UserListParams): Promise<PaginatedResponse<User>> => {
    const { data } = await api.get("/api/users", { params });
    return data;
  },
  get: async (id: number): Promise<User> => {
    const { data } = await api.get(`/api/users/${id}`);
    return data.data ?? data;
  },
  create: async (input: UserCreateInput): Promise<User> => {
    const { data } = await api.post("/api/users", input);
    return data.data ?? data;
  },
  update: async (id: number, input: UserUpdateInput): Promise<User> => {
    const { data } = await api.put(`/api/users/${id}`, input);
    return data.data ?? data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/users/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════════
// components/tables/UserTable.tsx
// ═══════════════════════════════════════════════════════════════════
import type { User } from "@/types/model";

interface UserTableProps {
  users: User[];
  loading?: boolean;
  onEdit?: (user: User) => void;
}

export function UserTable({ users, loading, onEdit }: UserTableProps) {
  return <Table dataSource={users} loading={loading} ... />;
}

// ═══════════════════════════════════════════════════════════════════
// app/(dashboard)/users/page.tsx
// ═══════════════════════════════════════════════════════════════════
"use client";

import { useQuery } from "@tanstack/react-query";
import { userService, UserListParams } from "@/services/users";
import { UserTable } from "@/components/tables/UserTable";
import { queryKeys } from "@/lib/queryKeys";

export default function UsersPage() {
  const [params, setParams] = useState<UserListParams>({ page: 1 });
  
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => userService.list(params),
  });

  return (
    <UserTable
      users={data?.data ?? []}
      loading={isLoading}
      onEdit={(user) => router.push(`/users/${user.id}/edit`)}
    />
  );
}
```

---

## Summary

| Type     | Location             | Why                       |
| -------- | -------------------- | ------------------------- |
| Model    | `@/types/model`      | Synced with DB via Omnify |
| Input    | Service file         | Colocated with API logic  |
| Response | `lib/api.ts`         | Shared Laravel patterns   |
| Props    | Component file       | Colocated with component  |
| Hook     | Hook file (inferred) | TypeScript handles it     |
| Utility  | `types/index.ts`     | Only if widely used       |

**Philosophy**: Keep types close to their usage. Don't over-organize.
