<?php
namespace SeoOptAgent\Security;

class Permissions {
    const MANAGE_CAPABILITY = 'manage_options';

    public static function canManageSettings() {
        return current_user_can(self::MANAGE_CAPABILITY);
    }
}