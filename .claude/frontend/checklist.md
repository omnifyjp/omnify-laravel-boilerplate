# Checklists

> **Related:** [README](./README.md)

## After Writing Code

> **IMPORTANT**: Always run these commands after writing/modifying code:

```bash
# 1. Type check
npm run typecheck

# 2. Lint check
npm run lint

# Or combined
npm run typecheck && npm run lint
```

---

## Adding New Resource

When adding a new resource (e.g., `posts`), follow these steps:

### 1. Service Layer

```bash
# Create: services/posts.ts
```

- [ ] Import Model type from `@/types/model` (if exists)
- [ ] Define Input interfaces (`PostCreateInput`, `PostUpdateInput`, `PostListParams`)
- [ ] Create `postService` object with CRUD methods
- [ ] Add JSDoc comments for each method

### 2. Query Keys

```bash
# Update: lib/queryKeys.ts
```

- [ ] Add `posts` object to `queryKeys`
- [ ] Include `all`, `lists`, `list`, `details`, `detail` keys

```typescript
posts: {
  all: ["posts"] as const,
  lists: () => [...queryKeys.posts.all, "list"] as const,
  list: (params?: PostListParams) => [...queryKeys.posts.lists(), params] as const,
  details: () => [...queryKeys.posts.all, "detail"] as const,
  detail: (id: number) => [...queryKeys.posts.details(), id] as const,
},
```

### 3. Pages

```bash
# Create pages in app/(dashboard)/posts/
```

- [ ] `page.tsx` - List page with table
- [ ] `new/page.tsx` - Create form
- [ ] `[id]/page.tsx` - Detail view
- [ ] `[id]/edit/page.tsx` - Edit form

### 4. Optional Components

- [ ] `components/forms/PostForm.tsx` - If form is reused
- [ ] `components/tables/PostTable.tsx` - If table is complex
- [ ] `hooks/usePosts.ts` - If logic is complex/reusable

### 5. Translations

- [ ] Add labels to `src/i18n/messages/*.json` if needed

### 6. Final Check

- [ ] Run `npm run typecheck && npm run lint`
- [ ] Test create, read, update, delete operations

---

## Adding New Language

- [ ] Create message file: `src/i18n/messages/{locale}.json`
- [ ] Add locale to `src/i18n/config.ts`
- [ ] Import Ant Design locale in `src/components/AntdThemeProvider.tsx`
- [ ] Test with `LocaleSwitcher` component

---

## Before Commit

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No console warnings about deprecated props
- [ ] No hardcoded strings (use i18n)
- [ ] Forms handle loading state (`isPending`)
- [ ] Forms handle validation errors (`getFormErrors`)
- [ ] Mutations invalidate related queries
