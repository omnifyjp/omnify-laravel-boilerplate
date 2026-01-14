# Omnify Bug Report: Registered Schema Paths Not Loaded

## Summary

`storage/omnify/schema-paths.json` không được đọc khi chạy `npx omnify generate`. Schemas từ packages không được load.

---

## Reproduction

### 1. Setup

**File: `storage/omnify/schema-paths.json`**
```json
{
  "paths": [
    {
      "path": "./packages/omnify-sso-client/database/schemas",
      "namespace": "Sso"
    }
  ]
}
```

**Package schemas exist:**
```
packages/omnify-sso-client/database/schemas/Sso/
├── Permission.yaml
├── Role.yaml
├── TeamPermission.yaml
└── UserSsoPartial.yaml
```

### 2. Run Generate

```bash
npx omnify generate --verbose
```

### 3. Expected Output

```
→ Loading schemas from /path/to/.omnify/schemas
  Found 9 schema(s) in main directory
→ Loading schemas from 1 registered path(s)
  • ./packages/omnify-sso-client/database/schemas: 4 schema(s)
  Total: 13 schema(s)
```

### 4. Actual Output (BUG)

```
→ Loading schemas from /path/to/.omnify/schemas
  Found 9 schema(s)
```

**Missing:**
- ❌ No "Loading schemas from registered path(s)" message
- ❌ Package schemas (Role, Permission, TeamPermission, UserSsoPartial) not loaded
- ❌ No migrations generated for SSO tables

---

## Root Cause

Looking at `packages/cli/src/commands/generate.ts`:

```typescript
// Line 85-100
async function loadRegisteredSchemaPaths(rootDir: string): Promise<RegisteredSchemaPath[]> {
  const schemaPathsFile = resolve(rootDir, 'storage/omnify/schema-paths.json');

  if (!existsSync(schemaPathsFile)) {
    return [];
  }

  try {
    const content = readFileSync(schemaPathsFile, 'utf-8');
    const data = JSON.parse(content) as { paths?: RegisteredSchemaPath[] };
    return data.paths ?? [];
  } catch {
    logger.debug('Could not read registered schema paths file');
    return [];
  }
}
```

And lines 705-719:
```typescript
// Load additional schemas from registered package paths
const additionalPaths = await loadRegisteredSchemaPaths(rootDir);
if (additionalPaths.length > 0) {
  logger.step(`Loading schemas from ${additionalPaths.length} registered path(s)`);
  for (const entry of additionalPaths) {
    if (existsSync(entry.path)) {
      const packageSchemas = await loadSchemas(entry.path);
      const count = Object.keys(packageSchemas).length;
      logger.debug(`  • ${entry.path}: ${count} schema(s)`);
      schemas = { ...packageSchemas, ...schemas };
    } else {
      logger.warn(`  • ${entry.path}: directory not found (skipped)`);
    }
  }
}
```

**Possible issues:**

1. **File not found**: `rootDir` might not resolve correctly
2. **Silent failure**: Catch block doesn't re-throw, just logs debug and returns `[]`
3. **Path resolution**: `entry.path` is relative (`./packages/...`) but might need to be resolved from `rootDir`

---

## Debug Steps

Add logging to verify:

```typescript
async function loadRegisteredSchemaPaths(rootDir: string): Promise<RegisteredSchemaPath[]> {
  const schemaPathsFile = resolve(rootDir, 'storage/omnify/schema-paths.json');
  
  // DEBUG: Log the path being checked
  console.log(`[DEBUG] Checking for schema-paths.json at: ${schemaPathsFile}`);
  console.log(`[DEBUG] File exists: ${existsSync(schemaPathsFile)}`);

  if (!existsSync(schemaPathsFile)) {
    console.log(`[DEBUG] File not found, returning empty array`);
    return [];
  }

  try {
    const content = readFileSync(schemaPathsFile, 'utf-8');
    console.log(`[DEBUG] File content: ${content}`);
    const data = JSON.parse(content) as { paths?: RegisteredSchemaPath[] };
    console.log(`[DEBUG] Parsed paths: ${JSON.stringify(data.paths)}`);
    return data.paths ?? [];
  } catch (error) {
    console.log(`[DEBUG] Error reading file: ${error}`);
    logger.debug('Could not read registered schema paths file');
    return [];
  }
}
```

