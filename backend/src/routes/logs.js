// =====================================================
// Rotas de Logs de Atividade e Erros
// v1.3.1 - Corrigido bug dias=0 na limpeza
// Apenas superadmins podem acessar
// =====================================================

const express = require('express');
const router = express.Router();
const { authMiddleware, superadminOnly } = require('../middleware/auth');

// Todas as rotas requerem autenticação e nível superadmin
router.use(authMiddleware);
router.use(superadminOnly);

/**
 * GET /api/logs
 * Lista logs de atividade com filtros
 */
router.get('/', async (req, res) => {
    try {
        const {
            user_id,
            action,
            entity,
            data_inicio,
            data_fim,
            page = 1,
            limit = 50
        } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Filtro por usuário
        if (user_id) {
            whereConditions.push(`user_id = $${paramIndex}`);
            params.push(parseInt(user_id));
            paramIndex++;
        }

        // Filtro por ação
        if (action) {
            whereConditions.push(`action = $${paramIndex}`);
            params.push(action);
            paramIndex++;
        }

        // Filtro por entidade
        if (entity) {
            whereConditions.push(`entity = $${paramIndex}`);
            params.push(entity);
            paramIndex++;
        }

        // Filtro por data início
        if (data_inicio) {
            whereConditions.push(`created_at >= $${paramIndex}`);
            params.push(data_inicio);
            paramIndex++;
        }

        // Filtro por data fim
        if (data_fim) {
            whereConditions.push(`created_at <= $${paramIndex}::date + interval '1 day'`);
            params.push(data_fim);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Query principal
        const query = `
            SELECT *
            FROM activity_logs
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await req.db.query(query, params);

        // Contar total
        const countParams = params.slice(0, -2);
        const countResult = await req.db.query(
            `SELECT COUNT(*) as total FROM activity_logs ${whereClause}`,
            countParams
        );
        const total = parseInt(countResult.rows[0].total);

        res.json({
            logs: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Erro ao listar logs:', error);
        res.status(500).json({ error: 'Erro ao listar logs' });
    }
});

/**
 * GET /api/logs/usuarios
 * Lista usuários que aparecem nos logs (para filtro)
 */
router.get('/usuarios', async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT DISTINCT user_id, user_nome, user_nivel
            FROM activity_logs
            WHERE user_id IS NOT NULL
            ORDER BY user_nome ASC
        `);

        res.json({ usuarios: result.rows });
    } catch (error) {
        console.error('Erro ao listar usuários dos logs:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

/**
 * GET /api/logs/acoes
 * Lista ações distintas que aparecem nos logs
 */
router.get('/acoes', async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT DISTINCT action FROM activity_logs ORDER BY action ASC
        `);

        res.json({ acoes: result.rows.map(r => r.action) });
    } catch (error) {
        console.error('Erro ao listar ações dos logs:', error);
        res.status(500).json({ error: 'Erro ao listar ações' });
    }
});

/**
 * GET /api/logs/entidades
 * Lista entidades distintas que aparecem nos logs
 */
router.get('/entidades', async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT DISTINCT entity FROM activity_logs WHERE entity IS NOT NULL ORDER BY entity ASC
        `);

        res.json({ entidades: result.rows.map(r => r.entity) });
    } catch (error) {
        console.error('Erro ao listar entidades dos logs:', error);
        res.status(500).json({ error: 'Erro ao listar entidades' });
    }
});

/**
 * GET /api/logs/estatisticas
 * Estatísticas gerais dos logs
 */
router.get('/estatisticas', async (req, res) => {
    try {
        const { dias = 30 } = req.query;

        // Validar e sanitizar parâmetro dias (1-365)
        const diasInt = Math.min(Math.max(parseInt(dias) || 30, 1), 365);

        // Total de logs nos últimos X dias
        const totalResult = await req.db.query(`
            SELECT COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
        `, [diasInt]);

        // Logs por usuário
        const porUsuarioResult = await req.db.query(`
            SELECT user_nome, COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY user_nome
            ORDER BY total DESC
            LIMIT 10
        `, [diasInt]);

        // Logs por ação
        const porAcaoResult = await req.db.query(`
            SELECT action, COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY action
            ORDER BY total DESC
        `, [diasInt]);

        // Logs por dia
        const porDiaResult = await req.db.query(`
            SELECT DATE(created_at) as data, COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY DATE(created_at)
            ORDER BY data DESC
        `, [diasInt]);

        res.json({
            total: parseInt(totalResult.rows[0].total),
            porUsuario: porUsuarioResult.rows,
            porAcao: porAcaoResult.rows,
            porDia: porDiaResult.rows,
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// =====================================================
// ROTAS DE ERROR LOGS
// =====================================================

/**
 * GET /api/logs/errors
 * Lista logs de erro com filtros
 */
router.get('/errors', async (req, res) => {
    try {
        const {
            user_id,
            error_type,
            endpoint,
            data_inicio,
            data_fim,
            page = 1,
            limit = 50
        } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (user_id) {
            whereConditions.push(`user_id = $${paramIndex}`);
            params.push(parseInt(user_id));
            paramIndex++;
        }

        if (error_type) {
            whereConditions.push(`error_type = $${paramIndex}`);
            params.push(error_type);
            paramIndex++;
        }

        if (endpoint) {
            whereConditions.push(`endpoint ILIKE $${paramIndex}`);
            params.push(`%${endpoint}%`);
            paramIndex++;
        }

        if (data_inicio) {
            whereConditions.push(`created_at >= $${paramIndex}`);
            params.push(data_inicio);
            paramIndex++;
        }

        if (data_fim) {
            whereConditions.push(`created_at <= $${paramIndex}::date + interval '1 day'`);
            params.push(data_fim);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT *
            FROM error_logs
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await req.db.query(query, params);

        const countParams = params.slice(0, -2);
        const countResult = await req.db.query(
            `SELECT COUNT(*) as total FROM error_logs ${whereClause}`,
            countParams
        );
        const total = parseInt(countResult.rows[0].total);

        res.json({
            errors: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Erro ao listar error logs:', error);
        res.status(500).json({ error: 'Erro ao listar error logs' });
    }
});

/**
 * GET /api/logs/errors/tipos
 * Lista tipos de erro distintos
 */
router.get('/errors/tipos', async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT DISTINCT error_type FROM error_logs ORDER BY error_type ASC
        `);

        res.json({ tipos: result.rows.map(r => r.error_type) });
    } catch (error) {
        console.error('Erro ao listar tipos de erro:', error);
        res.status(500).json({ error: 'Erro ao listar tipos de erro' });
    }
});

/**
 * GET /api/logs/errors/estatisticas
 * Estatísticas de erros
 */
router.get('/errors/estatisticas', async (req, res) => {
    try {
        const { dias = 30 } = req.query;
        const diasInt = Math.min(Math.max(parseInt(dias) || 30, 1), 365);

        // Total de erros
        const totalResult = await req.db.query(`
            SELECT COUNT(*) as total
            FROM error_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
        `, [diasInt]);

        // Erros por tipo
        const porTipoResult = await req.db.query(`
            SELECT error_type, COUNT(*) as total
            FROM error_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY error_type
            ORDER BY total DESC
        `, [diasInt]);

        // Erros por endpoint
        const porEndpointResult = await req.db.query(`
            SELECT endpoint, COUNT(*) as total
            FROM error_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY endpoint
            ORDER BY total DESC
            LIMIT 10
        `, [diasInt]);

        // Erros por dia
        const porDiaResult = await req.db.query(`
            SELECT DATE(created_at) as data, COUNT(*) as total
            FROM error_logs
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY DATE(created_at)
            ORDER BY data DESC
        `, [diasInt]);

        res.json({
            total: parseInt(totalResult.rows[0].total),
            porTipo: porTipoResult.rows,
            porEndpoint: porEndpointResult.rows,
            porDia: porDiaResult.rows,
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas de erros:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas de erros' });
    }
});

// =====================================================
// LIMPAR LOGS
// =====================================================

/**
 * DELETE /api/logs/clear
 * Limpa todos os activity logs (mantém últimos 7 dias por padrão)
 */
router.delete('/clear', async (req, res) => {
    try {
        const { dias } = req.query;
        const diasParsed = parseInt(dias);
        const diasInt = isNaN(diasParsed) ? 7 : Math.max(diasParsed, 0);

        let result;
        if (diasInt === 0) {
            // Limpar todos
            result = await req.db.query('DELETE FROM activity_logs');
        } else {
            // Manter últimos X dias
            result = await req.db.query(
                'DELETE FROM activity_logs WHERE created_at < NOW() - make_interval(days => $1)',
                [diasInt]
            );
        }

        res.json({
            message: 'Logs de atividade limpos com sucesso',
            deletados: result.rowCount
        });
    } catch (error) {
        console.error('Erro ao limpar activity logs:', error);
        res.status(500).json({ error: 'Erro ao limpar logs' });
    }
});

/**
 * DELETE /api/logs/errors/clear
 * Limpa todos os error logs (mantém últimos 7 dias por padrão)
 */
router.delete('/errors/clear', async (req, res) => {
    try {
        const { dias } = req.query;
        const diasParsed = parseInt(dias);
        const diasInt = isNaN(diasParsed) ? 7 : Math.max(diasParsed, 0);

        let result;
        if (diasInt === 0) {
            // Limpar todos
            result = await req.db.query('DELETE FROM error_logs');
        } else {
            // Manter últimos X dias
            result = await req.db.query(
                'DELETE FROM error_logs WHERE created_at < NOW() - make_interval(days => $1)',
                [diasInt]
            );
        }

        res.json({
            message: 'Logs de erro limpos com sucesso',
            deletados: result.rowCount
        });
    } catch (error) {
        console.error('Erro ao limpar error logs:', error);
        res.status(500).json({ error: 'Erro ao limpar logs de erro' });
    }
});

module.exports = router;
