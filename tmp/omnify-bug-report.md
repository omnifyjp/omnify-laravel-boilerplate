# Omnify Generator Bug Report

## Summary

Migration generator tạo ra **duplicate columns** khi schema có cả ManyToMany Association và explicit foreign key columns.

---

## Bug 1: Duplicate columns trong pivot table (ManyToMany)

### Reproduction

**Schema: `Role.yaml`**
```yaml
properties:
  # ... other properties ...
  
  permissions:
    type: Association
    relation: ManyToMany
    target: Permission
    joinTable: role_permissions
    owning: true
```

**Schema: `Permission.yaml`**
```yaml
properties:
  # ... other properties ...
  
  roles:
    type: Association
    relation: ManyToMany
    target: Role
    joinTable: role_permissions
    mappedBy: permissions
```

### Expected Migration Output

```php
Schema::create('role_permissions', function (Blueprint $table) {
    $table->unsignedBigInteger('role_id');
    $table->unsignedBigInteger('permission_id');
    $table->timestamp('created_at')->nullable();
    $table->timestamp('updated_at')->nullable();
    
    $table->primary(['role_id', 'permission_id']);
    $table->foreign('role_id')->references('id')->on('roles')->onDelete('CASCADE');
    $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('CASCADE');
});
```

### Actual Migration Output (BUG)

```php
Schema::create('role_permissions', function (Blueprint $table) {
    $table->bigInteger('role_id')->primary()->unsigned();        // ❌ primary() on single column
    $table->bigInteger('permission_id')->primary()->unsigned();  // ❌ primary() on single column  
    $table->unsignedBigInteger('role_id');                       // ❌ DUPLICATE column!
    $table->unsignedBigInteger('permission_id');                 // ❌ DUPLICATE column!
    $table->timestamp('created_at')->nullable();
    $table->timestamp('updated_at')->nullable();
    $table->foreign('role_id')->references('id')->on('roles')->onDelete('CASCADE');
    $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('CASCADE');
    $table->index('role_id');
    $table->index('permission_id');
});
```

### Issues

1. **Duplicate columns**: `role_id` và `permission_id` được định nghĩa 2 lần
2. **Primary key syntax sai**: `->primary()` được gọi trên từng column riêng lẻ thay vì composite primary key `$table->primary(['role_id', 'permission_id'])`
3. **Không cần index riêng**: Khi có foreign key, index đã được tự động tạo

---

## Bug 2: Duplicate columns khi có explicit FK column + Association

### Reproduction

**Schema: `TeamPermission.yaml`**
```yaml
properties:
  permission_id:
    type: BigInt
    unsigned: true
    displayName:
      ja: 権限ID
      en: Permission ID

  permission:
    type: Association
    relation: ManyToOne
    target: Permission
    onDelete: CASCADE
```

### Expected Migration Output

Generator nên detect rằng `permission_id` column đã được định nghĩa explicit, và Association chỉ cần tạo foreign key constraint.

```php
Schema::create('team_permissions', function (Blueprint $table) {
    $table->id();
    $table->bigInteger('console_team_id')->unsigned();
    $table->bigInteger('console_org_id')->unsigned();
    $table->bigInteger('permission_id')->unsigned();  // ✅ Chỉ 1 lần
    $table->timestamps();
    $table->softDeletes();
    
    $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('CASCADE');
    $table->index('console_org_id');
    $table->unique(['console_team_id', 'permission_id']);
});
```

### Actual Migration Output (BUG)

```php
Schema::create('team_permissions', function (Blueprint $table) {
    $table->id();
    $table->bigInteger('console_team_id')->unsigned();
    $table->bigInteger('console_org_id')->unsigned();
    $table->bigInteger('permission_id')->unsigned();      // Line 1
    $table->unsignedBigInteger('permission_id');          // ❌ DUPLICATE!
    // ...
});
```

---

## Bug 3: Partial schema với Association không tạo FK column

