<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name_lastname', 50)->comment('Name (Lastname)');
            $table->string('name_firstname', 50)->comment('Name (Firstname)');
            $table->string('name_kana_lastname', 100)->nullable()->comment('Name (KanaLastname)');
            $table->string('name_kana_firstname', 100)->nullable()->comment('Name (KanaFirstname)');
            $table->string('email')->unique()->comment('Email');
            $table->timestamp('email_verified_at')->nullable()->comment('Email Verified At');
            $table->string('password')->comment('Password');
            $table->string('remember_token', 100)->nullable()->comment('Remember Token');
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
