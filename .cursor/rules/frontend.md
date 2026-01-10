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
import type { User } from "@/types/model";  // Model from Omnify

export interface UserCreateInput { ... }     // Input types - define locally

export const userService = {
  list: (params?) => api.get("/api/users", { params }).then(r => r.data),
  get: (id) => api.get(`/api/users/${id}`).then(r => r.data.data ?? r.data),
  create: (input) => api.post("/api/users", input).then(r => r.data.data),
};
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
// ✅ Use specific types (from service or @/types/model)
list: (params?: UserListParams) => [...]
const user: User = ...

// ❌ Don't use generic types when specific exists
list: (params?: Record<string, unknown>) => [...]
const user: any = ...
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

## Checklists

### New Resource
1. `services/{resource}.ts` - Service with CRUD
2. `lib/queryKeys.ts` - Add query keys
3. Pages: List, Create, Detail, Edit
4. Run `npm run typecheck && npm run lint`

### New Language
1. Create `src/i18n/messages/{locale}.json`
2. Add to `src/i18n/config.ts`
3. Import in `src/components/AntdThemeProvider.tsx`
