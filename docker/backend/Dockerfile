FROM php:8.4-cli

# Install system dependencies (curl is needed for healthcheck)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libsqlite3-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files first for better caching
COPY backend/composer.json backend/composer.lock* ./

# Try to install dependencies (may fail if packages path doesn't exist in build context)
# This is OK - we'll run composer install in the container after volume mount
RUN composer install --no-scripts --no-autoloader || true

# Copy the rest of the backend application
COPY backend/ .

# Generate autoloader
RUN composer dump-autoload --optimize || true

# Copy entrypoint script
COPY docker/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
