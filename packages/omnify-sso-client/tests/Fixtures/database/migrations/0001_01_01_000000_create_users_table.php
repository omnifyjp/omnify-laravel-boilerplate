<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * テスト用テーブル (users, sessions)
 * 
 * Note: SSO tables (roles, permissions, teams, etc.) are loaded from package migrations.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Users table (test fixture - matches User schema from package)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->unsignedBigInteger('console_user_id')->nullable()->unique();
            $table->text('console_access_token')->nullable();
            $table->text('console_refresh_token')->nullable();
            $table->timestamp('console_token_expires_at')->nullable();
            $table->unsignedBigInteger('role_id')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        // Sessions table (for web auth)
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};
