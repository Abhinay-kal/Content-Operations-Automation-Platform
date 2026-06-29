jQuery(document).ready(function($) {
    console.log("SEO Opt Agent: admin.js loaded successfully!");
    
    function handleAction($btn, actionName, isHeartbeat) {
        isHeartbeat = isHeartbeat || false;
        var originalText = $btn.text();
        $btn.text(seoOptAgentObj.loading_text).prop('disabled', true);
        $('#seo-opt-notices-container').html('');
        
        $.post(seoOptAgentObj.ajax_url, {
            action: actionName,
            nonce: seoOptAgentObj.nonce
        }, function(response) {
            console.log("SEO Opt Agent AJAX Response:", response);
            var noticeClass = response.success ? 'notice-success' : 'notice-error';
            var html = '<div class="notice ' + noticeClass + ' is-dismissible"><p>' + response.data.message + '</p></div>';
            $('#seo-opt-notices-container').html(html);
            
            if (isHeartbeat) {
                $('#seo-opt-presence-text').text(response.data.presence_status);
                $('#seo-opt-latency').text(response.data.latency);
                $('#seo-opt-last-hb').text(response.data.last_hb);
            } else {
                $('#seo-opt-status-text').text(response.data.status);
                $('#seo-opt-reg-text').text(response.data.reg_status);
            }
            
            if (response.success) {
                $('#seo-opt-last-error').text('None').css('color', 'inherit');
            } else {
                $('#seo-opt-last-error').text(response.data.last_error || 'Unknown Error').css('color', '#d63638');
            }
        }).fail(function(xhr, status, error) {
            console.error("SEO Opt Agent AJAX Error:", status, error);
            $('#seo-opt-notices-container').html('<div class="notice notice-error is-dismissible"><p>Network error occurred. Check browser console.</p></div>');
        }).always(function() {
            $btn.text(originalText).prop('disabled', false);
        });
    }

    $('#seo-opt-handshake').on('click', function(e) {
        e.preventDefault();
        console.log("Handshake clicked");
        handleAction($(this), 'seo_opt_handshake');
    });

    $('#seo-opt-register').on('click', function(e) {
        e.preventDefault();
        handleAction($(this), 'seo_opt_register');
    });

    $('#seo-opt-disconnect').on('click', function(e) {
        e.preventDefault();
        handleAction($(this), 'seo_opt_disconnect');
    });

    $('#seo-opt-heartbeat').on('click', function(e) {
        e.preventDefault();
        handleAction($(this), 'seo_opt_heartbeat', true);
    });

    $('form').on('submit', function() {
        var $apiKey = $('#seo_opt_api_key');
        if ($apiKey.val().indexOf('****') !== -1) {
            $apiKey.prop('disabled', true);
        }
    });
});\n