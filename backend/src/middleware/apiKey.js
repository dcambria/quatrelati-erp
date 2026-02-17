// =====================================================
// Middleware de autenticação por API Key
// Usado para endpoints internos (site → ERP)
// =====================================================

const crypto = require('crypto');

const SITE_API_KEY = process.env.SITE_API_KEY;

if (!SITE_API_KEY) {
    console.error('[API_KEY] ERRO: SITE_API_KEY não definida no .env — endpoint de contatos desprotegido');
}

/**
 * Valida o header X-Api-Key para chamadas inter-serviço.
 * Usa comparação constante para evitar timing attacks.
 */
const apiKeyMiddleware = (req, res, next) => {
    if (!SITE_API_KEY) {
        // Sem chave configurada, aceita em desenvolvimento (loga erro)
        return next();
    }

    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API Key ausente' });
    }

    // Comparação constante para prevenir timing attacks
    try {
        const keyBuffer = Buffer.from(apiKey);
        const expectedBuffer = Buffer.from(SITE_API_KEY);

        if (keyBuffer.length !== expectedBuffer.length) {
            return res.status(401).json({ error: 'API Key inválida' });
        }

        if (!crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
            return res.status(401).json({ error: 'API Key inválida' });
        }
    } catch {
        return res.status(401).json({ error: 'API Key inválida' });
    }

    return next();
};

module.exports = { apiKeyMiddleware };
