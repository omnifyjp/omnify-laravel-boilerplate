<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_permissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('console_team_id');
            $table->unsignedBigInteger('console_org_id')->index();
            $table->unsignedBigInteger('permission_id');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['console_team_id', 'permission_id']);
            $table->index('deleted_at');

            $table->foreign('permission_id')
                ->references('id')
                ->on('permissions')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_permissions');
    }
};
