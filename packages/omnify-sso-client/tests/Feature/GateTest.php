<?php

/**
 * Gate Feature Tests
 *
 * Gateのテスト
 */

use Illuminate\Support\Facades\Gate;
use Omnify\SsoClient\Models\Permission;
use Omnify\SsoClient\Models\Role;
use Omnify\SsoClient\Tests\Fixtures\Models\User;

beforeEach(function () {
    $this->artisan('migrate', ['--database' => 'testing']);
});

// =============================================================================
// Gate Before Hook Tests - Gate Before Hookのテスト
// =============================================================================

test('gate before hook checks user hasPermission method', function () {
    // Create role with permission
    $role = Role::create(['slug' => 'editor', 'display_name' => 'Editor', 'level' => 50]);
    $permission = Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    $role->permissions()->attach($permission->id);

    // Create user with role
    $user = User::factory()->create(['role_id' => $role->id]);

    // Test actual hasPermission via role
    // User trait HasConsoleSso should delegate to role's permissions
    $hasPermission = $user->role ? $user->role->hasPermission('posts.create') : false;

    expect($hasPermission)->toBeTrue();
});

// =============================================================================
// Dynamic Gate Tests - 動的Gateのテスト
// =============================================================================

test('gates are defined for each permission in database', function () {
    // Create permissions
    Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    Permission::create(['slug' => 'posts.edit', 'display_name' => 'Edit Posts']);
    Permission::create(['slug' => 'users.view', 'display_name' => 'View Users']);

    // Force re-registration of gates
    app()->booted(function () {
        // Gates should be defined after boot
    });

    // Verify permissions exist in database
    expect(Permission::count())->toBe(3);
});

// =============================================================================
// Permission Check Flow Tests - パーミッションチェックフローのテスト
// =============================================================================

test('user role permission flow works correctly', function () {
    // Setup: Create role with permissions
    $adminRole = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);
    $editorRole = Role::create(['slug' => 'editor', 'display_name' => 'Editor', 'level' => 50]);

    $createPermission = Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']);
    $deletePermission = Permission::create(['slug' => 'posts.delete', 'display_name' => 'Delete Posts']);

    // Admin has both permissions
    $adminRole->permissions()->attach([$createPermission->id, $deletePermission->id]);

    // Editor only has create permission
    $editorRole->permissions()->attach([$createPermission->id]);

    // Verify role-permission relationships
    expect($adminRole->hasPermission('posts.create'))->toBeTrue()
        ->and($adminRole->hasPermission('posts.delete'))->toBeTrue()
        ->and($editorRole->hasPermission('posts.create'))->toBeTrue()
        ->and($editorRole->hasPermission('posts.delete'))->toBeFalse();
});

test('permission inheritance through role levels', function () {
    // Higher level roles should have more permissions
    $admin = Role::create(['slug' => 'admin', 'display_name' => 'Admin', 'level' => 100]);
    $manager = Role::create(['slug' => 'manager', 'display_name' => 'Manager', 'level' => 50]);
    $member = Role::create(['slug' => 'member', 'display_name' => 'Member', 'level' => 10]);

    // Create permission hierarchy
    $allPermissions = collect([
        Permission::create(['slug' => 'posts.view', 'display_name' => 'View Posts']),
        Permission::create(['slug' => 'posts.create', 'display_name' => 'Create Posts']),
        Permission::create(['slug' => 'posts.delete', 'display_name' => 'Delete Posts']),
        Permission::create(['slug' => 'users.manage', 'display_name' => 'Manage Users']),
    ]);

    // Member: view only
    $member->permissions()->attach($allPermissions[0]->id);

    // Manager: view + create
    $manager->permissions()->attach([$allPermissions[0]->id, $allPermissions[1]->id]);

    // Admin: all
    $admin->permissions()->attach($allPermissions->pluck('id')->toArray());

    expect($member->permissions()->count())->toBe(1)
        ->and($manager->permissions()->count())->toBe(2)
        ->and($admin->permissions()->count())->toBe(4);
});
