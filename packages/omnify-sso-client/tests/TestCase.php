<?php

namespace Omnify\SsoClient\Tests;

use Orchestra\Testbench\TestCase as OrchestraTestCase;
use Omnify\SsoClient\SsoClientServiceProvider;

/**
 * Base TestCase
 * 
 * テストの基底クラス
 */
abstract class TestCase extends OrchestraTestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            SsoClientServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('sso-client.console_url', 'https://test.console.omnify.jp');
        $app['config']->set('sso-client.service_slug', 'test-service');
        $app['config']->set('sso-client.service_secret', 'test-secret');
    }
}
