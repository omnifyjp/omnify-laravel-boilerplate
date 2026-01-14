<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * テスト用SSO関連テーブル
 */
return new class extends Migration
{
    public function up(): void
    {
        // Permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('display_name', 100);
            $table->string('group', 50)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index('group');
        });

        // Roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('display_name', 100);
            $table->integer('level')->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Teams table
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('console_team_id')->unique();
            $table->unsignedBigInteger('console_org_id');
            $table->string('name', 100);
            $table->timestamps();
            $table->softDeletes();
            $table->index('console_org_id');
        });

        // Role-Permission pivot table
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('permission_id');
            $table->timestamps();
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->unique(['role_id', 'permission_id']);
            $table->index('role_id');
            $table->index('permission_id');
        });

        // Team-Permission pivot table
        Schema::create('team_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('team_id');
            $table->unsignedBigInteger('permission_id');
            $table->timestamps();
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->unique(['team_id', 'permission_id']);
            $table->index('team_id');
            $table->index('permission_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_permissions');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('teams');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
    }
};
