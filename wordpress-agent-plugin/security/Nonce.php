<?php
namespace SeoOptAgent\Security;

class Nonce {
    public static function create($action) {
        return wp_create_nonce($action);
    }

    public static function verify($nonce, $action) {
        return wp_verify_nonce($nonce, $action);
    }
}