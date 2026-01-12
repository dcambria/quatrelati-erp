// =====================================================
// Middleware de Autenticação JWT
// v1.1.0 - Removido fallback inseguro do JWT_SECRET
// =====================================================

const jwt = require('jsonwebtoken');

// JWT_SECRET deve ser definido no .env - sem fallback por segurança
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('[AUTH] ERRO CRÍTICO: JWT_SECRET não definido no .env');
    console.error('[AUTH] A aplicação não pode funcionar sem JWT_SECRET configurado.');
    process.exit(1);
}

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