### Reproduction

**Schema: `UserSsoPartial.yaml`** (kind: partial, target: User)
```yaml
kind: partial
target: User

properties:
  console_user_id:
    type: BigInt
    unsigned: true
    unique: true
    
  # ... other SSO fields ...
    
  role:
    type: Association
    relation: ManyToOne
    target: Role
    nullable: true
```

### Expected Migration Output

`update_users_table.php`:
```php
Schema::table('users', function (Blueprint $table) {
    $table->bigInteger('console_user_id')->unsigned()->unique();
    $table->text('console_access_token')->nullable();
    $table->text('console_refresh_token')->nullable();
    $table->timestamp('console_token_expires_at')->nullable();
    $table->unsignedBigInteger('role_id')->nullable();  // ✅ FK column cho Association
    
    $table->foreign('role_id')->references('id')->on('roles')->nullOnDelete();
});
```

### Actual Migration Output (BUG)

```php
Schema::table('users', function (Blueprint $table) {
    $table->bigInteger('console_user_id')->unique();
    $table->text('console_access_token')->nullable();
    $table->text('console_refresh_token')->nullable();
    $table->timestamp('console_token_expires_at')->nullable();
    $table->string('name')->change();  // ❌ Unrelated change
    // ❌ MISSING: role_id column và foreign key!
});
```

---

## Root Cause Analysis

1. **Pivot table generation**: Generator không check xem Association đã có explicit columns hay chưa trước khi tạo thêm columns từ ManyToMany relationship.

2. **ManyToOne + explicit FK**: Khi schema có cả:
   - Explicit column: `permission_id: { type: BigInt }`
   - Association: `permission: { type: Association, relation: ManyToOne, target: Permission }`
   
   Generator tạo column 2 lần thay vì detect và reuse existing column.

3. **Composite primary key**: Generator gọi `->primary()` trên từng column riêng thay vì sau cùng gọi `$table->primary(['col1', 'col2'])`.

---

## Suggested Fixes

### Fix 1: Detect existing columns before creating from Association

```typescript
// Trong laravel-generator migration builder
function buildManyToOneColumn(prop: AssociationProperty, existingColumns: Set<string>) {
  const fkColumn = `${prop.target.toLowerCase()}_id`;
  
  // Skip nếu column đã được định nghĩa explicit
  if (existingColumns.has(fkColumn)) {
    return null; // Chỉ tạo foreign key constraint
  }
  
  return createColumn(fkColumn, { type: 'BigInt', unsigned: true, nullable: prop.nullable });
}
```

### Fix 2: Composite primary key cho pivot tables

```typescript
function buildPivotTable(relation: ManyToManyRelation) {
  const columns = [];
  const primaryColumns = [];
  
  // Tạo columns
  columns.push(createColumn(relation.localKey, { type: 'BigInt', unsigned: true }));
  columns.push(createColumn(relation.foreignKey, { type: 'BigInt', unsigned: true }));
  primaryColumns.push(relation.localKey, relation.foreignKey);
  
  // Primary key ở cuối
  return {
    columns,
    constraints: [
      `$table->primary([${primaryColumns.map(c => `'${c}'`).join(', ')}]);`
    ]
  };
}
```

### Fix 3: Check existing columns trong pivot table

Khi tạo pivot table từ ManyToMany, check xem RolePermission schema có tồn tại và đã định nghĩa columns chưa. Nếu có, skip auto-generation.

---

## Test Cases cần thêm

### Test 1: ManyToMany pivot table generation

