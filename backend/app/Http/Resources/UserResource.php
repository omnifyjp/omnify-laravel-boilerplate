<?php

/**
 * User Resource
 *
 * SAFE TO EDIT - This file is never overwritten by Omnify.
 */

namespace App\Http\Resources;

use Illuminate\Http\Request;
use App\Http\Resources\OmnifyBase\UserResourceBase;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'User',
    description: 'User resource',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name_lastname', type: 'string', maxLength: 50, example: '田中'),
        new OA\Property(property: 'name_firstname', type: 'string', maxLength: 50, example: '太郎'),
        new OA\Property(property: 'name_kana_lastname', type: 'string', maxLength: 100, example: 'タナカ'),
        new OA\Property(property: 'name_kana_firstname', type: 'string', maxLength: 100, example: 'タロウ'),
        new OA\Property(property: 'name_full_name', type: 'string', example: '田中 太郎', description: 'Computed: lastname + firstname'),
        new OA\Property(property: 'name_full_name_kana', type: 'string', example: 'タナカ タロウ', description: 'Computed: kana lastname + firstname'),
        new OA\Property(property: 'email', type: 'string', format: 'email', example: 'tanaka@example.com'),
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
            // Override: ensure ISO 8601 format for datetime
            'email_verified_at' => $this->email_verified_at?->toISOString(),
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
