<?php
namespace SeoOptAgent\Admin;

use SeoOptAgent\Services\ConfigService;
use SeoOptAgent\Services\RegistrationService;
use SeoOptAgent\Services\HeartbeatService;
use SeoOptAgent\Security\Nonce;
use SeoOptAgent\Security\Permissions;
use SeoOptAgent\Models\ProtocolVersion;

class SettingsPage {
    private $config;
    private $registration;
    private $heartbeat;
    private $notices;

    public function __construct(ConfigService $config, RegistrationService $registration, HeartbeatService $heartbeat, Notices $notices) {
        $this->config = $config;
        $this->registration = $registration;
        $this->heartbeat = $heartbeat;
        $this->notices = $notices;
    }

    public function registerSettings() {
        register_setting('seo_opt_agent_options_group', 'seo_opt_agent_settings', [
            'sanitize_callback' => [$this, 'sanitizeSettings']
        ]);
    }

    public function sanitizeSettings($input) {
        $sanitized = $this->config->getAll();
        
        if (isset($input['backend_url'])) {
            $sanitized['backend_url'] = esc_url_raw($input['backend_url']);
        }
        if (isset($input['api_key'])) {
            $newKey = sanitize_text_field($input['api_key']);
            if (strpos($newKey, '****') === false && !empty($newKey)) {
                if (!isset($sanitized['secrets'])) {
                    $sanitized['secrets'] = [];
                }
                $sanitized['secrets']['api_key'] = $newKey;
            }
        }
        return $sanitized;
    }

