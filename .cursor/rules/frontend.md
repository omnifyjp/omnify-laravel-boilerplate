---
globs: ["frontend/**"]
---

# Frontend Rules

> **Full documentation:** `.claude/frontend/`
> - `design-philosophy.md` - Why this architecture
> - `types-guide.md` - Where to define types
> - `datetime-guide.md` - Day.js, UTC handling

## Critical Rules

1. **Use Ant Design** - Don't recreate existing components
2. **Use Omnify types** - Import from `@/types/model`, don't duplicate
3. **Ask before installing** - No `npm install` without permission
4. **Use i18n** - Use `useTranslations()` for UI text
5. **After writing code** - Run `npm run typecheck && npm run lint`

---

## Quick Reference

### Service Pattern

```typescript
// services/users.ts
import type { User, UserCreate, UserUpdate } from "@/types/model";  // All from Omnify

export interface UserListParams { ... }  // Only params - define locally

export const userService = {
  list: (params?: UserListParams) => api.get("/api/users", { params }).then(r => r.data),
  get: (id: number) => api.get(`/api/users/${id}`).then(r => r.data.data ?? r.data),
  create: (input: UserCreate) => api.post("/api/users", input).then(r => r.data.data),
  update: (id: number, input: UserUpdate) => api.put(`/api/users/${id}`, input).then(r => r.data.data),
};
```

### Validation Rules (from Omnify)

```typescript
import { getUserRules, getUserPropertyDisplayName } from "@/types/model";
const rules = getUserRules(locale);  // Ant Design compatible
```

### TanStack Query

```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: queryKeys.users.list(filters),
  queryFn: () => userService.list(filters),
});

// Mutation
const mutation = useMutation({
  mutationFn: userService.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    message.success(t("messages.created"));
  },
  onError: (error) => form.setFields(getFormErrors(error)),
});
```

### Form with i18n

```typescript
const t = useTranslations();

<Form form={form} onFinish={mutation.mutate}>
  <Form.Item name="email" label={t("auth.email")} rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Button loading={mutation.isPending} htmlType="submit">
    {t("common.save")}
  </Button>
</Form>
```

---

## Ant Design Deprecated Props (v6+)

| Deprecated                          | Use Instead             |
| ----------------------------------- | ----------------------- |
| `direction` (Space)                 | `orientation`           |
| `visible` (Modal, Drawer, Dropdown) | `open`                  |
| `dropdownMatchSelectWidth`          | `popupMatchSelectWidth` |

---

## Types Rule

```typescript
// ✅ Use Omnify-generated types
import type { User, UserCreate, UserUpdate } from "@/types/model";
import { getUserRules } from "@/types/model";

// ✅ Only define query params locally
export interface UserListParams { ... }

// ❌ Don't redefine types that Omnify generates
export interface UserCreateInput { ... }  // WRONG - use UserCreate
```

---

## Omnify Types - File Permissions

```
src/types/model/
├── base/       ❌ DO NOT EDIT
├── rules/      ❌ DO NOT EDIT
├── enum/       ❌ DO NOT EDIT
├── index.ts    ❌ DO NOT EDIT
└── User.ts     ✅ CAN EDIT (extension)
```

---

## Common Mistakes

```typescript
// ❌ Fetch in useEffect
useEffect(() => { fetchData() }, []);
// ✅ Use useQuery

// ❌ Mix server + local state
const [users, setUsers] = useState([]);
const { data } = useQuery({...});
// ✅ Use only TanStack for server data

// ❌ Direct axios in component
queryFn: () => axios.get("/api/users")
// ✅ Use service layer

// ❌ Hardcoded strings
<Button>Save</Button>
// ✅ Use i18n
<Button>{t("common.save")}</Button>

// ❌ No loading state
<Button onClick={submit}>Save</Button>
// ✅ Show loading
<Button loading={isPending}>Save</Button>
```

---

## File Location Rules

```
Component used in 1 feature?  → features/{feature}/
Component used in 2+ features? → components/common/
Service (API calls)?           → services/ (ALWAYS)
Hook used in 1 feature?        → features/{feature}/
Hook used in 2+ features?      → hooks/
```

```typescript
// ❌ WRONG
features/users/services/users.ts     // Service in features
components/users/UserTable.tsx       // Feature-specific in components

// ✅ CORRECT
services/users.ts                    // Service always centralized
features/users/UserTable.tsx         // Feature-specific in features
components/common/DataTable.tsx      // Shared in components
```

---

## Checklists

### New Resource
1. `services/{resource}.ts` - Service with CRUD
2. `lib/queryKeys.ts` - Add query keys
3. `features/{resource}/` - Feature components
4. Pages: List, Create, Detail, Edit
5. Run `npm run typecheck && npm run lint`

### New Language
1. Create `src/i18n/messages/{locale}.json`
2. Add to `src/i18n/config.ts`
3. Import in `src/components/AntdThemeProvider.tsx`
