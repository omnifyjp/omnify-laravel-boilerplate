<?php

/**
 * User Update Request
 *
 * SAFE TO EDIT - This file is never overwritten by Omnify.
 */

namespace App\Http\Requests;

use App\Http\Requests\OmnifyBase\UserUpdateRequestBase;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'UserUpdateRequest',
    properties: [
        new OA\Property(property: 'name_lastname', type: 'string', maxLength: 50, example: '山田'),
        new OA\Property(property: 'name_firstname', type: 'string', maxLength: 50, example: '花子'),
        new OA\Property(property: 'name_kana_lastname', type: 'string', maxLength: 100, example: 'ヤマダ'),
        new OA\Property(property: 'name_kana_firstname', type: 'string', maxLength: 100, example: 'ハナコ'),
        new OA\Property(property: 'email', type: 'string', format: 'email', example: 'yamada@example.com'),
        new OA\Property(property: 'password', type: 'string', format: 'password', minLength: 8),
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
            // Add email format validation
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($this->route('user'))],
            // Add password minimum length
            'password' => ['sometimes', 'string', 'min:8', 'max:255'],
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
