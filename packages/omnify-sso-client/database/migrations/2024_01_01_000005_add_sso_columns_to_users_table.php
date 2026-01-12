<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'console_user_id')) {
                $table->unsignedBigInteger('console_user_id')->unique()->nullable()->after('id');
            }

            if (! Schema::hasColumn('users', 'console_access_token')) {
                $table->text('console_access_token')->nullable()->after('remember_token');
            }

            if (! Schema::hasColumn('users', 'console_refresh_token')) {
                $table->text('console_refresh_token')->nullable()->after('console_access_token');
            }

            if (! Schema::hasColumn('users', 'console_token_expires_at')) {
                $table->timestamp('console_token_expires_at')->nullable()->after('console_refresh_token');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'console_user_id',
                'console_access_token',
                'console_refresh_token',
                'console_token_expires_at',
            ]);
        });
    }
};
