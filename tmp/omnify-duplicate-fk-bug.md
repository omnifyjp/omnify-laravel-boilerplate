# Bug Report: Duplicate Column Generation with Explicit FK + Association

## Environment
- **omnify-cli version**: 0.0.133
- **omnify version**: 1.0.137
- **omnify-laravel version**: 0.0.93

## Bug Description

When a schema defines **both** an explicit foreign key property AND an Association pointing to the same target, the generator creates duplicate column definitions in the migration file.

## Schema Example

```yaml
# TeamPermission.yaml
displayName:
  ja: チーム権限
  en: Team Permission

options:
  timestamps: true
  softDelete: true
  indexes:
    - columns: [console_org_id]
  unique:
    - [console_team_id, permission_id]

properties:
  console_team_id:
    type: BigInt
    unsigned: true

  console_org_id:
    type: BigInt
    unsigned: true

  # Explicit FK column
  permission_id:
    type: BigInt
    unsigned: true

  # Association that also targets Permission
  permission:
    type: Association
    relation: ManyToOne
    target: Permission
    onDelete: CASCADE
```

## Generated Migration (Buggy Output)

```php
Schema::create('team_permissions', function (Blueprint $table) {
    $table->id();
    $table->bigInteger('console_team_id')->unsigned();
    $table->bigInteger('console_org_id')->unsigned();
    $table->bigInteger('permission_id')->unsigned();           // From explicit property
    $table->unsignedBigInteger('permission_id');               // From Association - DUPLICATE!
    $table->timestamp('created_at')->nullable();
    $table->timestamp('updated_at')->nullable();
    $table->timestamp('deleted_at')->nullable();
    $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('CASCADE');
    // ...
});
```

## Expected Behavior

The generator should detect that `permission_id` is already defined by the explicit property and NOT create another column from the Association. Expected output:

```php
Schema::create('team_permissions', function (Blueprint $table) {
    $table->id();
    $table->bigInteger('console_team_id')->unsigned();
    $table->bigInteger('console_org_id')->unsigned();
    $table->bigInteger('permission_id')->unsigned();           // Only once
    $table->timestamp('created_at')->nullable();
    $table->timestamp('updated_at')->nullable();
    $table->timestamp('deleted_at')->nullable();
    $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('CASCADE');
    // ...
});
```

## Root Cause Analysis

The migration generator processes:
1. Regular properties → creates `permission_id` column
2. Association properties → creates `permission_id` column again (from `permission` → `permission_id`)

There's no deduplication logic to check if the FK column already exists.

## Suggested Fix

### Add Schema Validation ERROR (Block Generation)

The validator MUST detect this pattern and **fail with error** during `omnify generate`:

```typescript
// In schema validator
function validateAssociations(schema: Schema): ValidationResult[] {
  const errors: ValidationResult[] = [];
  
  for (const [propName, prop] of Object.entries(schema.properties)) {
    if (prop.type === 'Association' && prop.relation === 'ManyToOne') {
      const expectedFkColumn = `${propName}_id`; // "permission" → "permission_id"
      
      if (schema.properties[expectedFkColumn]) {
        errors.push({
          level: 'error',
          code: 'E301',
          message: `Duplicate FK definition: Property '${expectedFkColumn}' conflicts with Association '${propName}'. Cannot have both.`,
          location: `${schema.name}.yaml`,
          suggestion: `Choose one approach:\n  1. Use Association only (remove '${expectedFkColumn}' property)\n  2. Use explicit FK only (remove '${propName}' Association)`
        });
      }
    }
  }
  
  return errors;
}
```

**Example CLI Output:**
```
→ Validating schemas...
✗ Schema validation failed. Fix errors before generating.

[E301] TeamPermission.yaml: Duplicate FK definition
  Property 'permission_id' conflicts with Association 'permission'.
  
  Choose one approach:
    1. Use Association only (remove 'permission_id' property)
    2. Use explicit FK only (remove 'permission' Association)
```

## Valid Patterns (Choose ONE)

### Option 1: Use Association Only (Recommended)

Let Association auto-generate the FK column. Use `pivotFields` for custom column options:

```yaml
# TeamPermission.yaml
properties:
  console_team_id:
    type: BigInt
    unsigned: true

  console_org_id:
    type: BigInt
    unsigned: true

  # Association auto-generates 'permission_id' column
  permission:
    type: Association
    relation: ManyToOne
    target: Permission
    onDelete: CASCADE
    pivotFields:
      permission_id:
        comment: 'Permission ID'  # Custom options via pivotFields
```

**Generated Migration:**
```php
$table->bigInteger('console_team_id')->unsigned();
$table->bigInteger('console_org_id')->unsigned();
$table->unsignedBigInteger('permission_id')->comment('Permission ID');
$table->foreign('permission_id')->references('id')->on('permissions')->onDelete('CASCADE');
```

