<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register', 'sso/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [],

    'allowed_origins_patterns' => [
        '#^https://.*\.omnify\.jp$#',         // *.omnify.jp (all subdomains)
        '#^https://.*\.dev\.omnify\.jp$#',    // *.dev.omnify.jp
        '#^https://.*\.console\.omnify\.jp$#', // *.console.omnify.jp (e.g. dev.console.omnify.jp)
        '#^https://localhost(:\d+)?$#',        // localhost with any port
        '#^http://localhost(:\d+)?$#',         // localhost HTTP
        '#^http://127\.0\.0\.1(:\d+)?$#',      // 127.0.0.1 HTTP
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
