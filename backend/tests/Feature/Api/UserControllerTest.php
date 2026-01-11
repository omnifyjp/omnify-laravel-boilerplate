<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// =============================================================================
// INDEX (GET /api/users)
// =============================================================================

describe('GET /api/users', function () {

    // 正常系 (Normal Cases)

    it('正常: returns paginated users', function () {
        User::factory()->count(15)->create();

        $response = $this->getJson('/api/users');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name_lastname', 'name_firstname', 'email']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonCount(10, 'data');
    });

    it('正常: filters users by search term', function () {
        User::factory()->create(['name_lastname' => 'Tanaka']);
        User::factory()->create(['name_lastname' => 'Yamada']);

        $response = $this->getJson('/api/users?filter[search]=Tanaka');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    });

    it('正常: sorts users by specified field', function () {
        User::factory()->create(['name_lastname' => 'B']);
        User::factory()->create(['name_lastname' => 'A']);

        $response = $this->getJson('/api/users?sort=name_lastname');

        $response->assertOk();
        expect($response->json('data.0.name_lastname'))->toBe('A');
    });

    it('正常: paginates with custom per_page', function () {
        User::factory()->count(10)->create();

        $response = $this->getJson('/api/users?per_page=5');

        $response->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.per_page', 5);
    });

    // 異常系 (Abnormal Cases)

    it('異常: returns empty array when no users exist', function () {
        $response = $this->getJson('/api/users');

        $response->assertOk()
            ->assertJsonCount(0, 'data');
    });

    it('異常: returns 400 for invalid sort field', function () {
        User::factory()->create(['name_lastname' => 'A']);

        // Invalid sort field - Spatie returns 400 Bad Request
        $response = $this->getJson('/api/users?sort=invalid_column');

        $response->assertBadRequest();
    });
});

// =============================================================================
// STORE (POST /api/users)
// =============================================================================

describe('POST /api/users', function () {

    // 正常系 (Normal Cases)

    it('正常: creates user with valid data', function () {
        $data = validUserData();

        $response = $this->postJson('/api/users', $data);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'tanaka@example.com');

        $this->assertDatabaseHas('users', ['email' => 'tanaka@example.com']);
    });

    // 異常系 (Abnormal Cases)

    it('異常: fails with missing required fields', function () {
        $response = $this->postJson('/api/users', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name_lastname',
                'name_firstname',
                'name_kana_lastname',
                'name_kana_firstname',
                'email',
                'password',
            ]);
    });

    it('異常: fails with invalid email format', function () {
        $response = $this->postJson('/api/users', validUserData([
            'email' => 'invalid-email',
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('異常: fails with duplicate email', function () {
        User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->postJson('/api/users', validUserData([
            'email' => 'existing@example.com',
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('異常: fails with password too short', function () {
        $response = $this->postJson('/api/users', validUserData([
            'password' => '123',
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    });
});

// =============================================================================
// SHOW (GET /api/users/{id})
// =============================================================================

describe('GET /api/users/{id}', function () {

    // 正常系 (Normal Cases)

    it('正常: returns user by id', function () {
        $user = User::factory()->create();

        $response = $this->getJson("/api/users/{$user->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);
    });

    // 異常系 (Abnormal Cases)

    it('異常: returns 404 for nonexistent user', function () {
        $response = $this->getJson('/api/users/99999');

        $response->assertNotFound();
    });
});

// =============================================================================
// UPDATE (PUT /api/users/{id})
// =============================================================================

describe('PUT /api/users/{id}', function () {

    // 正常系 (Normal Cases)

    it('正常: updates user with valid data', function () {
        $user = User::factory()->create();

        $response = $this->putJson("/api/users/{$user->id}", [
            'name_lastname' => 'Yamada',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name_lastname', 'Yamada');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name_lastname' => 'Yamada',
        ]);
    });

    it('正常: allows partial update', function () {
        $user = User::factory()->create(['name_lastname' => 'Tanaka']);

        $response = $this->putJson("/api/users/{$user->id}", [
            'name_firstname' => 'Jiro',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name_lastname' => 'Tanaka',
            'name_firstname' => 'Jiro',
        ]);
    });

    it('正常: allows keeping same email', function () {
        $user = User::factory()->create(['email' => 'same@example.com']);

        $response = $this->putJson("/api/users/{$user->id}", [
            'email' => 'same@example.com',
        ]);

        $response->assertOk();
    });

    // 異常系 (Abnormal Cases)

    it('異常: returns 404 for nonexistent user', function () {
        $response = $this->putJson('/api/users/99999', [
            'name_lastname' => 'Yamada',
        ]);

        $response->assertNotFound();
    });

    it('異常: fails with duplicate email', function () {
        $user1 = User::factory()->create(['email' => 'user1@example.com']);
        User::factory()->create(['email' => 'user2@example.com']);

        $response = $this->putJson("/api/users/{$user1->id}", [
            'email' => 'user2@example.com',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('異常: fails with invalid email format', function () {
        $user = User::factory()->create();

        $response = $this->putJson("/api/users/{$user->id}", [
            'email' => 'invalid-email',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('異常: fails with password too short', function () {
        $user = User::factory()->create();

        $response = $this->putJson("/api/users/{$user->id}", [
            'password' => '123',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    });
});

// =============================================================================
// DESTROY (DELETE /api/users/{id})
// =============================================================================

describe('DELETE /api/users/{id}', function () {

    // 正常系 (Normal Cases)

    it('正常: deletes user', function () {
        $user = User::factory()->create();

        $response = $this->deleteJson("/api/users/{$user->id}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    });

    // 異常系 (Abnormal Cases)

    it('異常: returns 404 for nonexistent user', function () {
        $response = $this->deleteJson('/api/users/99999');

        $response->assertNotFound();
    });
});

// =============================================================================
// JAPANESE FIELD VALIDATION
// =============================================================================

describe('Japanese field validation', function () {

    it('異常: fails with hiragana in kana field', function () {
        $response = $this->postJson('/api/users', validUserData([
            'name_kana_lastname' => 'たなか',
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name_kana_lastname']);
    });

    it('異常: fails with romaji in kana field', function () {
        $response = $this->postJson('/api/users', validUserData([
            'name_kana_lastname' => 'Tanaka',
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name_kana_lastname']);
    });

    it('正常: accepts valid katakana', function () {
        $response = $this->postJson('/api/users', validUserData([
            'email' => 'katakana@example.com',
            'name_kana_lastname' => 'タナカ',
            'name_kana_firstname' => 'タロウ',
        ]));

        $response->assertCreated();
    });

    it('正常: accepts katakana with long vowel mark', function () {
        $response = $this->postJson('/api/users', validUserData([
            'email' => 'longvowel@example.com',
            'name_kana_lastname' => 'サトー',
            'name_kana_firstname' => 'ユーコ',
        ]));

        $response->assertCreated();
    });

    it('異常: fails with name exceeding max length', function () {
        $response = $this->postJson('/api/users', validUserData([
            'name_lastname' => str_repeat('a', 51),
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name_lastname']);
    });
});
