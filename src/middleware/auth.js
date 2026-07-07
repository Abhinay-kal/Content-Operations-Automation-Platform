const crypto = require('crypto');

function createAuthMiddleware(apiKeys, logger) {
    const validKeys = apiKeys.map(k => Buffer.from(k));

    return (req, res, next) => {
        // Plugin routes have their own token-based authentication
        if (req.path.startsWith('/plugin/')) {
            return next();
        }

        // In production, if no keys are configured, deny all to be safe
        if (validKeys.length === 0) {
            logger.warn('Authentication failed: server has no API_KEYS configured');
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const authHeader = req.headers.authorization;
        const apiKeyHeader = req.headers['x-api-key'];

        let providedKey = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            providedKey = authHeader.substring(7).trim();
        } else if (apiKeyHeader) {
            providedKey = apiKeyHeader.trim();
        }

        if (!providedKey) {
            logger.warn('Authentication failed: missing key');
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const providedBuffer = Buffer.from(providedKey);
        
        let isValid = false;
        for (const validKey of validKeys) {
            if (providedBuffer.length === validKey.length && crypto.timingSafeEqual(providedBuffer, validKey)) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            logger.warn('Authentication failed: invalid key');
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        next();
    };
}

module.exports = { createAuthMiddleware };
