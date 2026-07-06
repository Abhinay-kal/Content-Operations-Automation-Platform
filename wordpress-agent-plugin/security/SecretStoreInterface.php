<?php
namespace SeoOptAgent\Security;

interface SecretStoreInterface {
    public function getSecret(string $key): string;
    public function setSecret(string $key, string $value): void;
    public function deleteSecret(string $key): void;
}