# Omnify Schema Format Guide

## Schema Location

All schemas are stored in `schemas/` directory with `.yaml` extension.

## Object Schema Structure

```yaml
# yaml-language-server: $schema=./node_modules/.omnify/combined-schema.json
name: ModelName          # Required: PascalCase
kind: object             # Optional: 'object' (default) or 'enum'
displayName:             # Optional: i18n display name
  ja: 日本語名
  en: English Name
description:             # Optional: i18n description
  ja: 説明文
  en: Description
group: group-name        # Optional: for organizing schemas
options:
  softDelete: true       # Enable soft delete (deleted_at column)
  timestamps: true       # Enable created_at, updated_at
  table: custom_table    # Custom table name
properties:
  # Property definitions here
```

## Property Types

### String Types
| Type | Description | Options |
|------|-------------|---------|
| `String` | Short text (varchar) | `maxLength`, `minLength`, `default` |
| `LongText` | Long text (text) | `default` |

### Numeric Types
| Type | Description | Options |
|------|-------------|---------|
| `Int` | Integer | `min`, `max`, `default`, `unsigned` |
| `BigInt` | Big integer | `min`, `max`, `default`, `unsigned` |
| `Float` | Decimal | `precision`, `scale`, `default` |

### Other Types
| Type | Description | Options |
|------|-------------|---------|
| `Boolean` | True/false | `default` |
| `Date` | Date only | `default` |
| `DateTime` | Date and time | `default` |
| `Json` | JSON object | `default` |
| `EnumRef` | Reference to enum | `enum` (required), `default` |

### Association Type
| Type | Description | Options |
|------|-------------|---------|
| `Association` | Relation | `relation`, `target`, `onDelete`, `mappedBy` |

## Property Options

```yaml
properties:
  name:
    type: String
    displayName:
      ja: 名前
      en: Name
    required: true           # Not nullable
    unique: true            # Unique constraint
    index: true             # Create index
    maxLength: 255          # For String
    default: 'default'      # Default value
```

## Association Relations

### ManyToOne (N:1)
```yaml
author:
  type: Association
  relation: ManyToOne
  target: User
  onDelete: CASCADE        # CASCADE, SET_NULL, RESTRICT
```

### OneToMany (1:N)
```yaml
posts:
  type: Association
  relation: OneToMany
  target: Post
  mappedBy: author         # Property name in Post that references this
```

### ManyToMany (N:M)
```yaml
tags:
  type: Association
  relation: ManyToMany
  target: Tag
  pivotTable: post_tags    # Optional: custom pivot table name
  pivotFields:             # Optional: extra pivot fields
    - name: order
      type: Int
      default: 0
```

### OneToOne (1:1)
```yaml
profile:
  type: Association
  relation: OneToOne
  target: Profile
  onDelete: CASCADE
```

## Enum Schema

```yaml
name: PostStatus
kind: enum
displayName:
  ja: 投稿ステータス
  en: Post Status
values:
  draft: ドラフト          # value: displayName format
  published: 公開済み
  archived: アーカイブ
```

Use enum in object schema:
```yaml
status:
  type: EnumRef
  enum: PostStatus         # Reference enum name
  default: draft           # Default value from enum
```

## MCP Tools

If Omnify MCP is configured, these tools are available:
- `omnify_create_schema` - Generate schema YAML
- `omnify_validate_schema` - Validate YAML content
- `omnify_get_types` - Property types documentation
- `omnify_get_relationships` - Relationship guide
- `omnify_get_examples` - Example schemas
