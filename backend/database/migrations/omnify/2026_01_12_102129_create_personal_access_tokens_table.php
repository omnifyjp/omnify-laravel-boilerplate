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
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->enum('tokenable_type', ['User']);
            $table->unsignedBigInteger('tokenable_id');
            $table->text('name')->comment('Name');
            $table->string('token', 64)->unique()->comment('Token');
            $table->text('abilities')->nullable()->comment('Abilities');
            $table->timestamp('last_used_at')->nullable()->comment('Last Used At');
            $table->timestamp('expires_at')->nullable()->comment('Expires At');
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->index(['tokenable_type', 'tokenable_id']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
