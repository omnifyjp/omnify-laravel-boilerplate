# Omnify Laravel Generator Guide

This guide covers Laravel-specific features and generated code patterns for Omnify.

## Generated Files

When you run `npx omnify generate`, the following Laravel files are generated:

### Migrations
- `database/migrations/omnify/*.php` - Laravel migrations for each schema

### Models
- `app/Models/OmnifyBase/{ModelName}BaseModel.php` - Generated base models (DO NOT EDIT)
- `app/Models/{ModelName}.php` - Extendable model classes (safe to customize)

### Traits
- `app/Models/OmnifyBase/Traits/HasLocalizedDisplayName.php` - Localization trait

### Locales
- `app/Models/OmnifyBase/Locales/{ModelName}Locales.php` - i18n display names

## Model Structure

```php
// app/Models/User.php (YOUR customizations go here)
<?php
namespace App\Models;

use App\Models\OmnifyBase\UserBaseModel;

class User extends UserBaseModel
{
    // Add your custom methods, scopes, accessors, etc.
}
```

```php
// app/Models/OmnifyBase/UserBaseModel.php (DO NOT EDIT - auto-generated)
<?php
namespace App\Models\OmnifyBase;

use App\Models\OmnifyBase\Traits\HasLocalizedDisplayName;
use App\Models\OmnifyBase\Locales\UserLocales;

class UserBaseModel extends Model
{
    use HasLocalizedDisplayName;

    protected static array $localizedDisplayNames = UserLocales::DISPLAY_NAMES;
    protected static array $localizedPropertyDisplayNames = UserLocales::PROPERTY_DISPLAY_NAMES;

    protected $fillable = ['name', 'email', 'password'];
    protected $casts = [...];

    // Relations defined here
}
```

## Localization (i18n)

### Display Names
```php
// Get localized model name
User::getLocalizedDisplayName(); // Returns based on app()->getLocale()

// Get localized property name
User::getLocalizedPropertyDisplayName('email');
```

### Schema Definition
```yaml
# yaml-language-server: $schema=./node_modules/.omnify/combined-schema.json
name: User
displayName:
  ja: ユーザー
  en: User
properties:
  email:
    type: String
    displayName:
      ja: メールアドレス
      en: Email Address
```

## Relationships

### ManyToOne
```yaml
# In Post schema
author:
  type: Association
  relation: ManyToOne
  target: User
  onDelete: CASCADE
```

Generated:
```php
// PostBaseModel.php
public function author(): BelongsTo
{
    return $this->belongsTo(User::class);
}
```

### OneToMany
```yaml
# In User schema
posts:
  type: Association
  relation: OneToMany
  target: Post
  mappedBy: author
```

Generated:
```php
// UserBaseModel.php
public function posts(): HasMany
{
    return $this->hasMany(Post::class, 'author_id');
}
```

### ManyToMany
```yaml
# In Post schema
tags:
  type: Association
  relation: ManyToMany
  target: Tag
  pivotTable: post_tags
  pivotFields:
    - name: order
      type: Int
      default: 0
```

Generated:
```php
// PostBaseModel.php
public function tags(): BelongsToMany
{
    return $this->belongsToMany(Tag::class, 'post_tags')
        ->withPivot(['order']);
}
```

## Migration Options

### Soft Delete
```yaml
options:
  softDelete: true  # Adds deleted_at column and SoftDeletes trait
```

### Timestamps
```yaml
options:
  timestamps: true  # Adds created_at, updated_at columns
```

### Custom Table Name
```yaml
options:
  table: custom_table_name
```

## Enum Support

```yaml
# schemas/PostStatus.yaml
name: PostStatus
kind: enum
values:
  draft: 下書き
  published: 公開済み
  archived: アーカイブ
```

Usage in schema:
```yaml
status:
  type: EnumRef
  enum: PostStatus
  default: draft
```

Generated migration:
```php
$table->enum('status', ['draft', 'published', 'archived'])->default('draft');
```

## Commands

```bash
# Generate Laravel migrations and models
npx omnify generate --laravel

# Validate schemas
npx omnify validate

# Watch for changes
npx omnify watch --laravel
```

## Configuration

```javascript
// omnify.config.js
export default {
  schemasDir: './schemas',
  outputDir: './',
  laravel: {
    migrationsDir: 'database/migrations/omnify',
    modelsDir: 'app/Models',
    baseModelsDir: 'app/Models/OmnifyBase',
    namespace: 'App\\Models'
  }
};
```
