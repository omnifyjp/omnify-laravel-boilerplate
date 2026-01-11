<?php

/**
 * User Resource
 *
 * SAFE TO EDIT - This file is never overwritten by Omnify.
 */

namespace App\Http\Resources;

use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use App\Http\Resources\OmnifyBase\UserResourceBase;

#[OA\Schema(
    schema: 'User',
    description: 'User',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name_lastname', type: 'string', maxLength: 50),
        new OA\Property(property: 'name_firstname', type: 'string', maxLength: 50),
        new OA\Property(property: 'name_kana_lastname', type: 'string', maxLength: 100),
        new OA\Property(property: 'name_kana_firstname', type: 'string', maxLength: 100),
        new OA\Property(property: 'name_full_name', type: 'string'),
        new OA\Property(property: 'name_full_name_kana', type: 'string'),
        new OA\Property(property: 'email', type: 'string', format: 'email'),
        new OA\Property(property: 'email_verified_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class UserResource extends UserResourceBase
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return array_merge($this->schemaArray($request), [
            // Custom fields here
        ]);
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            // Additional metadata here
        ];
    }
}
