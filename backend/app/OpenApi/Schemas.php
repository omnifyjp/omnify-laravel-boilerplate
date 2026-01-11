<?php

/**
 * Reusable OpenAPI Components
 *
 * - Parameters: QueryPage, QueryPerPage, PathId (common for all)
 * - Responses: ValidationError, NotFound, etc.
 * - Pagination: PaginationMeta, PaginationLinks
 *
 * Resource-specific (inline in Controller):
 * - filter[search] - search fields differ per resource
 * - sort - allowed sorts differ per resource
 *
 * Resource schemas → Define on each Resource/Request class
 */

namespace App\OpenApi;

use OpenApi\Attributes as OA;

// ============================================================================
// COMMON PARAMETERS (same for all endpoints)
// ============================================================================

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
#[OA\Response(response: 'Created', description: 'Resource created')]
#[OA\Response(response: 'NoContent', description: 'Deleted')]
#[OA\Response(response: 'NotFound', description: 'Not found')]
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
}

// ============================================================================
// PAGINATION SCHEMAS (common for all list endpoints)
// ============================================================================

#[OA\Schema(
    schema: 'PaginationMeta',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', example: 1),
        new OA\Property(property: 'from', type: 'integer', nullable: true, example: 1),
        new OA\Property(property: 'last_page', type: 'integer', example: 10),
        new OA\Property(property: 'per_page', type: 'integer', example: 10),
        new OA\Property(property: 'to', type: 'integer', nullable: true, example: 10),
        new OA\Property(property: 'total', type: 'integer', example: 100),
    ]
)]
class PaginationMetaSchema
{
}

#[OA\Schema(
    schema: 'PaginationLinks',
    properties: [
        new OA\Property(property: 'first', type: 'string', nullable: true),
        new OA\Property(property: 'last', type: 'string', nullable: true),
        new OA\Property(property: 'prev', type: 'string', nullable: true),
        new OA\Property(property: 'next', type: 'string', nullable: true),
    ]
)]
class PaginationLinksSchema
{
}
