<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        User::factory()->create([
            'name_lastname' => '管理',
            'name_firstname' => '者',
            'name_kana_lastname' => 'カンリ',
            'name_kana_firstname' => 'シャ',
            'email' => 'admin@example.com',
        ]);

        // Create 100 random users
        $this->call([
            UserSeeder::class,
        ]);
    }
}
