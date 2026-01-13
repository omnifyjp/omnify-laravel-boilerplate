<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\Horizon;
use Laravel\Horizon\HorizonApplicationServiceProvider;

/**
 * Horizon Service Provider
 * 
 * ローカル環境でのみHorizonダッシュボードへのアクセスを許可する
 */
class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        parent::boot();

        // ローカル環境でのみHorizonを有効化
        Horizon::auth(function ($request) {
            return app()->environment('local');
        });
    }

    /**
     * Register the Horizon gate.
     *
     * ローカル環境以外ではアクセスを完全にブロック
     */
    protected function gate(): void
    {
        Gate::define('viewHorizon', function ($user = null) {
            // ローカル環境でのみアクセスを許可
            return app()->environment('local');
        });
    }
}
