<?php
namespace SeoOptAgent\Bootstrap;

interface ModuleInterface {
    public function register(Loader $loader): void;
}