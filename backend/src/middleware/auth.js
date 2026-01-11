// =====================================================
// Middleware de Autenticação JWT
// =====================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quatrelati-jwt-secret-2026-super-seguro';

/**
 * Middleware de autenticação
 * Verifica se o token JWT é válido
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token malformado' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token malformado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userNivel = decoded.nivel;
        return next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }
};

/**
 * Middleware de autorização por nível
 * @param {string[]} niveisPermitidos - Array de níveis permitidos
 */
const authorize = (...niveisPermitidos) => {
    return (req, res, next) => {
        if (!req.userNivel) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (!niveisPermitidos.includes(req.userNivel)) {
            return res.status(403).json({
                error: 'Você não tem permissão para acessar este recurso'
            });
        }

        return next();
    };
};

/**
 * Middleware que permite acesso apenas para superadmin
 */
const superadminOnly = authorize('superadmin');

/**
 * Middleware que permite acesso para admin e superadmin
 */
const adminOnly = authorize('superadmin', 'admin');

module.exports = {
    authMiddleware,
    authorize,
    superadminOnly,
    adminOnly
};
