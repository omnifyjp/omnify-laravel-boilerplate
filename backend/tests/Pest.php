<?php

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

uses(Tests\TestCase::class)->in('Feature', 'Unit');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
*/

/**
 * Generate valid user data for testing
 */
function validUserData(array $overrides = []): array
{
    return array_merge([
        'name_lastname' => '田中',
        'name_firstname' => '太郎',
        'name_kana_lastname' => 'タナカ',
        'name_kana_firstname' => 'タロウ',
        'email' => 'tanaka@example.com',
        'password' => 'password123',
    ], $overrides);
}
