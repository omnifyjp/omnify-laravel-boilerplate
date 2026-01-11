# OpenAPI Documentation Guide

> **Related:** [README](./README.md) | [Controller Guide](./controller-guide.md) | [Checklist](./checklist.md)

## Overview

This project uses [L5-Swagger](https://github.com/DarkaOnLine/L5-Swagger) with PHP 8 Attributes.

**Key files:**
- `app/OpenApi/Schemas.php` - Reusable components (parameters, responses)
- `app/Http/Controllers/*Controller.php` - Endpoint documentation

## Commands

```bash
./artisan l5-swagger:generate    # Generate OpenAPI JSON
# View at: https://api.{folder}.app/api/documentation
```

---

## Architecture

```
app/OpenApi/
└── Schemas.php              ← Define reusable components HERE

app/Http/Controllers/
└── UserController.php       ← Use $ref to reference components
```

---

## Step 1: Define Reusable Components

**File:** `app/OpenApi/Schemas.php`

```php
<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'My API',
    description: 'API documentation'
)]
#[OA\Server(url: '/api', description: 'API Server')]

// ============================================================================
// COMMON PARAMETERS
// ============================================================================

#[OA\Parameter(
    parameter: 'QuerySearch',
    name: 'search',
    in: 'query',
    description: 'Search term',
    schema: new OA\Schema(type: 'string')
)]
#[OA\Parameter(
    parameter: 'QueryPage',
    name: 'page',
    in: 'query',
    description: 'Page number',
    schema: new OA\Schema(type: 'integer', default: 1, minimum: 1)
)]
#[OA\Parameter(
    parameter: 'QueryPerPage',
    name: 'per_page',
    in: 'query',
    description: 'Items per page',
    schema: new OA\Schema(type: 'integer', default: 10, minimum: 1, maximum: 100)
)]
#[OA\Parameter(
    parameter: 'QuerySortBy',
    name: 'sort_by',
    in: 'query',
    description: 'Sort field',
    schema: new OA\Schema(type: 'string', default: 'id')
)]
#[OA\Parameter(
    parameter: 'QuerySortOrder',
    name: 'sort_order',
    in: 'query',
    description: 'Sort direction',
    schema: new OA\Schema(type: 'string', enum: ['asc', 'desc'], default: 'desc')
)]
#[OA\Parameter(
    parameter: 'PathId',
    name: 'id',
    in: 'path',
    required: true,
    description: 'Resource ID',
    schema: new OA\Schema(type: 'integer', minimum: 1)
)]

// ============================================================================
// COMMON RESPONSES
// ============================================================================

#[OA\Response(response: 'Success', description: 'Successful operation')]
#[OA\Response(response: 'Created', description: 'Resource created successfully')]
#[OA\Response(response: 'NoContent', description: 'Successfully deleted')]
#[OA\Response(response: 'NotFound', description: 'Resource not found')]
#[OA\Response(response: 'Unauthorized', description: 'Unauthenticated')]
#[OA\Response(response: 'Forbidden', description: 'Forbidden')]
#[OA\Response(
    response: 'ValidationError',
    description: 'Validation failed',
    content: new OA\JsonContent(
        properties: [
            new OA\Property(property: 'message', type: 'string', example: 'The given data was invalid.'),
            new OA\Property(property: 'errors', type: 'object', example: ['email' => ['The email has already been taken.']]),
        ]
    )
)]
class Schemas
{
    // This class exists only to hold OpenAPI attributes
}
```

---

## Step 2: Use $ref in Controllers

### Index (GET list)

```php
#[OA\Get(
    path: '/api/users',
    summary: 'List users',
    description: 'Paginated list with search and sorting',
    tags: ['Users'],
    parameters: [
        new OA\Parameter(ref: '#/components/parameters/QuerySearch'),
        new OA\Parameter(ref: '#/components/parameters/QueryPage'),
        new OA\Parameter(ref: '#/components/parameters/QueryPerPage'),
        new OA\Parameter(ref: '#/components/parameters/QuerySortBy'),
        new OA\Parameter(ref: '#/components/parameters/QuerySortOrder'),
    ],
    responses: [
        new OA\Response(ref: '#/components/responses/Success', response: 200),
    ]
)]
public function index(Request $request): AnonymousResourceCollection
```

### Store (POST)

```php
#[OA\Post(
    path: '/api/users',
    summary: 'Create user',
    description: 'Create a new user account',
    tags: ['Users'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name_lastname', 'name_firstname', 'email', 'password'],
            properties: [
                new OA\Property(property: 'name_lastname', type: 'string', maxLength: 50, example: '田中'),
                new OA\Property(property: 'name_firstname', type: 'string', maxLength: 50, example: '太郎'),
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'tanaka@example.com'),
                new OA\Property(property: 'password', type: 'string', format: 'password', minLength: 8),
            ]
        )
    ),
    responses: [
        new OA\Response(ref: '#/components/responses/Created', response: 201),
        new OA\Response(ref: '#/components/responses/ValidationError', response: 422),
    ]
)]
public function store(UserStoreRequest $request): UserResource
```

### Show (GET single)

```php
#[OA\Get(
    path: '/api/users/{id}',
    summary: 'Get user',
    description: 'Get user by ID',
    tags: ['Users'],
    parameters: [
        new OA\Parameter(ref: '#/components/parameters/PathId'),
    ],
    responses: [
        new OA\Response(ref: '#/components/responses/Success', response: 200),
        new OA\Response(ref: '#/components/responses/NotFound', response: 404),
    ]
)]
public function show(User $user): UserResource
```

### Update (PUT)

```php
#[OA\Put(
    path: '/api/users/{id}',
    summary: 'Update user',
    description: 'Update user (partial update supported)',
    tags: ['Users'],
    parameters: [
        new OA\Parameter(ref: '#/components/parameters/PathId'),
    ],
    requestBody: new OA\RequestBody(
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'name_lastname', type: 'string', maxLength: 50),
                new OA\Property(property: 'name_firstname', type: 'string', maxLength: 50),
                new OA\Property(property: 'email', type: 'string', format: 'email'),
                new OA\Property(property: 'password', type: 'string', format: 'password', minLength: 8),
            ]
        )
    ),
    responses: [
        new OA\Response(ref: '#/components/responses/Success', response: 200),
        new OA\Response(ref: '#/components/responses/NotFound', response: 404),
        new OA\Response(ref: '#/components/responses/ValidationError', response: 422),
    ]
)]
public function update(UserUpdateRequest $request, User $user): UserResource
```

### Destroy (DELETE)

```php
#[OA\Delete(
    path: '/api/users/{id}',
    summary: 'Delete user',
    description: 'Permanently delete user',
    tags: ['Users'],
    parameters: [
        new OA\Parameter(ref: '#/components/parameters/PathId'),
    ],
    responses: [
        new OA\Response(ref: '#/components/responses/NoContent', response: 204),
        new OA\Response(ref: '#/components/responses/NotFound', response: 404),
    ]
)]
public function destroy(User $user): JsonResponse
```

---

## Available Components

### Parameters (use with `ref: '#/components/parameters/...'`)

| Name             | Description                            |
| ---------------- | -------------------------------------- |
| `QuerySearch`    | Search term                            |
| `QueryPage`      | Page number (default: 1)               |
| `QueryPerPage`   | Items per page (default: 10, max: 100) |
| `QuerySortBy`    | Sort field (default: id)               |
| `QuerySortOrder` | Sort direction (asc/desc)              |
| `PathId`         | Resource ID in path                    |

### Responses (use with `ref: '#/components/responses/...'`)

| Name              | HTTP Code | Description          |
| ----------------- | --------- | -------------------- |
| `Success`         | 200       | Successful operation |
| `Created`         | 201       | Resource created     |
| `NoContent`       | 204       | Successfully deleted |
| `NotFound`        | 404       | Resource not found   |
| `ValidationError` | 422       | Validation failed    |
| `Unauthorized`    | 401       | Unauthenticated      |
| `Forbidden`       | 403       | Forbidden            |

---

## ⚠️ Important: Verify Fields Before Writing

**DO NOT make up fields!** Check these files first:

| What to Document    | Check This File                                                     |
| ------------------- | ------------------------------------------------------------------- |
| Request body fields | `app/Http/Requests/OmnifyBase/*RequestBase.php` → `schemaRules()`   |
| Response fields     | `app/Http/Resources/OmnifyBase/*ResourceBase.php` → `schemaArray()` |

---

## Adding New Components

### New Parameter

```php
// In app/OpenApi/Schemas.php
#[OA\Parameter(
    parameter: 'QueryStatus',      // Unique name
    name: 'status',                // Query param name
    in: 'query',
    description: 'Filter by status',
    schema: new OA\Schema(type: 'string', enum: ['active', 'inactive'])
)]
```

### New Response

```php
// In app/OpenApi/Schemas.php
#[OA\Response(
    response: 'PaymentRequired',
    description: 'Payment required'
)]
```

---

## Checklist

### Before Writing

- [ ] Check `OmnifyBase/*RequestBase.php` for request fields
- [ ] Check `OmnifyBase/*ResourceBase.php` for response fields
- [ ] DON'T make up fields that don't exist!

### Writing OpenAPI

- [ ] Add `#[OA\Tag]` to controller class
- [ ] Use `$ref` for common parameters (QuerySearch, QueryPage, etc.)
- [ ] Use `$ref` for common responses (Success, NotFound, etc.)
- [ ] Only write `requestBody` properties manually (match FormRequest)
- [ ] Use Japanese examples for JapaneseName fields

### After Writing

- [ ] Run `./artisan l5-swagger:generate`
- [ ] Verify at `/api/documentation`

---

## Anti-Patterns

```php
// ❌ BAD: Repeating common parameters
parameters: [
    new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer')),
    new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer')),
]

// ✅ GOOD: Use $ref
parameters: [
    new OA\Parameter(ref: '#/components/parameters/QueryPage'),
    new OA\Parameter(ref: '#/components/parameters/QueryPerPage'),
]

// ❌ BAD: Repeating response definitions
responses: [
    new OA\Response(response: 404, description: 'Resource not found'),
]

// ✅ GOOD: Use $ref
responses: [
    new OA\Response(ref: '#/components/responses/NotFound', response: 404),
]

// ❌ BAD: Making up fields
new OA\Property(property: 'username', ...)  // Does this exist?

// ✅ GOOD: Check OmnifyBase first, then write
// Checked: OmnifyBase/UserStoreRequestBase.php has name_lastname, name_firstname...
new OA\Property(property: 'name_lastname', type: 'string', example: '田中'),
```
