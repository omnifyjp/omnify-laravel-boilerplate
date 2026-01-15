<?php

namespace Omnify\SsoClient\Models;

use Omnify\SsoClient\Models\OmnifyBase\PermissionBaseModel;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Permission Model
 *
 * This file is generated once and can be customized.
 * Add your custom methods and logic here.
 */
class Permission extends PermissionBaseModel
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
