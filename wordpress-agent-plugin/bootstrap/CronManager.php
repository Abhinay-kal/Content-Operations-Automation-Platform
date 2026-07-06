<?php
namespace SeoOptAgent\Bootstrap;

use SeoOptAgent\Services\HeartbeatService;

class CronManager {
    public function registerHooks(Loader $loader, HeartbeatService $heartbeatService) {
        $loader->addFilter('cron_schedules', $this, 'addCustomSchedules');
        $loader->addAction('seo_opt_agent_heartbeat', $heartbeatService, 'runHeartbeat');
    }

    public function addCustomSchedules($schedules) {
        $schedules['seo_opt_five_minutes'] = [
            'interval' => 300,
            'display'  => __('Every 5 Minutes', 'seo-opt-agent')
        ];
        return $schedules;
    }

    public static function scheduleEvents() {
        if (!wp_next_scheduled('seo_opt_agent_heartbeat')) {
            wp_schedule_event(time(), 'seo_opt_five_minutes', 'seo_opt_agent_heartbeat');
        }
    }

    public static function clearEvents() {
        wp_clear_scheduled_hook('seo_opt_agent_heartbeat');
    }
}