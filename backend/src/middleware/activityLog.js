// =====================================================
// Middleware de Log de Atividades
// v1.1.0 - IP real + geolocalização com bandeira
// =====================================================

const { getRealIP, getCountryFromIP } = require('../utils/ipUtils');

/**
 * Registra atividade no banco de dados
 * @param {Object} db - Pool de conexão do banco
 * @param {Object} options - Opções do log
 */
async function logActivity(db, options) {
    const {
        userId,
        userNome,
        userNivel,
        action,
        entity,
        entityId,
        entityName,
        details,
        ipAddress,
        userAgent,
        country,
    } = options;

    try {
        // Verificar se deve logar superadmins
        if (userNivel === 'superadmin') {
            const configResult = await db.query(
                "SELECT valor FROM configuracoes WHERE chave = 'log_superadmin'"
            );
            const logSuperadmin = configResult.rows[0]?.valor !== 'false';
            if (!logSuperadmin) {
                return; // Não logar ações de superadmin
            }
        }

        await db.query(`
            INSERT INTO activity_logs (
                user_id, user_nome, user_nivel, action, entity,
                entity_id, entity_name, details, ip_address, user_agent, country
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
            userId,
            userNome,
            userNivel,
            action,
            entity,
            entityId,
            entityName,
            details ? JSON.stringify(details) : null,
            ipAddress,
            userAgent,
            country,
        ]);
    } catch (error) {
        console.error('Erro ao registrar log de atividade:', error);
        // Não lançar erro para não afetar a operação principal
    }
}

/**
 * Middleware para logging automático de requisições
 */
function activityLogMiddleware(action, entity) {
    return async (req, res, next) => {
        // Armazenar referência original do método json
        const originalJson = res.json.bind(res);

        // Sobrescrever res.json para capturar a resposta
        res.json = async function(data) {
            // Só logar se a resposta foi bem-sucedida
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    // Buscar dados do usuário
                    const userResult = await req.db.query(
                        'SELECT nome, nivel FROM usuarios WHERE id = $1',
                        [req.userId]
                    );
                    const user = userResult.rows[0];

                    // Extrair informações da entidade
                    let entityId = req.params.id || data?.id || data?.cliente?.id || data?.pedido?.id || data?.produto?.id || data?.usuario?.id;
                    let entityName = data?.cliente?.nome || data?.pedido?.numero_pedido || data?.produto?.nome || data?.usuario?.nome;

                    // Obter IP real e país
                    const realIP = getRealIP(req);
                    const country = await getCountryFromIP(realIP);

                    await logActivity(req.db, {
                        userId: req.userId,
                        userNome: user?.nome,
                        userNivel: user?.nivel,
                        action,
                        entity,
                        entityId: entityId ? parseInt(entityId) : null,
                        entityName,
                        details: {
                            method: req.method,
                            path: req.originalUrl,
                            body: req.method !== 'GET' ? req.body : undefined,
                        },
                        ipAddress: realIP,
                        userAgent: req.get('User-Agent'),
                        country,
                    });
                } catch (error) {
                    console.error('Erro no middleware de log:', error);
                }
            }

            // Chamar o método original
            return originalJson(data);
        };

        next();
    };
}

module.exports = {
    logActivity,
    activityLogMiddleware,
};
