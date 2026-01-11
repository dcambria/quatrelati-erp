// =====================================================
// Rotas do Dashboard
// v1.1.0 - Suporte a filtro global por vendedor
// =====================================================

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Helper para verificar permissões e obter filtro de vendedor
async function getVendedorFilter(req) {
    const { vendedor_id } = req.query;

    const userResult = await req.db.query(
        'SELECT nivel, pode_visualizar_todos FROM usuarios WHERE id = $1',
        [req.userId]
    );
    const userNivel = userResult.rows[0]?.nivel;
    const podeVisualizarTodos = userResult.rows[0]?.pode_visualizar_todos;
    const canViewAll = ['superadmin', 'admin'].includes(userNivel) || podeVisualizarTodos;

    if (!canViewAll) {
        return { vendedorId: req.userId, canViewAll: false };
    } else if (vendedor_id) {
        return { vendedorId: parseInt(vendedor_id), canViewAll: true };
    }
    return { vendedorId: null, canViewAll: true };
}

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * GET /api/dashboard/resumo
 * Resumo do mês atual (filtrado por vendedor se necessário)
 */
router.get('/resumo', async (req, res) => {
    try {
        const { mes, ano, vendedor_id } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        // Verificar nível do usuário
        const userResult = await req.db.query(
            'SELECT nivel, pode_visualizar_todos FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const podeVisualizarTodos = userResult.rows[0]?.pode_visualizar_todos;
        const canViewAll = ['superadmin', 'admin'].includes(userNivel) || podeVisualizarTodos;

        // Definir filtro de vendedor
        let vendedorFilter = '';
        let params = [mesAtual, anoAtual];

        if (!canViewAll) {
            // Vendedor só vê seus próprios dados
            vendedorFilter = ' AND created_by = $3';
            params.push(req.userId);
        } else if (vendedor_id) {
            // Admin pode filtrar por vendedor específico
            vendedorFilter = ' AND created_by = $3';
            params.push(parseInt(vendedor_id));
        }

        const result = await req.db.query(`
            SELECT
                COUNT(*) as total_pedidos,
                COALESCE(SUM(total), 0) as valor_total,
                COALESCE(SUM(peso_kg), 0) as peso_total,
                COALESCE(SUM(quantidade_caixas), 0) as total_caixas,
                COUNT(CASE WHEN entregue THEN 1 END) as entregues,
                COUNT(CASE WHEN NOT entregue THEN 1 END) as pendentes
            FROM pedidos
            WHERE EXTRACT(MONTH FROM data_entrega) = $1
            AND EXTRACT(YEAR FROM data_entrega) = $2
            ${vendedorFilter}
        `, params);

        // Buscar dados do mês anterior para comparação
        let mesAnterior = parseInt(mesAtual) - 1;
        let anoAnterior = parseInt(anoAtual);
        if (mesAnterior === 0) {
            mesAnterior = 12;
            anoAnterior--;
        }

        // Preparar params para mês anterior com mesmo filtro de vendedor
        let paramsAnterior = [mesAnterior, anoAnterior];
        if (params.length === 3) {
            paramsAnterior.push(params[2]);
        }

        const anterior = await req.db.query(`
            SELECT
                COUNT(*) as total_pedidos,
                COALESCE(SUM(total), 0) as valor_total,
                COALESCE(SUM(peso_kg), 0) as peso_total
            FROM pedidos
            WHERE EXTRACT(MONTH FROM data_entrega) = $1
            AND EXTRACT(YEAR FROM data_entrega) = $2
            ${vendedorFilter}
        `, paramsAnterior);

        const atual = result.rows[0];
        const ant = anterior.rows[0];

        // Calcular variações
        const calcVariacao = (valorAtual, valorAnterior) => {
            if (parseFloat(valorAnterior) === 0) return 0;
            return ((parseFloat(valorAtual) - parseFloat(valorAnterior)) / parseFloat(valorAnterior) * 100).toFixed(1);
        };

        res.json({
            mes: parseInt(mesAtual),
            ano: parseInt(anoAtual),
            resumo: {
                total_pedidos: parseInt(atual.total_pedidos),
                valor_total: parseFloat(atual.valor_total),
                peso_total: parseFloat(atual.peso_total),
                total_caixas: parseInt(atual.total_caixas),
                entregues: parseInt(atual.entregues),
                pendentes: parseInt(atual.pendentes),
                taxa_entrega: atual.total_pedidos > 0
                    ? ((atual.entregues / atual.total_pedidos) * 100).toFixed(1)
                    : 0
            },
            comparativo: {
                pedidos_variacao: calcVariacao(atual.total_pedidos, ant.total_pedidos),
                valor_variacao: calcVariacao(atual.valor_total, ant.valor_total),
                peso_variacao: calcVariacao(atual.peso_total, ant.peso_total)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo' });
    }
});

/**
 * GET /api/dashboard/stats
 * Estatísticas gerais
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await req.db.query(`
            SELECT
                (SELECT COUNT(*) FROM clientes WHERE ativo = true) as total_clientes,
                (SELECT COUNT(*) FROM produtos WHERE ativo = true) as total_produtos,
                (SELECT COUNT(*) FROM pedidos) as total_pedidos,
                (SELECT COALESCE(SUM(total), 0) FROM pedidos) as faturamento_total,
                (SELECT COALESCE(SUM(peso_kg), 0) FROM pedidos) as peso_total_vendido
        `);

        res.json({ stats: stats.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

/**
 * GET /api/dashboard/top-clientes
 * Top 5 clientes por valor de pedidos
 */
router.get('/top-clientes', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const { vendedorId } = await getVendedorFilter(req);

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (mes && ano) {
            whereConditions.push(`EXTRACT(MONTH FROM p.data_entrega) = $${paramIndex} AND EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex + 1}`);
            params.push(parseInt(mes), parseInt(ano));
            paramIndex += 2;
        }

        if (vendedorId) {
            whereConditions.push(`p.created_by = $${paramIndex}`);
            params.push(vendedorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const result = await req.db.query(`
            SELECT
                c.id,
                c.nome,
                COUNT(p.id) as total_pedidos,
                COALESCE(SUM(p.total), 0) as valor_total,
                COALESCE(SUM(p.peso_kg), 0) as peso_total
            FROM clientes c
            INNER JOIN pedidos p ON c.id = p.cliente_id
            ${whereClause}
            GROUP BY c.id, c.nome
            ORDER BY valor_total DESC
            LIMIT 5
        `, params);

        res.json({ clientes: result.rows });
    } catch (error) {
        console.error('Erro ao buscar top clientes:', error);
        res.status(500).json({ error: 'Erro ao buscar top clientes' });
    }
});

/**
 * GET /api/dashboard/top-produtos
 * Top 5 produtos mais vendidos
 */
router.get('/top-produtos', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const { vendedorId } = await getVendedorFilter(req);

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (mes && ano) {
            whereConditions.push(`EXTRACT(MONTH FROM p.data_entrega) = $${paramIndex} AND EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex + 1}`);
            params.push(parseInt(mes), parseInt(ano));
            paramIndex += 2;
        }

        if (vendedorId) {
            whereConditions.push(`p.created_by = $${paramIndex}`);
            params.push(vendedorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const result = await req.db.query(`
            SELECT
                pr.id,
                pr.nome,
                COUNT(p.id) as total_pedidos,
                COALESCE(SUM(p.quantidade_caixas), 0) as total_caixas,
                COALESCE(SUM(p.peso_kg), 0) as peso_total,
                COALESCE(SUM(p.total), 0) as valor_total
            FROM produtos pr
            INNER JOIN pedidos p ON pr.id = p.produto_id
            ${whereClause}
            GROUP BY pr.id, pr.nome
            ORDER BY total_caixas DESC
            LIMIT 5
        `, params);

        res.json({ produtos: result.rows });
    } catch (error) {
        console.error('Erro ao buscar top produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar top produtos' });
    }
});

/**
 * GET /api/dashboard/evolucao
 * Evolução mensal (últimos 6 meses)
 */
router.get('/evolucao', async (req, res) => {
    try {
        const { vendedorId } = await getVendedorFilter(req);

        let vendedorFilter = '';
        let params = [];

        if (vendedorId) {
            vendedorFilter = 'AND created_by = $1';
            params.push(vendedorId);
        }

        const result = await req.db.query(`
            SELECT
                EXTRACT(YEAR FROM data_entrega) as ano,
                EXTRACT(MONTH FROM data_entrega) as mes,
                COUNT(*) as total_pedidos,
                COALESCE(SUM(total), 0) as valor_total,
                COALESCE(SUM(peso_kg), 0) as peso_total,
                COUNT(CASE WHEN entregue THEN 1 END) as entregues
            FROM pedidos
            WHERE data_entrega >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
            ${vendedorFilter}
            GROUP BY EXTRACT(YEAR FROM data_entrega), EXTRACT(MONTH FROM data_entrega)
            ORDER BY ano, mes
        `, params);

        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        const evolucao = result.rows.map(row => ({
            periodo: `${meses[parseInt(row.mes) - 1]}/${row.ano}`,
            mes: parseInt(row.mes),
            ano: parseInt(row.ano),
            total_pedidos: parseInt(row.total_pedidos),
            valor_total: parseFloat(row.valor_total),
            peso_total: parseFloat(row.peso_total),
            entregues: parseInt(row.entregues)
        }));

        res.json({ evolucao });
    } catch (error) {
        console.error('Erro ao buscar evolução:', error);
        res.status(500).json({ error: 'Erro ao buscar evolução' });
    }
});

/**
 * GET /api/dashboard/proximas-entregas
 * Entregas nos próximos 7 dias
 */
router.get('/proximas-entregas', async (req, res) => {
    try {
        const { vendedorId } = await getVendedorFilter(req);

        let vendedorFilter = '';
        let params = [];

        if (vendedorId) {
            vendedorFilter = 'AND p.created_by = $1';
            params.push(vendedorId);
        }

        const result = await req.db.query(`
            SELECT
                p.*,
                c.nome as cliente_nome,
                pr.nome as produto_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN produtos pr ON p.produto_id = pr.id
            WHERE p.entregue = false
            AND p.data_entrega >= CURRENT_DATE
            AND p.data_entrega <= CURRENT_DATE + INTERVAL '7 days'
            ${vendedorFilter}
            ORDER BY p.data_entrega ASC
            LIMIT 10
        `, params);

        res.json({ entregas: result.rows });
    } catch (error) {
        console.error('Erro ao buscar próximas entregas:', error);
        res.status(500).json({ error: 'Erro ao buscar próximas entregas' });
    }
});

/**
 * GET /api/dashboard/entregas-atrasadas
 * Pedidos com entrega atrasada
 */
router.get('/entregas-atrasadas', async (req, res) => {
    try {
        const { vendedorId } = await getVendedorFilter(req);

        let vendedorFilter = '';
        let params = [];

        if (vendedorId) {
            vendedorFilter = 'AND p.created_by = $1';
            params.push(vendedorId);
        }

        const result = await req.db.query(`
            SELECT
                p.*,
                c.nome as cliente_nome,
                pr.nome as produto_nome,
                (CURRENT_DATE - p.data_entrega) as dias_atraso
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN produtos pr ON p.produto_id = pr.id
            WHERE p.entregue = false
            AND p.data_entrega < CURRENT_DATE
            ${vendedorFilter}
            ORDER BY p.data_entrega ASC
        `, params);

        res.json({ atrasados: result.rows });
    } catch (error) {
        console.error('Erro ao buscar entregas atrasadas:', error);
        res.status(500).json({ error: 'Erro ao buscar entregas atrasadas' });
    }
});

/**
 * GET /api/dashboard/empresa
 * Dashboard geral da empresa com breakdown por vendedor
 * Apenas admins e superadmins
 */
router.get('/empresa', async (req, res) => {
    try {
        // Verificar nível do usuário
        const userResult = await req.db.query(
            'SELECT nivel FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const isAdmin = ['superadmin', 'admin'].includes(userNivel);

        if (!isAdmin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        // Resumo geral da empresa
        const resumoGeral = await req.db.query(`
            SELECT
                COUNT(*) as total_pedidos,
                COALESCE(SUM(total), 0) as valor_total,
                COALESCE(SUM(peso_kg), 0) as peso_total,
                COALESCE(SUM(quantidade_caixas), 0) as total_caixas,
                COUNT(CASE WHEN entregue THEN 1 END) as entregues,
                COUNT(CASE WHEN NOT entregue THEN 1 END) as pendentes
            FROM pedidos
            WHERE EXTRACT(MONTH FROM data_entrega) = $1
            AND EXTRACT(YEAR FROM data_entrega) = $2
        `, [mesAtual, anoAtual]);

        // Breakdown por vendedor
        const porVendedor = await req.db.query(`
            SELECT
                u.id as vendedor_id,
                u.nome as vendedor_nome,
                u.email as vendedor_email,
                COUNT(p.id) as total_pedidos,
                COALESCE(SUM(p.total), 0) as valor_total,
                COALESCE(SUM(p.peso_kg), 0) as peso_total,
                COALESCE(SUM(p.quantidade_caixas), 0) as total_caixas,
                COUNT(CASE WHEN p.entregue THEN 1 END) as entregues,
                COUNT(CASE WHEN NOT p.entregue THEN 1 END) as pendentes,
                (SELECT COUNT(*) FROM clientes c WHERE c.created_by = u.id) as total_clientes
            FROM usuarios u
            LEFT JOIN pedidos p ON p.created_by = u.id
                AND EXTRACT(MONTH FROM p.data_entrega) = $1
                AND EXTRACT(YEAR FROM p.data_entrega) = $2
            WHERE u.nivel = 'vendedor' AND u.ativo = true
            GROUP BY u.id, u.nome, u.email
            ORDER BY valor_total DESC
        `, [mesAtual, anoAtual]);

        // Top clientes geral
        const topClientes = await req.db.query(`
            SELECT
                c.id,
                c.nome,
                u.nome as vendedor_nome,
                COUNT(p.id) as total_pedidos,
                COALESCE(SUM(p.total), 0) as valor_total
            FROM clientes c
            LEFT JOIN usuarios u ON c.created_by = u.id
            LEFT JOIN pedidos p ON c.id = p.cliente_id
                AND EXTRACT(MONTH FROM p.data_entrega) = $1
                AND EXTRACT(YEAR FROM p.data_entrega) = $2
            GROUP BY c.id, c.nome, u.nome
            ORDER BY valor_total DESC
            LIMIT 10
        `, [mesAtual, anoAtual]);

        // Totais por status
        const porStatus = await req.db.query(`
            SELECT
                entregue,
                COUNT(*) as total,
                COALESCE(SUM(total), 0) as valor
            FROM pedidos
            WHERE EXTRACT(MONTH FROM data_entrega) = $1
            AND EXTRACT(YEAR FROM data_entrega) = $2
            GROUP BY entregue
        `, [mesAtual, anoAtual]);

        res.json({
            mes: parseInt(mesAtual),
            ano: parseInt(anoAtual),
            resumo: resumoGeral.rows[0],
            porVendedor: porVendedor.rows,
            topClientes: topClientes.rows,
            porStatus: porStatus.rows
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
});

/**
 * GET /api/dashboard/vendedores
 * Lista de vendedores para filtro no dashboard
 * Apenas admins e superadmins
 */
router.get('/vendedores', async (req, res) => {
    try {
        // Verificar nível do usuário
        const userResult = await req.db.query(
            'SELECT nivel, pode_visualizar_todos FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const podeVisualizarTodos = userResult.rows[0]?.pode_visualizar_todos;
        const canViewAll = ['superadmin', 'admin'].includes(userNivel) || podeVisualizarTodos;

        if (!canViewAll) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await req.db.query(`
            SELECT id, nome, email, nivel
            FROM usuarios
            WHERE (nivel = 'vendedor' OR nivel = 'admin') AND ativo = true
            ORDER BY nome ASC
        `);

        res.json({ vendedores: result.rows });
    } catch (error) {
        console.error('Erro ao buscar vendedores:', error);
        res.status(500).json({ error: 'Erro ao buscar vendedores' });
    }
});

module.exports = router;
