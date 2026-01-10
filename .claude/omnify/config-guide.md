# Omnify Configuration Guide

## Configuration File

Create `omnify.config.ts` in project root:

```typescript
import { defineConfig } from '@famgia/omnify';

export default defineConfig({
  schemasDir: './schemas',

  database: {
    driver: 'mysql',  // 'mysql' | 'pgsql' | 'sqlite' | 'sqlsrv' | 'mariadb'
  },

  output: {
    laravel: {
      migrationsPath: './database/migrations/omnify',
      modelsPath: './app/Models',
      enumsPath: './app/Enums',
    },
    typescript: {
      path: './src/types/model',
      singleFile: false,
    },
  },

  // Multi-language support (optional)
  locale: {
    locales: ['en', 'ja', 'vi'],
    defaultLocale: 'en',
    fallbackLocale: 'en',
  },
});
```

## Configuration Options

### database (required)
| Option | Type | Description |
|--------|------|-------------|
| `driver` | string | Database driver: mysql, pgsql, sqlite, sqlsrv, mariadb |
| `devUrl` | string | Development database URL for Atlas diff |
| `enableFieldComments` | boolean | Enable field comments in migrations (MySQL) |

### output.laravel
| Option | Type | Description |
|--------|------|-------------|
| `migrationsPath` | string | Directory for generated migrations |
| `modelsPath` | string | Directory for generated models |
| `modelsNamespace` | string | PHP namespace for models |
| `factoriesPath` | string | Directory for generated factories |
| `enumsPath` | string | Directory for generated enums |
| `enumsNamespace` | string | PHP namespace for enums |

### output.typescript
| Option | Type | Description |
|--------|------|-------------|
| `path` | string | Output directory for TypeScript types |
| `singleFile` | boolean | Generate single file vs multiple files |
| `generateEnums` | boolean | Generate enum types |
| `generateRelationships` | boolean | Generate relationship types |
| `generateRules` | boolean | Generate Ant Design validation rules (default: true) |
| `validationTemplates` | object | Custom validation message templates |

#### Validation Templates

Customize validation messages for your locales:

```typescript
{
  output: {
    typescript: {
      validationTemplates: {
        required: {
          ja: '${displayName}を入力してください',
          en: '${displayName} is required',
        },
        maxLength: {
          ja: '${displayName}は${max}文字以内です',
          en: '${displayName} must be at most ${max} characters',
        },
        minLength: { /* ... */ },
        min: { /* ... */ },
        max: { /* ... */ },
        email: { /* ... */ },
        url: { /* ... */ },
        pattern: { /* ... */ },
      },
    },
  },
}
```

Built-in templates are available for: ja, en, vi, ko, zh

### locale (optional)
| Option | Type | Description |
|--------|------|-------------|
| `locales` | string[] | Supported locale codes: ['en', 'ja', 'vi'] |
| `defaultLocale` | string | Default locale for simple strings |
| `fallbackLocale` | string | Fallback when requested locale not found |

## Common Mistakes

**Wrong** - `locales` at root level:
```typescript
{
  locales: ['en', 'ja'],  // ERROR: locales not in OmnifyConfig
}
```

**Correct** - `locales` inside `locale` object:
```typescript
{
  locale: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
  },
}
```
