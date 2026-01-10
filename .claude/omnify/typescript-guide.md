# Omnify TypeScript Generator Guide

This guide covers TypeScript-specific features and generated code patterns for Omnify.

## Generated Files

When you run `npx omnify generate`, the following TypeScript files are generated:

- `types/omnify-types.ts` - All type definitions
- `types/enums.ts` - Enum types and helpers

## Type Generation

### Object Schema → Interface

```yaml
# yaml-language-server: $schema=./node_modules/.omnify/combined-schema.json
name: User
properties:
  id:
    type: BigInt
    required: true
  name:
    type: String
    required: true
    maxLength: 255
  email:
    type: String
    required: true
    unique: true
  profile:
    type: Json
  createdAt:
    type: DateTime
```

Generated:
```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  profile: Record<string, unknown> | null;
  createdAt: Date | null;
}
```

## Type Mapping

| Schema Type | TypeScript Type |
|-------------|-----------------|
| `String` | `string` |
| `LongText` | `string` |
| `Int` | `number` |
| `BigInt` | `number` |
| `Float` | `number` |
| `Boolean` | `boolean` |
| `Date` | `Date` |
| `DateTime` | `Date` |
| `Json` | `Record<string, unknown>` |
| `EnumRef` | Generated enum type |
| `Association` | Related model type / array |

## Enum Generation

```yaml
# schemas/PostStatus.yaml
name: PostStatus
kind: enum
values:
  draft: 下書き
  published: 公開済み
  archived: アーカイブ
```

Generated:
```typescript
export const PostStatus = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
} as const;

export type PostStatus = typeof PostStatus[keyof typeof PostStatus];

// Helper functions
export const PostStatusValues = Object.values(PostStatus);
export const PostStatusKeys = Object.keys(PostStatus) as (keyof typeof PostStatus)[];

export function isPostStatus(value: unknown): value is PostStatus {
  return PostStatusValues.includes(value as PostStatus);
}

// Display names for UI
export const PostStatusDisplayNames: Record<PostStatus, string> = {
  draft: '下書き',
  published: '公開済み',
  archived: 'アーカイブ',
};

export function getPostStatusDisplayName(value: PostStatus): string {
  return PostStatusDisplayNames[value];
}
```

## Association Types

### ManyToOne
```yaml
author:
  type: Association
  relation: ManyToOne
  target: User
```

Generated:
```typescript
export interface Post {
  authorId: number;
  author?: User;  // Optional: loaded relation
}
```

### OneToMany
```yaml
posts:
  type: Association
  relation: OneToMany
  target: Post
```

Generated:
```typescript
export interface User {
  posts?: Post[];  // Optional: loaded relation array
}
```

### ManyToMany
```yaml
tags:
  type: Association
  relation: ManyToMany
  target: Tag
```

Generated:
```typescript
export interface Post {
  tags?: Tag[];  // Optional: loaded relation array
}
```

## Nullable Fields

Fields without `required: true` are nullable:

```yaml
description:
  type: LongText  # No required: true
```

Generated:
```typescript
description: string | null;
```

## Using Generated Types

```typescript
import { User, Post, PostStatus, isPostStatus } from './types/omnify-types';

// Type-safe object creation
const user: User = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  profile: null,
  createdAt: new Date(),
};

// Enum usage
const status: PostStatus = PostStatus.draft;

// Type guard
function handleStatus(value: unknown) {
  if (isPostStatus(value)) {
    console.log('Valid status:', value);
  }
}
```

## Commands

```bash
# Generate TypeScript types
npx omnify generate --typescript

# Generate to specific output
npx omnify generate --typescript --output ./src/types

# Watch for changes
npx omnify watch --typescript
```

## Configuration

```javascript
// omnify.config.js
export default {
  schemasDir: './schemas',
  typescript: {
    outputDir: './types',
    outputFile: 'omnify-types.ts',
    enumsFile: 'enums.ts',
    generateHelpers: true,  // Generate enum helpers
    strictNullChecks: true  // Use | null for optional
  }
};
```
