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
            <!-- Schedule Modal -->
            <div id="seo-opt-schedule-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;">
                <div style="background:#fff; width:400px; margin:100px auto; padding:20px; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    <h3 style="margin-top:0;"><?php esc_html_e('Schedule New Job', 'seo-opt-agent'); ?></h3>
                    <p>Configure a new SEO job for this site.</p>
                    
                    <form id="seo-opt-schedule-form">
                        <div style="margin-bottom:15px;">
                            <label for="seo-opt-job-type" style="display:block; font-weight:bold; margin-bottom:5px;">Job Type</label>
                            <select id="seo-opt-job-type" name="type" style="width:100%;">
                                <option value="REWRITE">Rewrite Content</option>
                                <option value="AUDIT">Audit Content</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom:15px;">
                            <label for="seo-opt-wp-post-id" style="display:block; font-weight:bold; margin-bottom:5px;">WordPress Post ID</label>
                            <input type="number" id="seo-opt-wp-post-id" name="wp_post_id" style="width:100%;" required />
                        </div>
                        
                        <div style="margin-bottom:15px;">
                            <label for="seo-opt-priority" style="display:block; font-weight:bold; margin-bottom:5px;">Priority</label>
                            <select id="seo-opt-priority" name="priority" style="width:100%;">
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="BULK">Bulk</option>
                            </select>
                        </div>

                        <div style="margin-bottom:15px;">
                            <label for="seo-opt-prompt" style="display:block; font-weight:bold; margin-bottom:5px;">Custom Prompt (Optional)</label>
                            <textarea id="seo-opt-prompt" name="prompt" style="width:100%; height:80px;"></textarea>
                        </div>
                        
                        <div style="text-align:right;">
                            <button type="button" class="button button-secondary" id="seo-opt-modal-cancel">Cancel</button>
                            <button type="submit" class="button button-primary">Schedule Job</button>
                        </div>
                    </form>
                </div>
            </div>

            <?php if ($isConnected): ?>
            <script>
            jQuery(document).ready(function($) {
                // Fetch queue stats from backend
                function loadStats() {
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
                }
                loadStats();
                
                $('#seo-opt-schedule-job').on('click', function() {
                    $('#seo-opt-schedule-modal').fadeIn(200);
                });
                
                $('#seo-opt-modal-cancel').on('click', function() {
                    $('#seo-opt-schedule-modal').fadeOut(200);
                });

                $('#seo-opt-schedule-form').on('submit', function(e) {
                    e.preventDefault();
                    
                    var submitBtn = $(this).find('button[type="submit"]');
                    submitBtn.prop('disabled', true).text('Scheduling...');

                    $.post(ajaxurl, {
                        action: 'seo_opt_schedule_job',
                        nonce: seoOptAgentObj.nonce,
                        type: $('#seo-opt-job-type').val(),
                        wp_post_id: $('#seo-opt-wp-post-id').val(),
                        priority: $('#seo-opt-priority').val(),
                        prompt: $('#seo-opt-prompt').val()
                    }, function(response) {
                        if (response.success) {
                            $('#seo-opt-schedule-modal').fadeOut(200);
                            $('#seo-opt-schedule-form')[0].reset();
                            alert('Job scheduled successfully!');
                            loadStats();
                        } else {
                            alert('Failed to schedule job: ' + (response.data && response.data.message ? response.data.message : 'Unknown error'));
                        }
                    }).fail(function() {
                        alert('Server request failed.');
                    }).always(function() {
                        submitBtn.prop('disabled', false).text('Schedule Job');
                    });
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

        $response = $this->backendClient->get('/plugin/stats');
        
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

    public function handleScheduleJob() {
        if (!Nonce::verify($_POST['nonce'], 'seo_opt_ajax_action')) {
            wp_send_json_error(['message' => __('Invalid security token.', 'seo-opt-agent')]);
        }
        if (!Permissions::canManageSettings()) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'seo-opt-agent')]);
        }

        $type = isset($_POST['type']) ? sanitize_text_field($_POST['type']) : 'REWRITE';
        $wp_post_id = isset($_POST['wp_post_id']) ? intval($_POST['wp_post_id']) : 0;
        $priority = isset($_POST['priority']) ? sanitize_text_field($_POST['priority']) : 'NORMAL';
        $prompt = isset($_POST['prompt']) ? sanitize_textarea_field($_POST['prompt']) : '';

        if (!$wp_post_id) {
            wp_send_json_error(['message' => 'WordPress Post ID is required.']);
        }

        $response = $this->backendClient->post('/plugin/jobs/create', [
            'type' => $type,
            'wp_post_id' => $wp_post_id,
            'priority' => $priority,
            'prompt' => $prompt
        ]);

        if ($response['success']) {
            wp_send_json_success(['message' => 'Job created successfully', 'job' => $response['data'] ?? []]);
        } else {
            wp_send_json_error(['message' => $response['error'] ?? 'Backend rejected the job creation.']);
        }
    }
}
