// =====================================================
// Utilitários de IP
// v1.0.0 - Captura IP real e geolocalização
// =====================================================

/**
 * Extrai o IP real do cliente considerando proxies e CDN
 * Ordem de prioridade: CF-Connecting-IP > X-Real-IP > X-Forwarded-For > req.ip
 * @param {Object} req - Objeto request do Express
 * @returns {string} IP do cliente
 */
function getRealIP(req) {
    // Cloudflare
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) return cfIP;

    // Nginx X-Real-IP
    const realIP = req.headers['x-real-ip'];
    if (realIP) return realIP;

    // X-Forwarded-For (pode ter múltiplos IPs separados por vírgula)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // Pegar o primeiro IP (cliente original)
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        if (ips[0] && !isPrivateIP(ips[0])) {
            return ips[0];
        }
    }

    // Fallback para req.ip ou remoteAddress
    let ip = req.ip || req.connection?.remoteAddress || '';

    // Remover prefixo IPv6 de endereços IPv4
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    return ip;
}

/**
 * Verifica se é um IP privado/local
 * @param {string} ip - Endereço IP
 * @returns {boolean}
 */
function isPrivateIP(ip) {
    if (!ip) return true;

    // Remover prefixo IPv6
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    // IPs privados
    const privateRanges = [
        /^10\./,                    // 10.0.0.0/8
        /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
        /^192\.168\./,              // 192.168.0.0/16
        /^127\./,                   // 127.0.0.0/8 (localhost)
        /^169\.254\./,              // 169.254.0.0/16 (link-local)
        /^::1$/,                    // IPv6 localhost
        /^fc00:/,                   // IPv6 unique local
        /^fe80:/,                   // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip));
}

/**
 * Cache simples para geolocalização (evita chamadas repetidas)
 */
const geoCache = new Map();
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Obtém o país do IP usando API gratuita ip-api.com
 * @param {string} ip - Endereço IP
 * @returns {Promise<string|null>} Código do país (ex: BR, US) ou null
 */
async function getCountryFromIP(ip) {
    if (!ip || isPrivateIP(ip)) {
        return null;
    }

    // Verificar cache
    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL) {
        return cached.country;
    }

    try {
        // Usar ip-api.com (gratuito, 45 req/min)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`);
        const data = await response.json();

        if (data.status === 'success' && data.countryCode) {
            // Armazenar no cache
            geoCache.set(ip, {
                country: data.countryCode,
                timestamp: Date.now()
            });
            return data.countryCode;
        }
    } catch (error) {
        console.error('[GEO] Erro ao obter país do IP:', error.message);
    }

    return null;
}

/**
 * Limpa entradas antigas do cache
 */
function cleanGeoCache() {
    const now = Date.now();
    for (const [ip, data] of geoCache.entries()) {
        if (now - data.timestamp > GEO_CACHE_TTL) {
            geoCache.delete(ip);
        }
    }
}

// Limpar cache periodicamente
setInterval(cleanGeoCache, 60 * 60 * 1000); // A cada hora

module.exports = {
    getRealIP,
    isPrivateIP,
    getCountryFromIP,
};