```typescript
describe('ManyToMany pivot table', () => {
  it('should create composite primary key, not individual primary keys', async () => {
    const schemas = {
      Role: {
        properties: {
          permissions: {
            type: 'Association',
            relation: 'ManyToMany',
            target: 'Permission',
            joinTable: 'role_permissions',
            owning: true,
          }
        }
      },
      Permission: {
        properties: {
          roles: {
            type: 'Association',
            relation: 'ManyToMany',
            target: 'Role',
            joinTable: 'role_permissions',
            mappedBy: 'permissions',
          }
        }
      }
    };
    
    const migration = generateMigration(schemas, 'role_permissions');
    
    // Should have composite primary key
    expect(migration).toContain("$table->primary(['role_id', 'permission_id'])");
    
    // Should NOT have individual primary() calls
    expect(migration).not.toMatch(/->primary\(\).*role_id/);
    expect(migration).not.toMatch(/->primary\(\).*permission_id/);
    
    // Should NOT have duplicate columns
    const roleIdMatches = migration.match(/role_id/g);
    expect(roleIdMatches?.length).toBeLessThanOrEqual(3); // column, primary, foreign
  });

  it('should not create duplicate columns when explicit FK exists', async () => {
    const schemas = {
      TeamPermission: {
        properties: {
          permission_id: {
            type: 'BigInt',
            unsigned: true,
          },
          permission: {
            type: 'Association',
            relation: 'ManyToOne',
            target: 'Permission',
            onDelete: 'CASCADE',
          }
        }
      }
    };
    
    const migration = generateMigration(schemas, 'team_permissions');
    
    // Should only have ONE permission_id column definition
    const columnDefs = migration.match(/\$table->.*permission_id.*\(/g);
    expect(columnDefs?.length).toBe(1);
  });
});
```

### Test 2: Partial schema with Association

```typescript
describe('Partial schema with Association', () => {
  it('should create FK column from Association in partial schema', async () => {
    const schemas = {
      User: {
        properties: {
          email: { type: 'Email' },
        }
      }
    };
    
    const partialSchemas = {
      UserSso: {
        kind: 'partial',
        target: 'User',
        properties: {
          console_user_id: {
            type: 'BigInt',
            unsigned: true,
          },
          role: {
            type: 'Association',
            relation: 'ManyToOne',
            target: 'Role',
            nullable: true,
          }
        }
      }
    };
    
    const mergedSchemas = mergePartials(schemas, partialSchemas);
    const migration = generateUpdateMigration(mergedSchemas.User, 'users');
    
    // Should have role_id column
    expect(migration).toContain('role_id');
    expect(migration).toContain('nullable');
    
    // Should have foreign key
    expect(migration).toContain("foreign('role_id')");
  });
});
```

### Test 3: Explicit pivot table schema

```typescript
describe('Explicit pivot table schema', () => {
  it('should not auto-generate pivot when schema exists', async () => {
    const schemas = {
      Role: {
        properties: {
          permissions: {
            type: 'Association',
            relation: 'ManyToMany',
            target: 'Permission',
            joinTable: 'role_permissions',
            owning: true,
          }
        }
      },
      Permission: { /* ... */ },
      // Explicit pivot table schema
      RolePermission: {
        options: { id: false, timestamps: true },
        properties: {
          role_id: { type: 'BigInt', unsigned: true, primary: true },
          permission_id: { type: 'BigInt', unsigned: true, primary: true },
        }
      }
    };
    
    const migrations = generateMigrations(schemas);
    
    // Should use explicit RolePermission schema, not auto-generate
    const pivotMigration = migrations.find(m => m.table === 'role_permissions');
    expect(pivotMigration?.source).toBe('RolePermission'); // Not auto-generated
  });
});
```

---

## Priority

**High** - Migrations với duplicate columns sẽ fail khi chạy `php artisan migrate`.

---

## Environment

- `@famgia/omnify-cli`: (check version)
- `@famgia/omnify-laravel`: (check version)
- Database: MySQL 8

---

## Workaround

Tạm thời sửa migration files bằng tay sau khi generate:

1. Xóa duplicate column definitions
2. Sửa `->primary()` thành composite: `$table->primary(['col1', 'col2'])`
3. Thêm missing `role_id` column cho User
