const crypto = require('crypto');

class TokenService {
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    rotateToken(oldToken) {
        return this.generateToken();
    }

    validateToken(token, repository) {
        const installation = repository.findByToken(token);
        return !!installation && installation.registration_status === 'REGISTERED';
    }

    revokeToken(token, repository) {
        const installation = repository.findByToken(token);
        if (installation) {
            repository.updateInstallation(installation.id, { registration_status: 'REVOKED' });
        }
    }

    expireToken(token, repository) {
        const installation = repository.findByToken(token);
        if (installation) {
            repository.updateInstallation(installation.id, { registration_status: 'EXPIRED' });
        }
    }
}

module.exports = { TokenService };
