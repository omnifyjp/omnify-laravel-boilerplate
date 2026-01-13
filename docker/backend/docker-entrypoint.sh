#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
until php -r "try { new PDO('mysql:host=mysql;dbname=omnify', 'omnify', 'secret'); exit(0); } catch (PDOException \$e) { exit(1); }" 2>/dev/null; do
  echo "  MySQL is unavailable - sleeping"
  sleep 2
done
echo "MySQL is ready"

# Update composer.json to use mounted packages path
if [ -d "/var/www/packages/omnify-sso-client" ]; then
    echo "Updating composer.json for Docker packages path..."
    sed -i 's|"url": "../packages/omnify-sso-client"|"url": "/var/www/packages/omnify-sso-client"|' composer.json || true
fi

# Install/update dependencies (needed for path repository packages)
echo "Installing Composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader || true

# Generate autoloader
echo "Generating autoloader..."
composer dump-autoload --optimize || true

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "" ]; then
    echo "Generating application key..."
    php artisan key:generate --force || true
fi

# Clear and cache config
echo "Optimizing application..."
php artisan config:clear || true
php artisan cache:clear || true

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running migrations..."
    php artisan migrate --force || true
fi

# If custom command is passed, execute it; otherwise run default serve
if [ "$#" -gt 0 ]; then
    echo "Running custom command: $@"
    exec "$@"
else
    echo "Starting PHP server..."
    exec php artisan serve --host=0.0.0.0 --port=8000
fi
