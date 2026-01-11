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
        Schema::create('job_batches', function (Blueprint $table) {
            $table->string('id')->primary()->comment('ID');
            $table->string('name')->comment('Name');
            $table->integer('total_jobs')->comment('Total Jobs');
            $table->integer('pending_jobs')->comment('Pending Jobs');
            $table->integer('failed_jobs')->comment('Failed Jobs');
            $table->longText('failed_job_ids')->comment('Failed Job IDs');
            $table->mediumText('options')->nullable()->comment('Options');
            $table->integer('cancelled_at')->nullable()->comment('Cancelled At');
            $table->integer('created_at')->comment('Created At');
            $table->integer('finished_at')->nullable()->comment('Finished At');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_batches');
    }
};
