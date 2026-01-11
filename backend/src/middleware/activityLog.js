// =====================================================
// Middleware de Log de Atividades
// =====================================================

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
                entity_id, entity_name, details, ip_address, user_agent
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
                        ipAddress: req.ip || req.connection?.remoteAddress,
                        userAgent: req.get('User-Agent'),
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