---

## Suggested Fix

### Fix 1: Resolve relative paths from rootDir

```typescript
// Load additional schemas from registered package paths
const additionalPaths = await loadRegisteredSchemaPaths(rootDir);
if (additionalPaths.length > 0) {
  logger.step(`Loading schemas from ${additionalPaths.length} registered path(s)`);
  for (const entry of additionalPaths) {
    // FIX: Resolve relative path from rootDir
    const absolutePath = resolve(rootDir, entry.path);
    
    if (existsSync(absolutePath)) {
      const packageSchemas = await loadSchemas(absolutePath);
      const count = Object.keys(packageSchemas).length;
      logger.debug(`  • ${entry.path}: ${count} schema(s)`);
      schemas = { ...packageSchemas, ...schemas };
    } else {
      logger.warn(`  • ${entry.path}: directory not found (skipped)`);
    }
  }
}
```

### Fix 2: Better error handling

```typescript
async function loadRegisteredSchemaPaths(rootDir: string): Promise<RegisteredSchemaPath[]> {
  const schemaPathsFile = resolve(rootDir, 'storage/omnify/schema-paths.json');

  if (!existsSync(schemaPathsFile)) {
    logger.debug(`No registered schema paths file at: ${schemaPathsFile}`);
    return [];
  }

  try {
    const content = readFileSync(schemaPathsFile, 'utf-8');
    const data = JSON.parse(content) as { paths?: RegisteredSchemaPath[] };
    
    if (!data.paths || data.paths.length === 0) {
      logger.debug('No paths defined in schema-paths.json');
      return [];
    }
    
    logger.debug(`Found ${data.paths.length} registered schema path(s)`);
    return data.paths;
  } catch (error) {
    // Log actual error, not just debug message
    logger.warn(`Could not read schema-paths.json: ${(error as Error).message}`);
    return [];
  }
}
```

---

## Test Cases

### Test 1: Load from storage/omnify/schema-paths.json

```typescript
describe('loadRegisteredSchemaPaths', () => {
  it('should load paths from storage/omnify/schema-paths.json', async () => {
    const tmpDir = await createTempDir();
    
    // Create schema-paths.json
    const schemaPathsDir = join(tmpDir, 'storage/omnify');
    await mkdir(schemaPathsDir, { recursive: true });
    await writeFile(
      join(schemaPathsDir, 'schema-paths.json'),
      JSON.stringify({
        paths: [
          { path: './packages/my-package/schemas', namespace: 'MyPackage' }
        ]
      })
    );
    
    const result = await loadRegisteredSchemaPaths(tmpDir);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('./packages/my-package/schemas');
    expect(result[0].namespace).toBe('MyPackage');
  });

  it('should return empty array if file does not exist', async () => {
    const tmpDir = await createTempDir();
    
    const result = await loadRegisteredSchemaPaths(tmpDir);
    
    expect(result).toEqual([]);
  });

  it('should return empty array on invalid JSON', async () => {
    const tmpDir = await createTempDir();
    
    const schemaPathsDir = join(tmpDir, 'storage/omnify');
    await mkdir(schemaPathsDir, { recursive: true });
    await writeFile(
      join(schemaPathsDir, 'schema-paths.json'),
      'invalid json {'
    );
    
    const result = await loadRegisteredSchemaPaths(tmpDir);
    
    expect(result).toEqual([]);
  });
});
```

### Test 2: Merge schemas from multiple paths

