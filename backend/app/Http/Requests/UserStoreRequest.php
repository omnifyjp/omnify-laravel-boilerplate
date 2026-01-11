<?php

/**
 * User Store Request
 *
 * SAFE TO EDIT - This file is never overwritten by Omnify.
 */

namespace App\Http\Requests;

use App\Http\Requests\OmnifyBase\UserStoreRequestBase;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'UserStoreRequest',
    required: ['name_lastname', 'name_firstname', 'name_kana_lastname', 'name_kana_firstname', 'email', 'password'],
    properties: [
        new OA\Property(property: 'name_lastname', type: 'string', maxLength: 50, example: '田中'),
        new OA\Property(property: 'name_firstname', type: 'string', maxLength: 50, example: '太郎'),
        new OA\Property(property: 'name_kana_lastname', type: 'string', maxLength: 100, example: 'タナカ'),
        new OA\Property(property: 'name_kana_firstname', type: 'string', maxLength: 100, example: 'タロウ'),
        new OA\Property(property: 'email', type: 'string', format: 'email', maxLength: 255, example: 'tanaka@example.com'),
        new OA\Property(property: 'password', type: 'string', format: 'password', minLength: 8, maxLength: 255, example: 'password123'),
    ]
)]
class UserStoreRequest extends UserStoreRequestBase
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
            // Add email format validation
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            // Add password minimum length
            'password' => ['required', 'string', 'min:8', 'max:255'],
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
