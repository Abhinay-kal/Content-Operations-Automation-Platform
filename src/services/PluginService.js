class PluginService {
    constructor({ pluginRepository, tokenService, compatibilityService, logger }) {
        this.pluginRepository = pluginRepository;
        this.tokenService = tokenService;
        this.compatibilityService = compatibilityService;
        this.logger = logger;
    }

    handshake(data) {
        const compatibility = this.compatibilityService.compare(data.plugin_version, data.protocol_version, data.capabilities);
        return {
            status: compatibility !== 'UNSUPPORTED' ? 'OK' : 'REJECTED',
            compatibility,
            backend_version: '1.0.0',
            required_protocol: '1.0.0'
        };
    }

    register(data) {
        const compatibility = this.compatibilityService.compare(data.plugin_version, data.protocol_version, data.capabilities);
        if (compatibility === 'UNSUPPORTED') {
            throw new Error('Unsupported protocol version');
        }

        const token = this.tokenService.generateToken();
        const now = new Date().toISOString();

        const installData = {
            site_id: data.site_id,
            plugin_uuid: data.plugin_uuid,
            installation_uuid: data.installation_uuid,
            registration_token: token,
            plugin_version: data.plugin_version,
            protocol_version: data.protocol_version,
            backend_version: '1.0.0',
            capabilities: JSON.stringify(data.capabilities || {}),
            connection_status: 'CONNECTED',
            registration_status: 'REGISTERED',
            presence_status: 'ONLINE',
            last_seen: now,
            last_heartbeat: now,
            last_ip: data.ip || '',
            last_user_agent: data.user_agent || '',
            metadata: JSON.stringify(data.metadata || {}),
            created_at: now,
            updated_at: now
        };

        const id = this.pluginRepository.createInstallation(installData);
        return { installation_id: id, token, status: 'REGISTERED' };
    }

    renew(token) {
        const installation = this.pluginRepository.findByToken(token);
        if (!installation || installation.registration_status !== 'REGISTERED') {
            throw new Error('Invalid token');
        }

        const newToken = this.tokenService.rotateToken(token);
        this.pluginRepository.updateInstallation(installation.id, { registration_token: newToken });
        return { token: newToken };
    }

    disconnect(token) {
        const installation = this.pluginRepository.findByToken(token);
        if (installation) {
            this.pluginRepository.updatePresence(installation.id, 'OFFLINE');
            this.pluginRepository.updateInstallation(installation.id, { connection_status: 'DISCONNECTED' });
        }
    }

    heartbeat(token, data) {
        const installation = this.pluginRepository.findByToken(token);
        if (!installation || installation.registration_status !== 'REGISTERED') {
            throw new Error('Invalid token');
        }

        const now = new Date().toISOString();
        this.pluginRepository.updateHeartbeat(installation.id, {
            last_seen: now,
            last_heartbeat: now,
            presence_status: 'ONLINE'
        });

        if (data.capabilities) {
            this.pluginRepository.updateCapabilities(installation.id, JSON.stringify(data.capabilities));
        }

        return { status: 'ACK' };
    }

    validate(token) {
        return this.tokenService.validateToken(token, this.pluginRepository);
    }
}

module.exports = { PluginService };
