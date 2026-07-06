<?php
namespace SeoOptAgent\Admin;

use SeoOptAgent\Services\ConfigService;
use SeoOptAgent\Api\BackendClient;
use SeoOptAgent\Security\Nonce;
use SeoOptAgent\Security\Permissions;

class OverviewPage {
    private $config;
    private $backendClient;

    public function __construct(ConfigService $config, BackendClient $backendClient) {
        $this->config = $config;
        $this->backendClient = $backendClient;
    }

    public function renderPage() {
        $count_posts = wp_count_posts();
        $total_posts = $count_posts->publish ?? 0;
        
        $backendUrl = $this->config->getBackendUrl();
        $isConnected = !empty($backendUrl) && $this->config->getConnectionStatus()->getLabel() === 'Configured' || $this->config->getConnectionStatus()->getLabel() === 'Connected';
        
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('SEO Platform Overview', 'seo-opt-agent'); ?></h1>
            
            <div style="display: flex; gap: 20px; margin-top: 20px;">
                <!-- Total Posts Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; flex: 1; text-align: center; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
                    <h3 style="margin-top: 0;"><?php esc_html_e('Total Published Posts', 'seo-opt-agent'); ?></h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 10px 0;"><?php echo esc_html($total_posts); ?></p>
                </div>
                
                <!-- Jobs Processing Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; flex: 1; text-align: center; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
                    <h3 style="margin-top: 0;"><?php esc_html_e('Processing Jobs', 'seo-opt-agent'); ?></h3>
                    <p id="seo-opt-processing-jobs" style="font-size: 32px; font-weight: bold; margin: 10px 0;">
                        <?php echo $isConnected ? '<span class="spinner is-active" style="float:none; margin:0;"></span>' : 'N/A'; ?>
                    </p>
                </div>
                
                <!-- Jobs Scheduled Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; flex: 1; text-align: center; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
                    <h3 style="margin-top: 0;"><?php esc_html_e('Scheduled Jobs', 'seo-opt-agent'); ?></h3>
                    <p id="seo-opt-scheduled-jobs" style="font-size: 32px; font-weight: bold; margin: 10px 0;">
                        <?php echo $isConnected ? '<span class="spinner is-active" style="float:none; margin:0;"></span>' : 'N/A'; ?>
                    </p>
                </div>
            </div>

            <div style="margin-top: 30px;">
                <h2><?php esc_html_e('Quick Actions', 'seo-opt-agent'); ?></h2>
                <div style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
                    <p><?php esc_html_e('Manage your SEO jobs and operations directly from here.', 'seo-opt-agent'); ?></p>
                    <button type="button" id="seo-opt-schedule-job" class="button button-primary" <?php echo !$isConnected ? 'disabled' : ''; ?>>
                        <?php esc_html_e('Schedule New Job', 'seo-opt-agent'); ?>
                    </button>
                    <button type="button" class="button button-secondary" onclick="window.location.href='admin.php?page=seo-opt-agent-connection'">
                        <?php esc_html_e('View Connection Settings', 'seo-opt-agent'); ?>
                    </button>
                </div>
            </div>
            
            <?php if ($isConnected): ?>
            <script>
            jQuery(document).ready(function($) {
                // Fetch queue stats from backend
                $.post(ajaxurl, {
                    action: 'seo_opt_get_queue_stats',
                    nonce: seoOptAgentObj.nonce
                }, function(response) {
                    if (response.success && response.data) {
                        $('#seo-opt-processing-jobs').text(response.data.processing || 0);
                        $('#seo-opt-scheduled-jobs').text(response.data.queued || 0);
                    } else {
                        $('#seo-opt-processing-jobs').text('Error');
                        $('#seo-opt-scheduled-jobs').text('Error');
                    }
                }).fail(function() {
                    $('#seo-opt-processing-jobs').text('Unavailable');
                    $('#seo-opt-scheduled-jobs').text('Unavailable');
                });
                
                $('#seo-opt-schedule-job').on('click', function() {
                    alert('Job scheduling modal/functionality to be implemented here.');
                });
            });
            </script>
            <?php endif; ?>
        </div>
        <?php
    }

    public function handleGetQueueStats() {
        if (!Nonce::verify($_POST['nonce'], 'seo_opt_ajax_action')) {
            wp_send_json_error(['message' => __('Invalid security token.', 'seo-opt-agent')]);
        }
        if (!Permissions::canManageSettings()) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'seo-opt-agent')]);
        }

        $response = $this->backendClient->get('/api/seo-opt/stats');
        
        if ($response['success']) {
            wp_send_json_success([
                'processing' => $response['data']['processing'] ?? 0,
                'queued' => $response['data']['queued'] ?? 0,
                'completed' => $response['data']['completed'] ?? 0,
                'failed' => $response['data']['failed'] ?? 0
            ]);
        } else {
            wp_send_json_error(['message' => 'Failed to fetch stats from backend.']);
        }
    }
}
