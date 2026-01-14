<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SsoInstallCommand extends Command
{
    protected $signature = 'sso:install
                            {--force : Overwrite existing files}';

    protected $description = 'Install SSO Client package';

    public function handle(): int
    {
        $this->info('Installing SSO Client...');

        // 1. Publish config (optional but recommended for customization)
        $this->publishConfig();

        // 2. Optionally publish migrations (they run automatically from package)
        if ($this->confirm('Publish migrations for customization? (Migrations run automatically from package)', false)) {
            $this->publishMigrations();
        }

        // 3. Check for Omnify and handle schemas
        $this->handleOmnifySchemas();

        // 4. Sync admin permissions
        $this->syncPermissions();

        // 5. Show next steps
        $this->showNextSteps();

        $this->newLine();
        $this->info('SSO Client installed successfully!');

        return self::SUCCESS;
    }

    protected function syncPermissions(): void
    {
        $this->newLine();

        if ($this->confirm('Sync admin permissions to database?', true)) {
            $this->call('sso:sync-permissions');
        } else {
            $this->line('Skipped. You can run "php artisan sso:sync-permissions" later.');
        }
    }

    protected function publishConfig(): void
    {
        $this->call('vendor:publish', [
            '--tag' => 'sso-client-config',
            '--force' => $this->option('force'),
        ]);
    }

    protected function publishMigrations(): void
    {
        $this->call('vendor:publish', [
            '--tag' => 'sso-client-migrations',
            '--force' => $this->option('force'),
        ]);
    }

    protected function handleOmnifySchemas(): void
    {
        // Check if Omnify is available
        $omnifyConfigPath = base_path('omnify.config.ts');

        if (! File::exists($omnifyConfigPath)) {
            $this->warn('Omnify config not found. Skipping schema setup.');
            $this->line('You need to manually add the SSO fields to your User migration.');

            return;
        }

        $this->info('Omnify detected. Schema path will be registered automatically.');
        $this->line('Package schemas are located at: vendor/omnify/sso-client/database/schemas/Sso/');

        // Check if User.yaml exists and has SSO fields
        $this->checkUserSchema();

        // Ask if user wants to run omnify generate
        if ($this->confirm('Do you want to run "npx omnify generate" now?', false)) {
            $this->call('shell:exec', ['command' => 'npx omnify generate']);
        }
    }

    protected function checkUserSchema(): void
    {
        // Try to find User.yaml in common locations
        $possiblePaths = [
            base_path('.omnify/schemas/User.yaml'),
            base_path('.omnify/schemas/Auth/User.yaml'),
            base_path('database/schemas/User.yaml'),
        ];

        $userSchemaPath = null;
        foreach ($possiblePaths as $path) {
            if (File::exists($path)) {
                $userSchemaPath = $path;
                break;
            }
        }

        if (! $userSchemaPath) {
            $this->warn('User.yaml schema not found.');
            $this->line('Make sure your User schema exists and the package\'s UserSso.yaml partial will extend it.');

            return;
        }

        $this->info("Found User schema at: {$userSchemaPath}");

        // Check if SSO fields are already present
        $content = File::get($userSchemaPath);

        if (str_contains($content, 'console_user_id')) {
            $this->line('SSO fields already present in User schema.');
        } else {
            $this->line('The UserSso.yaml partial schema will add SSO fields to your User model.');
        }
    }

    protected function showNextSteps(): void
    {
        $this->newLine();
        $this->info('Next Steps:');
        $this->newLine();

        $this->line('1. Add the HasConsoleSso trait to your User model:');
        $this->newLine();
        $this->line('   use Omnify\SsoClient\Models\Traits\HasConsoleSso;');
        $this->line('   use Omnify\SsoClient\Models\Traits\HasTeamPermissions;');
        $this->newLine();
        $this->line('   class User extends Authenticatable');
        $this->line('   {');
        $this->line('       use HasConsoleSso, HasTeamPermissions;');
        $this->line('       // ...');
        $this->line('   }');
        $this->newLine();

        $this->line('2. Add these environment variables to your .env:');
        $this->newLine();
        $this->line('   SSO_CONSOLE_URL=http://auth.test');
        $this->line('   SSO_SERVICE_SLUG=your-service-slug');
        $this->newLine();

        $this->line('3. Run migrations (package migrations run automatically):');
        $this->newLine();
        $this->line('   php artisan migrate');
        $this->newLine();

        $this->line('4. Sync admin permissions (if not done during install):');
        $this->newLine();
        $this->line('   php artisan sso:sync-permissions');
        $this->newLine();

        $this->line('5. To update permissions after package update:');
        $this->newLine();
        $this->line('   php artisan sso:sync-permissions --force');
    }
}
