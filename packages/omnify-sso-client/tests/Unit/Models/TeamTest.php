<?php

/**
 * Team Model Unit Tests
 *
 * チームモデルのユニットテスト
 */

use Omnify\SsoClient\Models\Permission;
use Omnify\SsoClient\Models\Team;

beforeEach(function () {
    $this->artisan('migrate', ['--database' => 'testing']);
});

// =============================================================================
// Basic Model Tests - 基本モデルテスト
// =============================================================================

test('can create team', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Development Team',
    ]);

    expect($team)->toBeInstanceOf(Team::class)
        ->and($team->console_team_id)->toBe(12345)
        ->and($team->console_org_id)->toBe(100)
        ->and($team->name)->toBe('Development Team');
});

test('console_team_id and console_org_id are cast to integer', function () {
    $team = Team::create([
        'console_team_id' => '12345',
        'console_org_id' => '100',
        'name' => 'Test Team',
    ]);

    expect($team->console_team_id)->toBeInt()
        ->and($team->console_org_id)->toBeInt();
});

// =============================================================================
// Soft Delete Tests - ソフトデリートテスト
// =============================================================================

test('team uses soft deletes', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Deletable Team',
    ]);

    $team->delete();

    expect(Team::find($team->id))->toBeNull()
        ->and(Team::withTrashed()->find($team->id))->not->toBeNull();
});

test('soft deleted team can be restored', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Restorable Team',
    ]);

    $team->delete();
    expect(Team::find($team->id))->toBeNull();

    $team->restore();
    expect(Team::find($team->id))->not->toBeNull();
});

// =============================================================================
// Relationship Tests - リレーションシップテスト
// =============================================================================

test('team has many permissions', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Dev Team',
    ]);
    $permission1 = Permission::create(['slug' => 'projects.view', 'display_name' => 'View Projects']);
    $permission2 = Permission::create(['slug' => 'projects.edit', 'display_name' => 'Edit Projects']);

    $team->permissions()->attach([$permission1->id, $permission2->id]);

    expect($team->permissions)->toHaveCount(2);
});

// =============================================================================
// Permission Check Tests - パーミッションチェックテスト
// =============================================================================

test('hasPermission returns true when team has permission', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Dev Team',
    ]);
    $permission = Permission::create(['slug' => 'projects.view', 'display_name' => 'View Projects']);
    $team->permissions()->attach($permission->id);

    expect($team->hasPermission('projects.view'))->toBeTrue();
});

test('hasPermission returns false when team does not have permission', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Basic Team',
    ]);

    expect($team->hasPermission('projects.view'))->toBeFalse();
});

test('hasAnyPermission returns true when team has at least one permission', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Dev Team',
    ]);
    $permission = Permission::create(['slug' => 'projects.view', 'display_name' => 'View Projects']);
    $team->permissions()->attach($permission->id);

    expect($team->hasAnyPermission(['projects.view', 'projects.delete']))->toBeTrue();
});

test('hasAllPermissions returns true when team has all permissions', function () {
    $team = Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Full Access Team',
    ]);
    $permission1 = Permission::create(['slug' => 'projects.view', 'display_name' => 'View Projects']);
    $permission2 = Permission::create(['slug' => 'projects.edit', 'display_name' => 'Edit Projects']);
    $team->permissions()->attach([$permission1->id, $permission2->id]);

    expect($team->hasAllPermissions(['projects.view', 'projects.edit']))->toBeTrue();
});

// =============================================================================
// Static Method Tests - 静的メソッドテスト
// =============================================================================

test('findByConsoleId finds team by console_team_id', function () {
    Team::create([
        'console_team_id' => 12345,
        'console_org_id' => 100,
        'name' => 'Dev Team',
    ]);

    $found = Team::findByConsoleId(12345);

    expect($found)->not->toBeNull()
        ->and($found->name)->toBe('Dev Team');
});

test('findByConsoleId returns null when not found', function () {
    $found = Team::findByConsoleId(99999);

    expect($found)->toBeNull();
});

test('getByOrgId returns teams for organization', function () {
    Team::create(['console_team_id' => 1, 'console_org_id' => 100, 'name' => 'Team 1']);
    Team::create(['console_team_id' => 2, 'console_org_id' => 100, 'name' => 'Team 2']);
    Team::create(['console_team_id' => 3, 'console_org_id' => 200, 'name' => 'Other Org Team']);

    $teams = Team::getByOrgId(100);

    expect($teams)->toHaveCount(2);
});
