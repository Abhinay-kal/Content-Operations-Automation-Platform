class CompatibilityService {
    compare(pluginVersion, protocolVersion, capabilities) {
        const MIN_PROTOCOL_VERSION = '1.0.0';
        
        if (!protocolVersion || !pluginVersion) {
            return 'UNSUPPORTED';
        }

        if (this._compareVersions(protocolVersion, MIN_PROTOCOL_VERSION) < 0) {
            return 'UNSUPPORTED';
        }
        
        if (this._compareVersions(protocolVersion, '2.0.0') >= 0) {
            return 'WARNING';
        }

        return 'COMPATIBLE';
    }

    _compareVersions(v1, v2) {
        const parts1 = String(v1).split('.').map(Number);
        const parts2 = String(v2).split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }
}

module.exports = { CompatibilityService };