**Generated Model:**
```php
public function permission(): BelongsTo
{
    return $this->belongsTo(Permission::class);
}
```

### Option 2: Use Separate Table Without Association

If you need full control over the FK column and don't need relationship methods:

```yaml
# TeamPermission.yaml
properties:
  console_team_id:
    type: BigInt
    unsigned: true

  console_org_id:
    type: BigInt
    unsigned: true

  # Explicit FK column only - NO Association
  permission_id:
    type: BigInt
    unsigned: true
    comment: 'Permission ID'
    # Note: You must manually add foreign key constraint in migration
    # or use 'references' option if supported
```

**Generated Migration:**
```php
$table->bigInteger('console_team_id')->unsigned();
$table->bigInteger('console_org_id')->unsigned();
$table->bigInteger('permission_id')->unsigned()->comment('Permission ID');
// No automatic foreign key - add manually if needed
```

**Generated Model:**
```php
// No relationship methods - access via $model->permission_id only
```

## Impact

- **Severity**: High - Generated migrations fail to run
- **Error**: `SQLSTATE[42S21]: Column already exists: 1060 Duplicate column name 'permission_id'`

## Suggested Test Cases

### Validation Tests (Must Block Generation)

```typescript
describe('Schema Validator - Duplicate FK Detection', () => {
  it('should ERROR when explicit FK and Association both exist', () => {
    const schema = {
      name: 'TeamPermission',
      properties: {
        permission_id: { type: 'BigInt', unsigned: true },
        permission: { 
          type: 'Association', 
          relation: 'ManyToOne', 
          target: 'Permission' 
        }
      }
    };
    
    const result = validateSchema(schema);
    
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'E301',
        message: expect.stringContaining('Duplicate FK definition')
      })
    );
    expect(result.isValid).toBe(false);
  });

  it('should PASS when only Association exists (recommended pattern)', () => {
    const schema = {
      name: 'TeamPermission',
      properties: {
        permission: { 
          type: 'Association', 
          relation: 'ManyToOne', 
          target: 'Permission' 
        }
      }
    };
    
    const result = validateSchema(schema);
    
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({ code: 'E301' })
    );
    expect(result.isValid).toBe(true);
  });

  it('should PASS when only explicit FK exists (no Association)', () => {
    const schema = {
      name: 'TeamPermission',
      properties: {
        permission_id: { type: 'BigInt', unsigned: true }
        // No Association - valid pattern
      }
    };
    
    const result = validateSchema(schema);
    
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({ code: 'E301' })
    );
    expect(result.isValid).toBe(true);
  });

  it('should PASS when FK column name differs from association name', () => {
    const schema = {
      name: 'TeamPermission',
      properties: {
        perm_id: { type: 'BigInt', unsigned: true },  // Different name
        permission: { 
          type: 'Association', 
          relation: 'ManyToOne', 
          target: 'Permission' 
        }
      }
    };
    
    const result = validateSchema(schema);
    
    // No error because 'perm_id' !== 'permission_id'
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({ code: 'E301' })
    );
  });

  it('should detect duplicate FK with various naming conventions', () => {
    const testCases = [
      { assocName: 'permission', fkName: 'permission_id', shouldError: true },
      { assocName: 'userRole', fkName: 'user_role_id', shouldError: true },
      { assocName: 'createdBy', fkName: 'created_by_id', shouldError: true },
      { assocName: 'permission', fkName: 'perm_id', shouldError: false },
      { assocName: 'role', fkName: 'role_id', shouldError: true },
    ];
    
    testCases.forEach(({ assocName, fkName, shouldError }) => {
      const schema = {
        name: 'Test',
        properties: {
          [fkName]: { type: 'BigInt' },
          [assocName]: { type: 'Association', relation: 'ManyToOne', target: 'Target' }
        }
      };
      
      const result = validateSchema(schema);
      const hasError = result.errors.some(e => e.code === 'E301');
      
      expect(hasError).toBe(shouldError);
    });
  });

  it('should suggest both valid options in error message', () => {
    const schema = {
      name: 'TeamPermission',
      properties: {
        permission_id: { type: 'BigInt' },
        permission: { type: 'Association', relation: 'ManyToOne', target: 'Permission' }
      }
    };
    
    const result = validateSchema(schema);
    const error = result.errors.find(e => e.code === 'E301');
    
    expect(error?.suggestion).toContain('Use Association only');
    expect(error?.suggestion).toContain('Use explicit FK only');
  });
});
```

## Additional Notes

This bug was discovered while setting up SSO schemas from an external package (`omnify-sso-client`). The pattern of defining explicit FK + Association is common when:
1. You need custom column options (comments, specific type)
2. You want both the raw FK value AND the relationship methods in the model

Please prioritize this fix as it blocks migration generation for valid schema patterns.
