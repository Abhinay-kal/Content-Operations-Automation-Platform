const ErrorCodes = {
    PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
    SITE_NOT_FOUND: 'SITE_NOT_FOUND',
    JOB_NOT_FOUND: 'JOB_NOT_FOUND',
    PLUGIN_OFFLINE: 'PLUGIN_OFFLINE',
    AUTH_FAILED: 'AUTH_FAILED',
    INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
    WORDPRESS_UNREACHABLE: 'WORDPRESS_UNREACHABLE',
    CLAUDE_TIMEOUT: 'CLAUDE_TIMEOUT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

class ApiError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

module.exports = { ErrorCodes, ApiError };
