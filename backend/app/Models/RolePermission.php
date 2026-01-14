<?php

namespace App\Models;

use App\Models\OmnifyBase\RolePermissionBaseModel;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * RolePermission Model
 *
 * This file is generated once and can be customized.
 * Add your custom methods and logic here.
 */
class RolePermission extends RolePermissionBaseModel
{
    use HasFactory;

    /**
     * Create a new model instance.
     */
    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
    }

    // Add your custom methods here
}
