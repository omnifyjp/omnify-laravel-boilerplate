<?php

namespace Database\Factories;

use App\Models\RolePermission;
use Illuminate\Database\Eloquent\Factories\Factory;

use App\Models\Role;
use App\Models\Permission;

/**
 * @extends Factory<RolePermission>
 */
class RolePermissionFactory extends Factory
{
    protected $model = RolePermission::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'role_id' => fake()->numberBetween(1, 1000),
            'permission_id' => fake()->numberBetween(1, 1000),
            'role_id' => Role::query()->inRandomOrder()->first()?->id ?? Role::factory()->create()->id,
            'permission_id' => Permission::query()->inRandomOrder()->first()?->id ?? Permission::factory()->create()->id,
        ];
    }
}
