<?php
namespace SeoOptAgent\Admin;

use SeoOptAgent\Security\Permissions;

class Menu {
    private $configService;
    private $registrationService;
    private $heartbeatService;
    private $overviewPage;

    public function __construct($configService, $registrationService, $heartbeatService, $overviewPage) {
        $this->configService = $configService;
        $this->registrationService = $registrationService;
        $this->heartbeatService = $heartbeatService;
        $this->overviewPage = $overviewPage;
    }

    public function register() {
        if (!Permissions::canManageSettings()) {
            return;
        }

        add_menu_page(
            __('SEO Platform', 'seo-opt-agent'),
            __('SEO Platform', 'seo-opt-agent'),
            Permissions::MANAGE_CAPABILITY,
            'seo-opt-agent',
            [$this->overviewPage, 'renderPage'],
            'dashicons-chart-area',
            30
        );

        add_submenu_page(
            'seo-opt-agent',
            __('Overview', 'seo-opt-agent'),
            __('Overview', 'seo-opt-agent'),
            Permissions::MANAGE_CAPABILITY,
            'seo-opt-agent',
            [$this->overviewPage, 'renderPage']
        );

        add_submenu_page(
            'seo-opt-agent',
            __('Connection', 'seo-opt-agent'),
            __('Connection', 'seo-opt-agent'),
            Permissions::MANAGE_CAPABILITY,
            'seo-opt-agent-connection',
            [new SettingsPage($this->configService, $this->registrationService, $this->heartbeatService, new Notices()), 'renderPage']
        );

        add_submenu_page(
            'seo-opt-agent',
            __('Diagnostics', 'seo-opt-agent'),
            __('Diagnostics', 'seo-opt-agent'),
            Permissions::MANAGE_CAPABILITY,
            'seo-opt-agent-diagnostics',
            [$this, 'renderDiagnostics']
        );
    }

    public function renderDiagnostics() {
        echo '<div class="wrap"><h1>' . esc_html__('Diagnostics', 'seo-opt-agent') . '</h1><p>' . esc_html__('Diagnostics tools will be available in future phases.', 'seo-opt-agent') . '</p></div>';
    }
}