<?php
namespace SeoOptAgent\Bootstrap;

use SeoOptAgent\Admin\AdminModule;
use SeoOptAgent\Admin\Notices;
use SeoOptAgent\Api\HttpClient;
use SeoOptAgent\Api\BackendClient;
use SeoOptAgent\Repository\SettingsRepository;
use SeoOptAgent\Security\WordPressSecretStore;
use SeoOptAgent\Services\ConfigService;
use SeoOptAgent\Services\RegistrationService;
use SeoOptAgent\Services\CompatibilityService;
use SeoOptAgent\Services\DiagnosticsService;
use SeoOptAgent\Services\HeartbeatService;
use SeoOptAgent\Utils\NullLogger;

class ServiceContainer {
    public function registerServices(Loader $loader) {
        $logger = new NullLogger();
        $settingsRepo = new SettingsRepository();
        $secretStore = new WordPressSecretStore($settingsRepo);
        $configService = new ConfigService($settingsRepo, $secretStore);
        
        $httpClient = new HttpClient();
        $backendClient = new BackendClient($httpClient, $configService);
        
        $compatibilityService = new CompatibilityService();
        $registrationService = new RegistrationService($backendClient, $configService, $logger, $compatibilityService);
        
        $diagnosticsService = new DiagnosticsService();
        $heartbeatService = new HeartbeatService($backendClient, $configService, $diagnosticsService, $registrationService, $logger);
        
        $cronManager = new CronManager();
        $cronManager->registerHooks($loader, $heartbeatService);
        
        $notices = new Notices();

        $modules = [
            new AdminModule($configService, $registrationService, $heartbeatService, $notices, $backendClient)
        ];

        foreach ($modules as $module) {
            $module->register($loader);
        }
    }
}
