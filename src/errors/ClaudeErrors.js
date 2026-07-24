/**
 * @typedef {Object} ClaudeDetectedError
 * @property {string} type
 * @property {boolean} retryable
 * @property {string} message
 * @property {Record<string, any>} [details]
 */

class ClaudeError extends Error {
    constructor(message, type = 'UNKNOWN', retryable = false, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.type = type;
        this.retryable = retryable;
        this.details = details;
    }
}

class BrowserError extends ClaudeError {
    constructor(message, details = {}) {
        super(message, 'BROWSER_ERROR', false, details);
    }
}

class ProfileLockError extends BrowserError {
    constructor(message, details = {}) {
        super(message, 'PROFILE_LOCK', false, details);
    }
}

class ValidationError extends ClaudeError {
    constructor(message, type = 'EMPTY_RESPONSE', retryable = true, details = {}) {
        super(message, type, retryable, details);
    }
}

class ContentUnavailableError extends ClaudeError {
    constructor(message, details = {}) {
        super(message, 'CONTENT_MISSING', false, details);
    }
}

class InvalidProjectContentError extends ClaudeError {
    constructor(message, details = {}) {
        super(message, 'INVALID_CONTENT', false, details);
    }
}

class InvalidResponseQualityError extends ClaudeError {
    constructor(message, details = {}) {
        super(message, 'POOR_QUALITY', false, details);
    }
}

class RecoveryReport extends ClaudeError {
    constructor(message, type, retryable, details = {}) {
        super(message, type, retryable, details);
    }
}

function createClaudeError({ type = 'UNKNOWN', retryable = false, message = 'Unknown Claude error', details = {} }) {
    return new ClaudeError(message, type, retryable, details);
}

function normalizeError(error) {
    if (error instanceof ClaudeError) {
        return error;
    }

    const message = error?.message || 'Unknown Claude error';
    
    // Map Playwright disconnection/closed errors to BROWSER_DISCONNECTED
    if (message.includes('Target page, context or browser has been closed') || 
        message.includes('Browser has been closed') ||
        message.includes('Protocol error')) {
        return new ClaudeError(message, 'BROWSER_DISCONNECTED', true, {
            originalName: error?.name || 'Error'
        });
    }

    return new ClaudeError(message, 'UNKNOWN', false, {
        originalName: error?.name || 'Error'
    });
}

module.exports = {
    ClaudeError,
    BrowserError,
    ProfileLockError,
    ValidationError,
    ContentUnavailableError,
    InvalidProjectContentError,
    InvalidResponseQualityError,
    RecoveryReport,
    createClaudeError,
    normalizeError
};
