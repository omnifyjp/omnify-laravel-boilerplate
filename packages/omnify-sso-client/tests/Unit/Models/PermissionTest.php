<?php

/**
 * Permission Model Unit Tests
 *
 * パーミッションモデルのユニットテスト
 */

use Omnify\SsoClient\Models\Permission;
use Omnify\SsoClient\Models\Role;

beforeEach(function () {
    $this->artisan('migrate', ['--database' => 'testing']);
});

// =============================================================================
// Basic Model Tests - 基本モデルテスト
// =============================================================================

test('can create permission', function () {
    $permission = Permission::create([
        'slug' => 'posts.create',
        'display_name' => 'Create Posts',
        'group' => 'posts',
        'description' => 'Can create new posts',
    ]);

    expect($permission)->toBeInstanceOf(Permission::class)
        ->and($permission->slug)->toBe('posts.create')
        ->and($permission->display_name)->toBe('Create Posts')
        ->and($permission->group)->toBe('posts');
});

test('group can be null', function () {
    $permission = Permission::create([
        'slug' => 'global.permission',
        'display_name' => 'Global Permission',
    ]);

    expect($permission->group)->toBeNull();
});

// =============================================================================
// Relationship Tests - リレーションシップテスト
// =============================================================================

test('permission belongs to many roles', function () {
    $permission = Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    $role1 = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);
    $role2 = Role::create(['slug' => 'editor', 'display_name' => 'Editor', 'level' => 50]);

    $permission->roles()->attach([$role1->id, $role2->id]);

    expect($permission->roles)->toHaveCount(2);
});

test('roles relationship includes timestamps', function () {
    $permission = Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    $role = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);

    $permission->roles()->attach($role->id);

    $pivot = $permission->roles()->first()->pivot;
    expect($pivot->created_at)->not->toBeNull()
        ->and($pivot->updated_at)->not->toBeNull();
});

// =============================================================================
// Query Tests - クエリテスト
// =============================================================================

test('can filter by group', function () {
    Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts', 'group' => 'posts']);
    Permission::create(['slug' => 'posts.edit', 'display_name' => 'Edit Posts', 'group' => 'posts']);
    Permission::create(['slug' => 'users.view', 'display_name' => 'View Users', 'group' => 'users']);

    $postsPermissions = Permission::where('group', 'posts')->get();

    expect($postsPermissions)->toHaveCount(2);
});

test('can get distinct groups', function () {
    Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts', 'group' => 'posts']);
    Permission::create(['slug' => 'posts.edit', 'display_name' => 'Edit Posts', 'group' => 'posts']);
    Permission::create(['slug' => 'users.view', 'display_name' => 'View Users', 'group' => 'users']);
    Permission::create(['slug' => 'global', 'display_name' => 'Global', 'group' => null]);

    $groups = Permission::distinct()->pluck('group')->filter()->values();

    expect($groups)->toHaveCount(2)
        ->and($groups->toArray())->toContain('posts', 'users');
});
