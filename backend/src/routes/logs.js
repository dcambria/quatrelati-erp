// =====================================================
// Rotas de Logs de Atividade
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

        // Total de logs nos últimos X dias
        const totalResult = await req.db.query(`
            SELECT COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '${parseInt(dias)} days'
        `);

        // Logs por usuário
        const porUsuarioResult = await req.db.query(`
            SELECT user_nome, COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '${parseInt(dias)} days'
            GROUP BY user_nome
            ORDER BY total DESC
            LIMIT 10
        `);

        // Logs por ação
        const porAcaoResult = await req.db.query(`
            SELECT action, COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '${parseInt(dias)} days'
            GROUP BY action
            ORDER BY total DESC
        `);

        // Logs por dia
        const porDiaResult = await req.db.query(`
            SELECT DATE(created_at) as data, COUNT(*) as total
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '${parseInt(dias)} days'
            GROUP BY DATE(created_at)
            ORDER BY data DESC
        `);

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

module.exports = router;
