# Ant Design Guide

> **Related:** [README](./README.md) | [i18n](./i18n-guide.md)

## ⚠️ IMPORTANT: Use Ant Design First

**ALWAYS check if Ant Design has a component before creating your own.**

Ant Design provides 60+ components: https://ant.design/components/overview

```typescript
// ✅ DO: Use Ant Design components
import { Table, Form, Input, Button, Modal, Card, Descriptions } from "antd";

// ❌ DON'T: Create custom components that Ant Design already has
// DON'T create: CustomTable, CustomModal, CustomForm, CustomButton
// DON'T create: DataGrid, Popup, FormInput

// ✅ DO: Extend Ant Design if needed
function UserTable(props: { users: User[] }) {
  return <Table dataSource={props.users} columns={...} />; // Wraps AntD Table
}

// ❌ DON'T: Build from scratch
function UserTable(props: { users: User[] }) {
  return <table><tbody>{users.map(...)}</tbody></table>; // WRONG!
}
```

---

## ⚠️ No New Libraries Without Permission

**DO NOT install new npm packages without explicit user approval.**

```bash
# ❌ DON'T: Install without asking
npm install lodash
npm install moment
npm install react-table

# ✅ DO: Ask first
"Do you want to install library X for Y?"
```

**Already installed libraries (use these):**
- UI: `antd`, `@ant-design/icons`
- HTTP: `axios`
- State: `@tanstack/react-query`
- Styling: `tailwindcss`
- i18n: `next-intl`

---

## When to Create a Component

| Create Component                | Don't Create                  |
| ------------------------------- | ----------------------------- |
| Used in 2+ places               | Used only once                |
| Has own state/logic (>50 lines) | Simple markup (<30 lines)     |
| Needs unit testing              | Trivial display               |
| Complex props interface         | Few inline props              |
| **Ant Design doesn't have it**  | **Ant Design already has it** |

---

## Container vs Presentational

```typescript
// ============================================================================
// CONTAINER COMPONENT (Smart) - pages or complex components
// - Fetches data
// - Handles mutations
// - Contains business logic
// ============================================================================

// app/(dashboard)/users/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { userService, UserListParams } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { UserTable } from "@/components/tables/UserTable";

export default function UsersPage() {
  const [filters, setFilters] = useState<UserListParams>({ page: 1 });
  
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => userService.list(filters),
  });

  return (
    <UserTable 
      users={data?.data ?? []}
      loading={isLoading}
      pagination={data?.meta}
      onPageChange={(page) => setFilters({ ...filters, page })}
    />
  );
}

// ============================================================================
// PRESENTATIONAL COMPONENT (Dumb) - reusable UI
// - Receives data via props
// - No data fetching
// - No business logic
// ============================================================================

// components/tables/UserTable.tsx
import { Table } from "antd";
import type { User } from "@/types/model";
import type { PaginatedResponse } from "@/lib/api";

interface UserTableProps {
  users: User[];
  loading: boolean;
  pagination?: PaginatedResponse<User>["meta"];
  onPageChange: (page: number) => void;
}

export function UserTable({ users, loading, pagination, onPageChange }: UserTableProps) {
  return (
    <Table
      dataSource={users}
      loading={loading}
      rowKey="id"
      pagination={{
        current: pagination?.current_page,
        total: pagination?.total,
        onChange: onPageChange,
      }}
      columns={[
        { title: "ID", dataIndex: "id" },
        { title: "Name", dataIndex: "name" },
        { title: "Email", dataIndex: "email" },
      ]}
    />
  );
}
```

---

## Form Pattern with Laravel Validation

```typescript
"use client";

import { Form, Input, Button, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getFormErrors } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { userService } from "@/services/users";

export default function UserForm() {
  const t = useTranslations();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      message.success(t("messages.created"));
      form.resetFields();
    },
    onError: (error) => {
      // This maps Laravel's 422 { errors: { email: ["Already exists"] } }
      // to Ant Design's form.setFields format
      form.setFields(getFormErrors(error));
    },
  });

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values) => mutation.mutate(values)}
    >
      <Form.Item
        name="name"
        label={t("common.name")}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="email"
        label={t("auth.email")}
        rules={[{ required: true }, { type: "email" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={mutation.isPending}
        >
          {t("common.save")}
        </Button>
      </Form.Item>
    </Form>
  );
}
```

---

## Deprecated Props (v6+)

> ⚠️ **CRITICAL**: Always use the latest prop names. Using deprecated props will show console warnings.

| Component    | Deprecated                 | Use Instead             |
| ------------ | -------------------------- | ----------------------- |
| Space        | `direction`                | `orientation`           |
| Modal        | `visible`                  | `open`                  |
| Drawer       | `visible`                  | `open`                  |
| Dropdown     | `visible`                  | `open`                  |
| Tooltip      | `visible`                  | `open`                  |
| Popover      | `visible`                  | `open`                  |
| Popconfirm   | `visible`                  | `open`                  |
| Select       | `dropdownMatchSelectWidth` | `popupMatchSelectWidth` |
| TreeSelect   | `dropdownMatchSelectWidth` | `popupMatchSelectWidth` |
| Cascader     | `dropdownMatchSelectWidth` | `popupMatchSelectWidth` |
| AutoComplete | `dropdownMatchSelectWidth` | `popupMatchSelectWidth` |
| Table        | `filterDropdownVisible`    | `filterDropdownOpen`    |

```typescript
// ❌ DON'T: Use deprecated props
<Space direction="vertical">
<Modal visible={isOpen}>
<Dropdown visible={show}>

// ✅ DO: Use new props
<Space orientation="vertical">
<Modal open={isOpen}>
<Dropdown open={show}>
```

---

## Anti-Patterns

```typescript
// ❌ Creating components that Ant Design already has
function CustomButton({ children }) { ... }  // Use <Button> from antd
function CustomModal({ visible }) { ... }    // Use <Modal> from antd
function CustomTable({ data }) { ... }       // Use <Table> from antd
function DataGrid({ rows }) { ... }          // Use <Table> from antd

// ❌ Installing libraries without permission
npm install lodash          // Ask first!
npm install react-icons     // Use @ant-design/icons
npm install styled-components // Use Tailwind CSS

// ❌ API call in component (bypass service layer)
function UserList() {
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => axios.get("/api/users"), // WRONG: Use service
  });
}

// ❌ Business logic in component
function UserList() {
  const users = data?.filter(u => u.active).sort((a, b) => a.name > b.name);
  // Move to service or utility function
}

// ❌ Hardcoded strings - use i18n
<Button>Save</Button>         // WRONG
<Button>{t("common.save")}</Button>  // CORRECT

// ❌ Multiple sources of truth
const [users, setUsers] = useState([]); // Local state
const { data } = useQuery({ ... });     // Server state
// Pick one: TanStack Query for server data

// ❌ Prop drilling
<Parent data={data}>
  <Child data={data}>
    <GrandChild data={data} /> // Use Context or pass minimal props
  </Child>
</Parent>

// ❌ Giant components (>200 lines)
// Split into smaller components or extract hooks
```
