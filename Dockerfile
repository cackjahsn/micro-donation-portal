# PHP 8.2 with Apache
FROM php:8.2-apache

# Set working directory
WORKDIR /var/www/html

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite for URL rewriting
RUN a2enmod rewrite

# Install PHP extensions required for the application
RUN docker-php-ext-install \
    pdo_mysql \
    mysqli \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip

# Set proper permissions for Apache
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Configure Apache DocumentRoot to point to project root
# The virtual host configuration will be mounted from docker/apache/sites/

# Expose port 80
EXPOSE 80

# Start Apache in foreground
CMD ["apache2-foreground"]