    public function enqueueAssets($hook) {
        if (strpos($hook, 'seo-opt-agent-connection') === false) {
            return;
        }
        wp_enqueue_script('seo-opt-admin-js', SEO_OPT_AGENT_URL . 'assets/js/admin.js', ['jquery'], SEO_OPT_AGENT_VERSION, true);
        wp_localize_script('seo-opt-admin-js', 'seoOptAgentObj', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => Nonce::create('seo_opt_ajax_action'),
            'loading_text' => __('Processing...', 'seo-opt-agent'),
        ]);
        wp_enqueue_style('seo-opt-admin-css', SEO_OPT_AGENT_URL . 'assets/css/admin.css', [], SEO_OPT_AGENT_VERSION);
    }

    public function renderPage() {
        if (!Permissions::canManageSettings()) {
            return;
        }
        
        $url = $this->config->getBackendUrl();
        $apiKey = $this->config->getApiKey();
        $maskedKey = !empty($apiKey) ? str_repeat('*', max(0, strlen($apiKey) - 4)) . substr($apiKey, -4) : '';
        
        $identity = $this->config->getIdentity();
        $bIdentity = $this->config->getBackendIdentity();
        $connStatus = $this->config->getConnectionStatus()->getLabel();
        $regStatus = $this->config->getRegistrationStatus()->getLabel();
        $presenceStatus = $this->config->getPresenceStatus()->getLabel();
        $lastError = $this->config->getLastConnectionError();
        
        $lastHb = $this->config->getLastHeartbeatTime();
        $nextHb = wp_next_scheduled('seo_opt_agent_heartbeat');
        $latency = $this->config->getLastHeartbeatLatency();
        
        $protocol = new ProtocolVersion();

        ?>
        <div class="wrap">
            <h1><?php esc_html_e('SEO Platform Connection', 'seo-opt-agent'); ?></h1>
            <div id="seo-opt-notices-container"></div>
            <form method="post" action="options.php">
                <?php settings_fields('seo_opt_agent_options_group'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="seo_opt_backend_url"><?php esc_html_e('Backend URL', 'seo-opt-agent'); ?></label></th>
                        <td><input type="url" id="seo_opt_backend_url" name="seo_opt_agent_settings[backend_url]" value="<?php echo esc_attr($url); ?>" class="regular-text" required></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="seo_opt_api_key"><?php esc_html_e('API Key', 'seo-opt-agent'); ?></label></th>
                        <td><input type="password" id="seo_opt_api_key" name="seo_opt_agent_settings[api_key]" value="<?php echo esc_attr($maskedKey); ?>" class="regular-text" placeholder="Enter new API key to update"></td>
                    </tr>
                </table>

                <h2><?php esc_html_e('Connection State', 'seo-opt-agent'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Connection Status', 'seo-opt-agent'); ?></th>
                        <td><strong id="seo-opt-status-text"><?php echo esc_html($connStatus); ?></strong></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Registration Status', 'seo-opt-agent'); ?></th>
                        <td><strong id="seo-opt-reg-text"><?php echo esc_html($regStatus); ?></strong></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Presence Status', 'seo-opt-agent'); ?></th>
                        <td><strong id="seo-opt-presence-text"><?php echo esc_html($presenceStatus); ?></strong></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Last Heartbeat', 'seo-opt-agent'); ?></th>
                        <td id="seo-opt-last-hb"><?php echo $lastHb ? date('Y-m-d H:i:s', $lastHb) : 'Never'; ?></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Next Heartbeat', 'seo-opt-agent'); ?></th>
                        <td><?php echo $nextHb ? date('Y-m-d H:i:s', $nextHb) : 'Not Scheduled'; ?></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Latency', 'seo-opt-agent'); ?></th>
                        <td id="seo-opt-latency"><?php echo $latency ? esc_html($latency) . ' ms' : 'N/A'; ?></td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Last Error', 'seo-opt-agent'); ?></th>
                        <td id="seo-opt-last-error" style="color: #d63638;"><?php echo esc_html($lastError ?: 'None'); ?></td>
                    </tr>
                </table>

                <p class="submit">
                    <?php submit_button(__('Save Settings', 'seo-opt-agent'), 'primary', 'submit', false); ?>
                    <button type="button" id="seo-opt-handshake" class="button button-secondary"><?php esc_html_e('Handshake', 'seo-opt-agent'); ?></button>
                    <button type="button" id="seo-opt-register" class="button button-secondary"><?php esc_html_e('Register', 'seo-opt-agent'); ?></button>
                    <button type="button" id="seo-opt-disconnect" class="button button-secondary"><?php esc_html_e('Disconnect', 'seo-opt-agent'); ?></button>
                    <button type="button" id="seo-opt-heartbeat" class="button button-secondary"><?php esc_html_e('Send Heartbeat', 'seo-opt-agent'); ?></button>
                </p>
            </form>
        </div>
        <?php
    }

    private function verifyAjax() {
        if (!Nonce::verify($_POST['nonce'], 'seo_opt_ajax_action')) {
            wp_send_json_error(['message' => __('Invalid security token.', 'seo-opt-agent')]);
        }
        if (!Permissions::canManageSettings()) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'seo-opt-agent')]);
        }
    }

    public function handleHandshake() {
        $this->verifyAjax();
        $result = $this->registration->handshake();
        $this->respondWithResult($result);
    }

    public function handleRegister() {
        $this->verifyAjax();
        $result = $this->registration->register();
        $this->respondWithResult($result);
    }

    public function handleDisconnect() {
        $this->verifyAjax();
        $result = $this->registration->disconnect();
        $this->respondWithResult($result);
    }

    public function handleHeartbeat() {
        $this->verifyAjax();
        $result = $this->heartbeat->runHeartbeat();
        
        $response = [
            'message' => $result->getMessage(),
            'presence_status' => $result->getPresenceStatus()->getLabel(),
            'latency' => $result->getLatencyMs() . ' ms',
            'last_hb' => date('Y-m-d H:i:s', time()),
            'last_error' => $this->config->getLastConnectionError()
        ];
        
        if ($result->isSuccess()) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error($response);
        }
    }

    private function respondWithResult($result) {
        $bIdentity = $this->config->getBackendIdentity();
        $response = [
            'message' => $result->getMessage(),
            'status' => $result->getConnectionStatus()->getLabel(),
            'reg_status' => $result->getRegistrationStatus()->getLabel(),
            'backend_version' => $bIdentity->getBackendVersion() ?: 'N/A',
            'api_version' => $bIdentity->getApiVersion() ?: 'N/A',
            'protocol_version' => $bIdentity->getProtocolVersion() ?: 'N/A',
            'capabilities' => implode(', ', $bIdentity->getCapabilities()) ?: 'None',
            'last_error' => $this->config->getLastConnectionError()
        ];

        if ($result->isSuccess()) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error($response);
        }
    }
}