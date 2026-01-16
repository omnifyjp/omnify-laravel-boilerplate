<?php

/**
 * User Update Request
 *
 * SAFE TO EDIT - This file is never overwritten by Omnify.
 */

namespace App\Http\Requests;

use OpenApi\Attributes as OA;
use App\Http\Requests\OmnifyBase\UserUpdateRequestBase;

#[OA\Schema(
    schema: 'UserUpdateRequest',
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255),
        new OA\Property(property: 'email', type: 'string', format: 'email', maxLength: 255, example: 'user@example.com'),
        new OA\Property(property: 'password', type: 'string', format: 'password', maxLength: 255, example: 'password123'),
        new OA\Property(property: 'console_user_id', type: 'integer', example: 1),
        new OA\Property(property: 'console_access_token', type: 'string'),
        new OA\Property(property: 'console_refresh_token', type: 'string'),
        new OA\Property(property: 'console_token_expires_at', type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z'),
        new OA\Property(property: 'role_id', type: 'integer', example: 1),
    ]
)]
class UserUpdateRequest extends UserUpdateRequestBase
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return array_merge($this->schemaRules(), [
            // Custom/override rules here
        ]);
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return array_merge($this->schemaAttributes(), [
            // Custom attributes here
        ]);
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            // Custom messages here
        ];
    }
}
