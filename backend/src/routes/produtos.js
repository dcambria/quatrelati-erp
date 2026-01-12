// =====================================================
// Rotas de Produtos
// v1.1.0 - Aplicar Activity Log em todas as rotas
// GET: todos podem ver
// POST/PUT/DELETE: apenas admin/superadmin
// =====================================================

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { produtoValidation, idValidation } = require('../middleware/validation');
const { activityLogMiddleware } = require('../middleware/activityLog');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * GET /api/produtos
 * Lista todos os produtos
 */
router.get('/', async (req, res) => {
    try {
        const { ativo, search } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Filtro por status ativo
        if (ativo !== undefined) {
            whereConditions.push(`ativo = $${paramIndex}`);
            params.push(ativo === 'true');
            paramIndex++;
        }

        // Busca por nome
        if (search) {
            whereConditions.push(`nome ILIKE $${paramIndex}`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const result = await req.db.query(`
            SELECT p.*,
                (SELECT COUNT(*) FROM pedidos pd WHERE pd.produto_id = p.id) as total_pedidos,
                (SELECT COALESCE(SUM(quantidade_caixas), 0) FROM pedidos pd WHERE pd.produto_id = p.id) as total_caixas_vendidas,
                (SELECT COALESCE(SUM(total), 0) FROM pedidos pd WHERE pd.produto_id = p.id) as valor_total_vendas
            FROM produtos p
            ${whereClause}
            ORDER BY p.nome ASC
        `, params);

        res.json({ produtos: result.rows });
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro ao listar produtos' });
    }
});

/**
 * GET /api/produtos/:id
 * Detalhes de um produto
 */
router.get('/:id', idValidation, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(`
            SELECT p.*,
                (SELECT COUNT(*) FROM pedidos pd WHERE pd.produto_id = p.id) as total_pedidos,
                (SELECT COALESCE(SUM(quantidade_caixas), 0) FROM pedidos pd WHERE pd.produto_id = p.id) as total_caixas_vendidas,
                (SELECT COALESCE(SUM(peso_kg), 0) FROM pedidos pd WHERE pd.produto_id = p.id) as peso_total_vendido,
                (SELECT COALESCE(SUM(total), 0) FROM pedidos pd WHERE pd.produto_id = p.id) as valor_total_vendas
            FROM produtos p
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json({ produto: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

/**
 * POST /api/produtos
 * Criar novo produto (apenas admin/superadmin)
 */
router.post('/', adminOnly, produtoValidation, activityLogMiddleware('criar', 'produto'), async (req, res) => {
    try {
        const { nome, descricao, peso_caixa_kg, preco_padrao, imagem_url } = req.body;

        const result = await req.db.query(`
            INSERT INTO produtos (nome, descricao, peso_caixa_kg, preco_padrao, imagem_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [nome, descricao, peso_caixa_kg, preco_padrao, imagem_url]);

        res.status(201).json({
            message: 'Produto criado com sucesso',
            produto: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
});

/**
 * PUT /api/produtos/:id
 * Atualizar produto (apenas admin/superadmin)
 */
router.put('/:id', adminOnly, idValidation, produtoValidation, activityLogMiddleware('atualizar', 'produto'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, peso_caixa_kg, preco_padrao, ativo, imagem_url } = req.body;

        const result = await req.db.query(`
            UPDATE produtos
            SET nome = COALESCE($1, nome),
                descricao = COALESCE($2, descricao),
                peso_caixa_kg = COALESCE($3, peso_caixa_kg),
                preco_padrao = COALESCE($4, preco_padrao),
                ativo = COALESCE($5, ativo),
                imagem_url = COALESCE($6, imagem_url)
            WHERE id = $7
            RETURNING *
        `, [nome, descricao, peso_caixa_kg, preco_padrao, ativo, imagem_url, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json({
            message: 'Produto atualizado com sucesso',
            produto: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

/**
 * DELETE /api/produtos/:id
 * Soft delete do produto (apenas admin/superadmin)
 */
router.delete('/:id', adminOnly, idValidation, activityLogMiddleware('excluir', 'produto'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se produto tem pedidos
        const pedidosResult = await req.db.query(
            'SELECT COUNT(*) as total FROM pedidos WHERE produto_id = $1',
            [id]
        );

        if (parseInt(pedidosResult.rows[0].total) > 0) {
            // Soft delete se tiver pedidos
            const result = await req.db.query(`
                UPDATE produtos SET ativo = false WHERE id = $1 RETURNING *
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            return res.json({
                message: 'Produto desativado (possui pedidos vinculados)',
                produto: result.rows[0]
            });
        }

        // Hard delete se não tiver pedidos
        const result = await req.db.query(
            'DELETE FROM produtos WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json({
            message: 'Produto excluído com sucesso',
            produto: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
});

module.exports = router;
