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

            <div style="display: flex; gap: 20px; margin-top: 20px;">
                <!-- Completed Audits Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; flex: 1; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
                    <h3 style="margin-top: 0; text-align: center;"><?php esc_html_e('Completed Audits', 'seo-opt-agent'); ?> (<span id="seo-opt-completed-audits-count">0</span>)</h3>
                    <ul id="seo-opt-completed-audits-list" style="max-height: 150px; overflow-y: auto; padding-left: 20px; margin-bottom: 0;">
                        <?php echo $isConnected ? '<li>Loading...</li>' : '<li>N/A</li>'; ?>
                    </ul>
                </div>
                
                <!-- Completed Rewrites Card -->
                <div style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; flex: 1; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
                    <h3 style="margin-top: 0; text-align: center;"><?php esc_html_e('Completed Rewrites', 'seo-opt-agent'); ?> (<span id="seo-opt-completed-rewrites-count">0</span>)</h3>
                    <ul id="seo-opt-completed-rewrites-list" style="max-height: 150px; overflow-y: auto; padding-left: 20px; margin-bottom: 0;">
                        <?php echo $isConnected ? '<li>Loading...</li>' : '<li>N/A</li>'; ?>
                    </ul>
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
                            <label style="display:block; font-weight:bold; margin-bottom:5px;">Select Posts</label>
                            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ccd0d4; padding: 10px; border-radius: 4px;">
                                <?php
                                $recent_posts = get_posts([
                                    'post_type' => 'post',
                                    'post_status' => 'publish',
                                    'posts_per_page' => 100,
                                    'orderby' => 'post_date',
                                    'order' => 'DESC'
                                ]);
                                if (empty($recent_posts)) {
                                    echo '<p>No posts found.</p>';
                                } else {
                                    foreach ($recent_posts as $p) {
                                        $thumb = get_the_post_thumbnail_url($p->ID, 'thumbnail');
                                        $imgTag = $thumb ? "<img src='".esc_url($thumb)."' style='width:30px;height:30px;object-fit:cover;margin-right:10px;vertical-align:middle;border-radius:2px;' />" : "<div style='width:30px;height:30px;background:#eee;margin-right:10px;display:inline-block;vertical-align:middle;border-radius:2px;'></div>";
                                        ?>
                                        <label style="display:block; margin-bottom:10px; cursor:pointer;">
                                            <input type="checkbox" name="wp_post_ids[]" value="<?php echo esc_attr($p->ID); ?>" style="margin-right:10px;" />
                                            <?php echo $imgTag; ?>
                                            <span style="vertical-align:middle;"><?php echo esc_html($p->post_title); ?> (ID: <?php echo esc_html($p->ID); ?>)</span>
                                        </label>
                                        <?php
                                    }
                                }
                                ?>
                            </div>
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

            <!-- Audit Modal -->
            <div id="seo-opt-audit-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;">
                <div style="background:#fff; width:80%; max-width: 800px; margin:50px auto; padding:20px; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; max-height: 80vh;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccd0d4; padding-bottom: 10px; margin-bottom: 15px;">
                        <h3 style="margin:0;">Audit Response</h3>
                        <button type="button" class="button" id="seo-opt-audit-close">&times;</button>
                    </div>
                    <div id="seo-opt-audit-content" style="overflow-y: auto; flex-grow: 1; padding: 10px; background: #f0f0f1; font-family: monospace; white-space: pre-wrap;">
                        Loading...
                    </div>
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
                            
                            var audits = response.data.completed_details && response.data.completed_details.audits ? response.data.completed_details.audits : [];
                            var rewrites = response.data.completed_details && response.data.completed_details.rewrites ? response.data.completed_details.rewrites : [];
                            
                            $('#seo-opt-completed-audits-count').text(audits.length);
                            $('#seo-opt-completed-rewrites-count').text(rewrites.length);
                            
                            var auditsHtml = '';
                            if (audits.length === 0) {
                                auditsHtml = '<li>No completed audits yet.</li>';
                            } else {
                                audits.forEach(function(job) {
                                    var title = job.post_title ? job.post_title : 'Post ID ' + job.wp_post_id;
                                    auditsHtml += '<li style="margin-bottom: 5px;"><a href="post.php?post=' + job.wp_post_id + '&action=edit" target="_blank" style="margin-right: 10px;">' + title + '</a>';
                                    if (job.project_id) {
                                        auditsHtml += '<button type="button" class="button button-small view-audit-btn" data-project="' + job.project_id + '">View Audit</button>';
                                    }
                                    auditsHtml += '</li>';
                                });
                            }
                            $('#seo-opt-completed-audits-list').html(auditsHtml);
                            
                            var rewritesHtml = '';
                            if (rewrites.length === 0) {
                                rewritesHtml = '<li>No completed rewrites yet.</li>';
                            } else {
                                rewrites.forEach(function(job) {
                                    var title = job.post_title ? job.post_title : 'Post ID ' + job.wp_post_id;
                                    rewritesHtml += '<li style="margin-bottom: 5px;"><a href="post.php?post=' + job.wp_post_id + '&action=edit" target="_blank" style="margin-right: 10px;">' + title + '</a>';
                                    if (job.project_id) {
                                        rewritesHtml += '<button type="button" class="button button-small view-audit-btn" data-project="' + job.project_id + '">View Audit</button>';
                                    }
                                    rewritesHtml += '</li>';
                                });
                            }
                            $('#seo-opt-completed-rewrites-list').html(rewritesHtml);
                            
                            // Bind view audit buttons
                            $('.view-audit-btn').on('click', function() {
                                var projectId = $(this).data('project');
                                $('#seo-opt-audit-content').text('Loading audit...');
                                $('#seo-opt-audit-modal').fadeIn(200);
                                
                                $.post(ajaxurl, {
                                    action: 'seo_opt_get_audit',
                                    nonce: seoOptAgentObj.nonce,
                                    project_id: projectId
                                }, function(res) {
                                    if (res.success && res.data && res.data.result) {
                                        $('#seo-opt-audit-content').text(res.data.result);
                                    } else {
                                        $('#seo-opt-audit-content').text('Failed to load audit: ' + (res.data && res.data.message ? res.data.message : 'Unknown error'));
                                    }
                                }).fail(function() {
                                    $('#seo-opt-audit-content').text('Network error loading audit.');
                                });
                            });
                            
                        } else {
                            $('#seo-opt-processing-jobs').text('Error');
                            $('#seo-opt-scheduled-jobs').text('Error');
                            $('#seo-opt-completed-audits-list').html('<li>Error loading stats</li>');
                            $('#seo-opt-completed-rewrites-list').html('<li>Error loading stats</li>');
                        }
                    }).fail(function() {
                        $('#seo-opt-processing-jobs').text('Unavailable');
                        $('#seo-opt-scheduled-jobs').text('Unavailable');
                        $('#seo-opt-completed-audits-list').html('<li>Unavailable</li>');
                        $('#seo-opt-completed-rewrites-list').html('<li>Unavailable</li>');
                    });
                }
                loadStats();
                
                $('#seo-opt-audit-close').on('click', function() {
                    $('#seo-opt-audit-modal').fadeOut(200);
                });
                
                $('#seo-opt-schedule-job').on('click', function() {
                    $('#seo-opt-schedule-modal').fadeIn(200);
                });
                
                $('#seo-opt-modal-cancel').on('click', function() {
                    $('#seo-opt-schedule-modal').fadeOut(200);
                });

                $('#seo-opt-schedule-form').on('submit', function(e) {
                    e.preventDefault();
                    
                    var submitBtn = $(this).find('button[type="submit"]');
                    
                    var postIds = [];
                    $('input[name="wp_post_ids[]"]:checked').each(function() {
                        postIds.push($(this).val());
                    });
                    
                    if (postIds.length === 0) {
                        alert('Please select at least one post.');
                        return;
                    }
                    
                    submitBtn.prop('disabled', true).text('Scheduling...');

                    $.post(ajaxurl, {
                        action: 'seo_opt_schedule_job',
                        nonce: seoOptAgentObj.nonce,
                        type: $('#seo-opt-job-type').val(),
                        wp_post_ids: postIds,
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
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        alert('Server request failed. Status: ' + jqXHR.status + ' Error: ' + errorThrown);
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
            $statsData = $response['data']['data'] ?? [];
            wp_send_json_success([
                'processing' => $statsData['processing'] ?? 0,
                'queued' => $statsData['queued'] ?? 0,
                'completed' => $statsData['completed'] ?? 0,
                'failed' => $statsData['failed'] ?? 0,
                'completed_details' => $statsData['completed_details'] ?? ['audits' => [], 'rewrites' => []]
            ]);
        } else {
            wp_send_json_error(['message' => 'Failed to fetch stats from backend.']);
        }
    }

    public function handleGetAudit() {
        if (!Nonce::verify($_POST['nonce'], 'seo_opt_ajax_action')) {
            wp_send_json_error(['message' => __('Invalid security token.', 'seo-opt-agent')]);
        }
        if (!Permissions::canManageSettings()) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'seo-opt-agent')]);
        }
        
        $project_id = isset($_POST['project_id']) ? intval($_POST['project_id']) : 0;
        if (!$project_id) {
            wp_send_json_error(['message' => 'Missing project ID.']);
        }
        
        $response = $this->backendClient->get('/plugin/projects/' . $project_id . '/audit');
        
        if ($response['success']) {
            wp_send_json_success($response['data']['data'] ?? []);
        } else {
            wp_send_json_error(['message' => $response['message'] ?? 'Failed to fetch audit from backend.']);
        }
    }

    public function handleScheduleJob() {
        error_log("handleScheduleJob started");
        try {
            if (!Nonce::verify($_POST['nonce'], 'seo_opt_ajax_action')) {
                error_log("Nonce verification failed");
                wp_send_json_error(['message' => __('Invalid security token.', 'seo-opt-agent')]);
            }
            if (!Permissions::canManageSettings()) {
                error_log("Permission failed");
                wp_send_json_error(['message' => __('Insufficient permissions.', 'seo-opt-agent')]);
            }

            $type = isset($_POST['type']) ? sanitize_text_field($_POST['type']) : 'REWRITE';
            $wp_post_ids = isset($_POST['wp_post_ids']) && is_array($_POST['wp_post_ids']) ? array_map('intval', $_POST['wp_post_ids']) : [];
            $priority = isset($_POST['priority']) ? sanitize_text_field($_POST['priority']) : 'NORMAL';
            $prompt = isset($_POST['prompt']) ? sanitize_textarea_field($_POST['prompt']) : '';

            error_log("Validating payload: type=$type, wp_post_ids=".implode(',', $wp_post_ids).", priority=$priority");

            if (empty($wp_post_ids)) {
                error_log("Missing post IDs");
                wp_send_json_error(['message' => 'Please select at least one WordPress Post.']);
            }

            error_log("Calling backend...");
            $response = $this->backendClient->post('/plugin/jobs/create', [
                'type' => $type,
                'wp_post_ids' => $wp_post_ids,
                'priority' => $priority,
                'prompt' => $prompt
            ]);

            error_log("Backend response: " . print_r($response, true));

            if (!empty($response['success'])) {
                wp_send_json_success(['message' => 'Job created successfully', 'job' => $response['data'] ?? []]);
            } else {
                wp_send_json_error(['message' => $response['error'] ?? $response['message'] ?? 'Backend rejected the job creation.']);
            }
        } catch (\Exception $e) {
            error_log("Exception in handleScheduleJob: " . $e->getMessage());
            wp_send_json_error(['message' => $e->getMessage()]);
        } catch (\Error $e) {
            error_log("Fatal Error in handleScheduleJob: " . $e->getMessage());
            wp_send_json_error(['message' => 'Fatal Error: ' . $e->getMessage()]);
        }
    }
}
