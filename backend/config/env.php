<?php
// Environment configuration loader

class EnvConfig {
    private static $loaded = false;

    public static function load() {
        if (self::$loaded) {
            return;
        }

        // Try to load from environment variables first
        $envFile = dirname(__DIR__) . '/.env';
        
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) {
                    continue; // Skip comments
                }
                
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                if ((startsWith($value, '"') && endsWith($value, '"')) ||
                    (startsWith($value, "'") && endsWith($value, "'"))) {
                    $value = substr($value, 1, -1);
                }
                
                putenv("$key=$value");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
        
        self::$loaded = true;
    }
    
    public static function get($key, $default = null) {
        self::load();
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        return $value !== false ? $value : $default;
    }
}

// Helper functions
if (!function_exists('startsWith')) {
    function startsWith($haystack, $needle) {
        return substr($haystack, 0, strlen($needle)) === $needle;
    }
}

if (!function_exists('endsWith')) {
    function endsWith($haystack, $needle) {
        return substr($haystack, -strlen($needle)) === $needle;
    }
}