<?php

/**
 * Role Model Unit Tests
 *
 * ロールモデルのユニットテスト
 */

use Omnify\SsoClient\Models\Permission;
use Omnify\SsoClient\Models\Role;

beforeEach(function () {
    $this->artisan('migrate', ['--database' => 'testing']);
});

// =============================================================================
// Basic Model Tests - 基本モデルテスト
// =============================================================================

test('can create role', function () {
    $role = Role::create([
        'slug' => 'admin',
        'display_name' => 'Administrator',
        'level' => 100,
        'description' => 'Full access',
    ]);

    expect($role)->toBeInstanceOf(Role::class)
        ->and($role->slug)->toBe('admin')
        ->and($role->display_name)->toBe('Administrator')
        ->and($role->level)->toBe(100);
});

test('level is cast to integer', function () {
    $role = Role::create([
        'slug' => 'test',
        'display_name' => 'Test',
        'level' => '50',
    ]);

    expect($role->level)->toBeInt();
});

// =============================================================================
// Relationship Tests - リレーションシップテスト
// =============================================================================

test('role has many permissions', function () {
    $role = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);
    $permission1 = Permission::create(['slug' => 'users.create', 'display_name' => 'Create Users']);
    $permission2 = Permission::create(['slug' => 'users.delete', 'display_name' => 'Delete Users']);

    $role->permissions()->attach([$permission1->id, $permission2->id]);

    expect($role->permissions)->toHaveCount(2);
});

test('permissions relationship includes timestamps', function () {
    $role = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);
    $permission = Permission::create(['slug' => 'users.create', 'display_name' => 'Create Users']);

    $role->permissions()->attach($permission->id);

    $pivot = $role->permissions()->first()->pivot;
    expect($pivot->created_at)->not->toBeNull()
        ->and($pivot->updated_at)->not->toBeNull();
});

// =============================================================================
// Permission Check Tests - パーミッションチェックテスト
// =============================================================================

test('hasPermission returns true when role has permission', function () {
    $role = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);
    $permission = Permission::create(['slug' => 'users.create', 'display_name' => 'Create Users']);
    $role->permissions()->attach($permission->id);

    expect($role->hasPermission('users.create'))->toBeTrue();
});

test('hasPermission returns false when role does not have permission', function () {
    $role = Role::create(['slug' => 'member', 'display_name' => 'Member', 'level' => 10]);

    expect($role->hasPermission('users.create'))->toBeFalse();
});

test('hasAnyPermission returns true when role has at least one permission', function () {
    $role = Role::create(['slug' => 'editor', 'display_name' => 'Editor', 'level' => 50]);
    $permission = Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    $role->permissions()->attach($permission->id);

    expect($role->hasAnyPermission(['posts.create', 'posts.delete']))->toBeTrue();
});

test('hasAnyPermission returns false when role has none of the permissions', function () {
    $role = Role::create(['slug' => 'member', 'display_name' => 'Member', 'level' => 10]);

    expect($role->hasAnyPermission(['posts.create', 'posts.delete']))->toBeFalse();
});

test('hasAllPermissions returns true when role has all permissions', function () {
    $role = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);
    $permission1 = Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    $permission2 = Permission::create(['slug' => 'posts.delete', 'display_name' => 'Delete Posts']);
    $role->permissions()->attach([$permission1->id, $permission2->id]);

    expect($role->hasAllPermissions(['posts.create', 'posts.delete']))->toBeTrue();
});

test('hasAllPermissions returns false when role is missing some permissions', function () {
    $role = Role::create(['slug' => 'editor', 'display_name' => 'Editor', 'level' => 50]);
    $permission = Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    Permission::create(['slug' => 'posts.delete', 'display_name' => 'Delete Posts']);
    $role->permissions()->attach($permission->id);

    expect($role->hasAllPermissions(['posts.create', 'posts.delete']))->toBeFalse();
});
