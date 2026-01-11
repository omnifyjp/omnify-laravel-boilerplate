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
        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique()->comment('UUID');
            $table->text('connection')->comment('Connection');
            $table->text('queue')->comment('Queue');
            $table->longText('payload')->comment('Payload');
            $table->longText('exception')->comment('Exception');
            $table->timestamp('failed_at')->useCurrent()->comment('Failed At');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('failed_jobs');
    }
};
