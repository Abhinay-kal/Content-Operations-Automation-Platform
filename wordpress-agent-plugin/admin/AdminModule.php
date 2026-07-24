<?php
namespace SeoOptAgent\Admin;

use SeoOptAgent\Bootstrap\ModuleInterface;
use SeoOptAgent\Bootstrap\Loader;
use SeoOptAgent\Services\ConfigService;
use SeoOptAgent\Services\RegistrationService;
use SeoOptAgent\Services\HeartbeatService;
use SeoOptAgent\Api\BackendClient;

class AdminModule implements ModuleInterface {
    private $configService;
    private $registrationService;
    private $heartbeatService;
    private $notices;
    private $backendClient;

    public function __construct(ConfigService $configService, RegistrationService $registrationService, HeartbeatService $heartbeatService, Notices $notices, BackendClient $backendClient) {
        $this->configService = $configService;
        $this->registrationService = $registrationService;
        $this->heartbeatService = $heartbeatService;
        $this->notices = $notices;
        $this->backendClient = $backendClient;
    }

    public function register(Loader $loader): void {
        $overviewPage = new OverviewPage($this->configService, $this->backendClient);
        $menu = new Menu($this->configService, $this->registrationService, $this->heartbeatService, $overviewPage);
        $settingsPage = new SettingsPage($this->configService, $this->registrationService, $this->heartbeatService, $this->notices);

        $loader->addAction('admin_menu', $menu, 'register');
        $loader->addAction('admin_init', $settingsPage, 'registerSettings');
        $loader->addAction('admin_enqueue_scripts', $settingsPage, 'enqueueAssets');
        
        $loader->addAction('wp_ajax_seo_opt_handshake', $settingsPage, 'handleHandshake');
        $loader->addAction('wp_ajax_seo_opt_register', $settingsPage, 'handleRegister');
        $loader->addAction('wp_ajax_seo_opt_disconnect', $settingsPage, 'handleDisconnect');
        $loader->addAction('wp_ajax_seo_opt_heartbeat', $settingsPage, 'handleHeartbeat');
        $loader->addAction('wp_ajax_seo_opt_get_queue_stats', $overviewPage, 'handleGetQueueStats');
        $loader->addAction('wp_ajax_seo_opt_schedule_job', $overviewPage, 'handleScheduleJob');
        $loader->addAction('wp_ajax_seo_opt_get_audit', $overviewPage, 'handleGetAudit');
    }
}
