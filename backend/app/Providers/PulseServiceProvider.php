<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Pulse\Facades\Pulse;

/**
 * Pulse Service Provider
 * 
 * ローカル環境でのみPulseダッシュボードへのアクセスを許可する
 */
class PulseServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Pulseダッシュボードへのアクセス認証
        Gate::define('viewPulse', function ($user = null) {
            // ローカル環境でのみアクセスを許可
            return app()->environment('local');
        });

        // プロダクション環境ではPulseの記録を無効化
        if (! $this->app->environment('local')) {
            Pulse::stopRecording();
        }
    }
}
