// =====================================================
// Middleware de Rate Limiting
// v1.0.0 - Proteção contra brute force e abuso
// =====================================================

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter para tentativas de login
 * 5 tentativas por minuto por IP + email
 */
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // 5 tentativas
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 1 minuto.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Desabilitar validação de IPv6 pois usamos email como parte da key
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
    keyGenerator: (req) => {
        // Usar IP + email para limitar por combinação
        const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
        const email = req.body?.email || 'unknown-email';
        return `login-${ip}-${email}`;
    }
});

/**
 * Rate limiter para recuperação de senha (email)
 * 3 tentativas por 15 minutos por IP
 */
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // 3 tentativas
    message: {
        error: 'Muitas solicitações de recuperação. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter para recuperação via WhatsApp
 * 3 tentativas por 15 minutos por IP
 */
const whatsappRecoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // 3 tentativas
    message: {
        error: 'Muitas solicitações de código WhatsApp. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter para verificação de códigos/tokens
 * 10 tentativas por 15 minutos por IP
 */
const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 tentativas
    message: {
        error: 'Muitas tentativas de verificação. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter para reset de senha
 * 5 tentativas por 15 minutos por IP
 */
const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas
    message: {
        error: 'Muitas tentativas de redefinição. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter geral para API
 * 100 requests por minuto por IP
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 requests
    message: {
        error: 'Limite de requisições excedido. Tente novamente em 1 minuto.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    forgotPasswordLimiter,
    whatsappRecoveryLimiter,
    verifyLimiter,
    resetPasswordLimiter,
    apiLimiter
};
