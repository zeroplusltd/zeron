<?php


class TemplateRenderer
{
    protected static function getPathRelativeToAppRoot($path) {
    $normalized = realpath($path);

    if ($normalized === false) {
        return null;
    }

    $key = '/app/';
    $pos = strpos($normalized, $key);

    if ($pos === false) {
        return null;
    }

    return substr($normalized, $pos + strlen($key));
}

    public static function renderTemplate(string $file, array $data = [], $raw_data)
    {
        $params = $data;
        

        // Render page content
        echo self::renderCompiled($file, $params, $raw_data);

    }

    /**
     * Core view renderer (IMPORTANT LOGIC PRESERVED)
     */
    protected static function renderCompiled(string $file, array $data = [], $raw_data)
    {
        extract($data, EXTR_SKIP);

       
        
        /* =====================================
           5️⃣ COMPILED VIEW (NO eval)
        ===================================== */
        $cacheDir = __DIR__ . '/../cache';

        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0777, true);
        }

        $compiledFile = $cacheDir . '/' . substr_replace(self::getPathRelativeToAppRoot($file), "php", -2);

        // echo $compiledFile;
       
        if(!file_exists($compiledFile)){
            echo "Compiler faile!";
            exit;
        }

        $data_rule = is_array($raw_data) ? $raw_data : json_decode((string)$raw_data, true);

       
        if($data_rule["middleware"] === true){

            if($data_rule["status"] === 308){
                header("Location: ".$data_rule["redirect"], true, 308);
            }else{
                header("Location: ".$data_rule["redirect"], true, 307);
            }

        }else{

        ob_start();
        (function () use ($compiledFile, $data) {
            // extract($data, EXTR_SKIP);
            $params = $data;
            require $compiledFile;
        })();

        return ob_get_clean();

        }
  
        

        return null;

    }
}

class FileSystemRouter {

    private string $pagesPath;

    public function __construct($pagesPath) {
        $this->pagesPath = rtrim($pagesPath, '/');
    }

    // Convert file path (like blog/[id].php) into a regex route pattern
    private function convertFileToPattern($file) {
        $route = str_replace([$this->pagesPath, '.ze'], '', $file);

        // Replace index to /
        $route = preg_replace('#/page$#', '', $route);

        // Replace [param] to regex (?P<param>[^/]+)
        $route = preg_replace('#\[([^\]]+)\]#', '(?P<$1>[^/]+)', $route);
        
        return "#^" . $route . "$#";
    }

    public function dispatch($raw_data) {

    $data = is_array($raw_data) ? $raw_data : json_decode((string)$raw_data, true);

        $uri = parse_url($data["redirect"], PHP_URL_PATH);

        $rii = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->pagesPath)
        );
        

        foreach ($rii as $file) {
            $uri = rtrim($uri, "/");
            if (!$file->isFile() || $file->getExtension() !== 'ze') continue;
            

            if ($file->getFilename() === "layout.ze") {
                continue;
            }
            $pathName = $file->getPathname();
            


            $pattern = $this->convertFileToPattern($pathName);
            // echo $pathName;

            if (preg_match($pattern, $uri, $matches)) {

                // Extract only named params
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                TemplateRenderer::renderTemplate($pathName, $params, $raw_data);
                return;
            }
        }

        http_response_code(404);
        echo "404 Page Not Found";
    }
}


$router = new FileSystemRouter(__DIR__ . '/../../../../src/app');

require __DIR__."/../../../../middleware.php";



$uri = $_SERVER['REQUEST_URI'];
 if (function_exists('middleware')) {
    $res = json_decode(middleware($uri), true);

    if (!empty($res['redirect'])) {
        $status = 307;
         if (!empty($data['status']) && is_int($data['status'])){
            $status = $data['status'];
         }

         $middleware = true;
         if($res['redirect'] === $uri){
            $middleware = false;
         }

        $router->dispatch(json_encode(["redirect" => $res['redirect'], "status" => $status, "middleware" => $middleware]));
    }else{
        $router->dispatch(["redirect" => $uri, "status" => 307, "middleware" => false]);
    }
}else{
    $router->dispatch(["redirect" => $uri, "status" => 307, "middleware" => false]);
}
