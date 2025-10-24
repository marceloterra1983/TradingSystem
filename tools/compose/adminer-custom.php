<?php
/**
 * Adminer wrapper for iframe embedding support
 * Development environment only
 */

// Start output buffering with callback to modify headers
ob_start(function($buffer) {
    // Headers are already sent at this point, but we can work with the output
    return $buffer;
}, 0, PHP_OUTPUT_HANDLER_REMOVABLE);

// Register shutdown function to modify headers before they're sent
register_shutdown_function(function() {
    // Remove X-Frame-Options header if it was set
    if (function_exists('header_remove')) {
        header_remove('X-Frame-Options');
    }
});

// Include the original Adminer
require './adminer.php';
