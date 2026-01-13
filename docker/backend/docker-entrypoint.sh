#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL..."
until php -r "try { new PDO('mysql:host=mysql;dbname=omnify', 'omnify', 'secret'); exit(0); } catch (PDOException \$e) { exit(1); }" 2>/dev/null; do
  echo "   MySQL is unavailable - sleeping"
  sleep 2
done
echo "✅ MySQL is ready"

# Update composer.json to use mounted packages path
if [ -d "/var/www/packages/omnify-sso-client" ]; then
    echo "🔧 Updating composer.json for Docker packages path..."
    sed -i 's|"url": "../packages/omnify-sso-client"|"url": "/var/www/packages/omnify-sso-client"|' composer.json || true
fi

# Install/update dependencies (needed for path repository packages)
echo "📦 Installing Composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader || true

# Generate autoloader
echo "🔄 Generating autoloader..."
composer dump-autoload --optimize || true

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🗄️  Running migrations..."
    php artisan migrate --force || true
fi

# Start PHP server
echo "🚀 Starting PHP server..."
exec php artisan serve --host=0.0.0.0 --port=8000
