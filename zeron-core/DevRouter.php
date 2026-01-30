<?php
declare(strict_types=1);

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$uri = $uri === '' ? '/' : $uri;

/**
 * -------------------------------------------------------
 * 1) Serve public/ files automatically (this is the main part)
 * -------------------------------------------------------
 */
$publicFile = __DIR__ . '/../../../../public' . $uri;
if ($uri !== '/' && is_file($publicFile)) {
    $ext = strtolower(pathinfo($publicFile, PATHINFO_EXTENSION));
    $mime = match ($ext) {
        'css' => 'text/css; charset=utf-8',
        'js'  => 'application/javascript; charset=utf-8',
        'png' => 'image/png',
        'jpg','jpeg' => 'image/jpeg',
        'svg' => 'image/svg+xml',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        default => 'application/octet-stream'
    };
    header('Content-Type: ' . $mime);
    readfile($publicFile);
    exit;
}




if (isset($aliases[$uri]) && is_file($aliases[$uri])) {
    $file = $aliases[$uri];
    $ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));

    $mime = match ($ext) {
        'css' => 'text/css; charset=utf-8',
        'js'  => 'application/javascript; charset=utf-8',
        default => 'application/octet-stream'
    };

    header('Content-Type: ' . $mime);
    readfile($file);
    exit;
}

if (str_starts_with($uri, '/assets/prelocss')) {

    if (str_contains($uri, '..')) {
        http_response_code(403);
        exit('Forbidden');
    }

    // /assets/prelocss -> redirect to /assets/prelocss/
    if ($uri === '/assets/prelocss') {
        header('Location: /assets/prelocss/', true, 302);
        exit;
    }

    // Entry: /assets/prelocss/ serves prelo.css
    if ($uri === '/assets/prelocss/' || $uri === '/assets/prelocss/index.css') {
        $file = __DIR__ . '/../../../../.lem/modules/prelocss/styles/prelo.css';
    } else {
        // Child: /assets/prelocss/core.css -> .lem/.../core.css
        $rel  = substr($uri, strlen('/assets/prelocss/'));
        $file = __DIR__ . '/../../../../.lem/modules/prelocss/styles/' . $rel;
    }

    if (is_file($file)) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

        $mime = match ($ext) {
            'css'   => 'text/css; charset=utf-8',
            'js'    => 'application/javascript; charset=utf-8',
            'map'   => 'application/json; charset=utf-8',
            'png'   => 'image/png',
            'jpg','jpeg' => 'image/jpeg',
            'svg'   => 'image/svg+xml',
            'woff'  => 'font/woff',
            'woff2' => 'font/woff2',
            default => null
        };

        if ($mime === null) {
            http_response_code(403);
            exit('Forbidden');
        }

        header('Content-Type: ' . $mime);
        readfile($file);
        exit;
    }

    http_response_code(404);
    exit('Not Found');
}


require __DIR__ . '/TemplateRenderer.php';
