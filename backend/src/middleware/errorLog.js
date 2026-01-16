// =====================================================
// Middleware de Log de Erros
// v1.1.0 - Geolocalização de IP + log de email em login
// =====================================================

// Cache de geolocalização para evitar chamadas repetidas
const geoCache = new Map();
const GEO_CACHE_TTL = 3600000; // 1 hora

/**
 * Obtém o país do IP via API gratuita
 * @param {string} ip - Endereço IP
 * @returns {Promise<string|null>} Código do país (BR, US, etc)
 */
async function getCountryFromIP(ip) {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'BR'; // IPs locais assumem Brasil
    }

    // Limpar IP (remover ::ffff: prefix do IPv6-mapped IPv4)
    const cleanIP = ip.replace(/^::ffff:/, '');

    // Verificar cache
    const cached = geoCache.get(cleanIP);
    if (cached && cached.timestamp > Date.now() - GEO_CACHE_TTL) {
        return cached.country;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=countryCode`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            const country = data.countryCode || null;

            // Salvar no cache
            geoCache.set(cleanIP, { country, timestamp: Date.now() });

            return country;
        }
    } catch (error) {
        // Silenciosamente falha - geolocalização é opcional
    }

    return null;
}

/**
 * Registra erro no banco de dados
 * @param {Object} db - Pool de conexão do banco
 * @param {Object} options - Opções do log
 */
async function logError(db, options) {
    const {
        userId,
        userNome,
        userNivel,
        errorType,
        errorMessage,
        endpoint,
        method,
        requestBody,
        validationErrors,
        stackTrace,
        ipAddress,
        userAgent,
        attemptedEmail,
    } = options;

    try {
        // Obter país do IP (assíncrono mas não bloqueia)
        const country = await getCountryFromIP(ipAddress);

        await db.query(`
            INSERT INTO error_logs (
                user_id, user_nome, user_nivel, error_type, error_message,
                endpoint, method, request_body, validation_errors,
                stack_trace, ip_address, user_agent, country, attempted_email
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
            userId,
            userNome,
            userNivel,
            errorType,
            errorMessage,
            endpoint,
            method,
            requestBody ? JSON.stringify(sanitizeBody(requestBody)) : null,
            validationErrors ? JSON.stringify(validationErrors) : null,
            stackTrace,
            ipAddress,
            userAgent,
            country,
            attemptedEmail,
        ]);
    } catch (error) {
        console.error('Erro ao registrar log de erro:', error);
    }
}

/**
 * Remove dados sensíveis do body antes de logar
 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['senha', 'password', 'token', 'secret', 'api_key', 'apiKey'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Middleware para capturar e logar erros de validação e outros erros
 */
function errorLogMiddleware() {
    return async (req, res, next) => {
        // Armazenar referência original do método json
        const originalJson = res.json.bind(res);

        // Sobrescrever res.json para capturar erros
        res.json = async function(data) {
            // Logar se a resposta foi um erro (4xx ou 5xx)
            if (res.statusCode >= 400) {
                try {
                    // Buscar dados do usuário se autenticado
                    let userNome = null;
                    let userNivel = null;

                    if (req.userId && req.db) {
                        try {
                            const userResult = await req.db.query(
                                'SELECT nome, nivel FROM usuarios WHERE id = $1',
                                [req.userId]
                            );
                            if (userResult.rows[0]) {
                                userNome = userResult.rows[0].nome;
                                userNivel = userResult.rows[0].nivel;
                            }
                        } catch (e) {
                            // Ignora erro ao buscar usuário
                        }
                    }

                    // Determinar tipo de erro
                    let errorType = 'unknown';
                    if (res.statusCode === 400) errorType = 'validation';
                    else if (res.statusCode === 401) errorType = 'authentication';
                    else if (res.statusCode === 403) errorType = 'authorization';
                    else if (res.statusCode === 404) errorType = 'not_found';
                    else if (res.statusCode >= 500) errorType = 'server_error';

                    // Extrair mensagem de erro
                    const errorMessage = data?.error || data?.message || 'Erro desconhecido';

                    // Extrair erros de validação
                    const validationErrors = data?.details || null;

                    // Extrair email de tentativas de login
                    let attemptedEmail = null;
                    if (req.originalUrl.includes('/auth/login') && req.body?.email) {
                        attemptedEmail = req.body.email;
                    }

                    await logError(req.db, {
                        userId: req.userId || null,
                        userNome,
                        userNivel,
                        errorType,
                        errorMessage,
                        endpoint: req.originalUrl,
                        method: req.method,
                        requestBody: req.method !== 'GET' ? req.body : null,
                        validationErrors,
                        stackTrace: null,
                        ipAddress: req.ip || req.connection?.remoteAddress,
                        userAgent: req.get('User-Agent'),
                        attemptedEmail,
                    });
                } catch (error) {
                    console.error('Erro no middleware de error log:', error);
                }
            }

            // Chamar o método original
            return originalJson(data);
        };

        next();
    };
}

/**
 * Middleware global de tratamento de erros (para erros não capturados)
 */
function globalErrorHandler(err, req, res, next) {
    console.error('Erro não tratado:', err);

    // Logar o erro
    if (req.db) {
        logError(req.db, {
            userId: req.userId || null,
            userNome: null,
            userNivel: null,
            errorType: 'uncaught_error',
            errorMessage: err.message || 'Erro interno do servidor',
            endpoint: req.originalUrl,
            method: req.method,
            requestBody: req.method !== 'GET' ? req.body : null,
            validationErrors: null,
            stackTrace: err.stack,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            attemptedEmail: null,
        }).catch(e => console.error('Falha ao logar erro:', e));
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
}

module.exports = {
    logError,
    errorLogMiddleware,
    globalErrorHandler,
};