```typescript
describe('generate with registered paths', () => {
  it('should merge schemas from main dir and registered paths', async () => {
    const tmpDir = await createTempDir();
    
    // Create main schemas
    await mkdir(join(tmpDir, '.omnify/schemas/Auth'), { recursive: true });
    await writeFile(
      join(tmpDir, '.omnify/schemas/Auth/User.yaml'),
      'displayName:\n  en: User\nproperties:\n  email:\n    type: Email'
    );
    
    // Create package schemas
    await mkdir(join(tmpDir, 'packages/sso/schemas/Sso'), { recursive: true });
    await writeFile(
      join(tmpDir, 'packages/sso/schemas/Sso/Role.yaml'),
      'displayName:\n  en: Role\nproperties:\n  name:\n    type: String'
    );
    
    // Create schema-paths.json
    await mkdir(join(tmpDir, 'storage/omnify'), { recursive: true });
    await writeFile(
      join(tmpDir, 'storage/omnify/schema-paths.json'),
      JSON.stringify({
        paths: [{ path: './packages/sso/schemas', namespace: 'Sso' }]
      })
    );
    
    // Run generate
    const result = await runGenerate({ cwd: tmpDir });
    
    // Should have both User and Role migrations
    expect(result.migrations).toContain('create_users_table.php');
    expect(result.migrations).toContain('create_roles_table.php');
  });

  it('should resolve relative paths from rootDir', async () => {
    const tmpDir = await createTempDir();
    
    // Create package with relative path
    await mkdir(join(tmpDir, 'packages/pkg/schemas'), { recursive: true });
    await writeFile(
      join(tmpDir, 'packages/pkg/schemas/Test.yaml'),
      'displayName:\n  en: Test\nproperties:\n  name:\n    type: String'
    );
    
    await mkdir(join(tmpDir, 'storage/omnify'), { recursive: true });
    await writeFile(
      join(tmpDir, 'storage/omnify/schema-paths.json'),
      JSON.stringify({
        paths: [{ path: './packages/pkg/schemas', namespace: null }]
      })
    );
    
    const paths = await loadRegisteredSchemaPaths(tmpDir);
    
    // Path should be resolvable
    const absolutePath = resolve(tmpDir, paths[0].path);
    expect(existsSync(absolutePath)).toBe(true);
  });
});
```

### Test 3: Partial schemas from packages

```typescript
describe('partial schemas from packages', () => {
  it('should merge partial schema from package into main schema', async () => {
    const tmpDir = await createTempDir();
    
    // Main User schema
    await mkdir(join(tmpDir, '.omnify/schemas/Auth'), { recursive: true });
    await writeFile(
      join(tmpDir, '.omnify/schemas/Auth/User.yaml'),
      `displayName:
  en: User
properties:
  email:
    type: Email
`
    );
    
    // Package partial
    await mkdir(join(tmpDir, 'packages/sso/schemas/Sso'), { recursive: true });
    await writeFile(
      join(tmpDir, 'packages/sso/schemas/Sso/UserSsoPartial.yaml'),
      `kind: partial
target: User
properties:
  console_user_id:
    type: BigInt
    unique: true
`
    );
    
    await mkdir(join(tmpDir, 'storage/omnify'), { recursive: true });
    await writeFile(
      join(tmpDir, 'storage/omnify/schema-paths.json'),
      JSON.stringify({
        paths: [{ path: './packages/sso/schemas', namespace: 'Sso' }]
      })
    );
    
    const schemas = await loadAllSchemas(tmpDir);
    
    // User should have merged properties
    expect(schemas.User.properties.email).toBeDefined();
    expect(schemas.User.properties.console_user_id).toBeDefined();
  });
});
```

---

## Priority

**High** - Package schemas are completely ignored, making modular schema design impossible.

---

## Workaround

Until fixed, copy schemas from package to main directory:

```bash
cp -r packages/omnify-sso-client/database/schemas/Sso .omnify/schemas/
```

Or create symlink:

```bash
ln -s ../../../packages/omnify-sso-client/database/schemas/Sso .omnify/schemas/Sso
```

---

## Environment

- `@famgia/omnify-cli`: (run `npm list @famgia/omnify-cli`)
- Node.js: (run `node -v`)
- OS: macOS
