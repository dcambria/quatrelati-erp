// =====================================================
// Rotas de Clientes
// v1.4.0 - Aplicar Activity Log em todas as rotas
// =====================================================

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { clienteValidation, idValidation } = require('../middleware/validation');
const { activityLogMiddleware } = require('../middleware/activityLog');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * GET /api/clientes
 * Lista todos os clientes
 * Vendedores veem apenas seus clientes (exceto se pode_visualizar_todos)
 * Suporta filtro global por vendedor para admins
 */
router.get('/', async (req, res) => {
    try {
        const { ativo, search, vendedor_id, page = 1, limit = 100 } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Verificar nível do usuário para filtrar por criador
        const userResult = await req.db.query(
            'SELECT nivel, pode_visualizar_todos FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const podeVisualizarTodos = userResult.rows[0]?.pode_visualizar_todos;
        const canViewAll = ['superadmin', 'admin'].includes(userNivel) || podeVisualizarTodos;

        // Vendedores sem permissão só veem seus próprios clientes
        if (!canViewAll) {
            whereConditions.push(`c.vendedor_id = $${paramIndex}`);
            params.push(req.userId);
            paramIndex++;
        } else if (vendedor_id) {
            // Filtro global por vendedor (para admins)
            whereConditions.push(`c.vendedor_id = $${paramIndex}`);
            params.push(parseInt(vendedor_id));
            paramIndex++;
        }

        // Filtro por status ativo
        if (ativo !== undefined) {
            whereConditions.push(`c.ativo = $${paramIndex}`);
            params.push(ativo === 'true');
            paramIndex++;
        }

        // Busca por nome
        if (search) {
            whereConditions.push(`(c.nome ILIKE $${paramIndex} OR c.cidade ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Query principal com dados do vendedor
        const query = `
            SELECT c.*,
                u.nome as criado_por_nome,
                v.nome as vendedor_nome,
                v.email as vendedor_email,
                (SELECT COUNT(*) FROM pedidos p WHERE p.cliente_id = c.id) as total_pedidos,
                (SELECT COALESCE(SUM(total), 0) FROM pedidos p WHERE p.cliente_id = c.id) as valor_total_pedidos
            FROM clientes c
            LEFT JOIN usuarios u ON c.created_by = u.id
            LEFT JOIN usuarios v ON c.vendedor_id = v.id
            ${whereClause}
            ORDER BY c.nome ASC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await req.db.query(query, params);

        // Contar total
        const countParams = params.slice(0, -2);
        const countResult = await req.db.query(
            `SELECT COUNT(*) as total FROM clientes c ${whereClause}`,
            countParams
        );
        const total = parseInt(countResult.rows[0].total);

        res.json({
            clientes: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
});

/**
 * GET /api/clientes/:id
 * Detalhes de um cliente
 */
router.get('/:id', idValidation, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(`
            SELECT c.*,
                v.nome as vendedor_nome,
                v.email as vendedor_email,
                v.telefone as vendedor_telefone,
                (SELECT COUNT(*) FROM pedidos p WHERE p.cliente_id = c.id) as total_pedidos,
                (SELECT COALESCE(SUM(total), 0) FROM pedidos p WHERE p.cliente_id = c.id) as valor_total_pedidos,
                (SELECT COALESCE(SUM(peso_kg), 0) FROM pedidos p WHERE p.cliente_id = c.id) as peso_total_pedidos
            FROM clientes c
            LEFT JOIN usuarios v ON c.vendedor_id = v.id
            WHERE c.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json({ cliente: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
});

/**
 * GET /api/clientes/:id/pedidos
 * Histórico de pedidos do cliente
 */
router.get('/:id/pedidos', idValidation, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Verificar se cliente existe
        const clienteResult = await req.db.query(
            'SELECT id, nome FROM clientes WHERE id = $1',
            [id]
        );

        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await req.db.query(`
            SELECT
                p.*,
                pr.nome as produto_nome
            FROM pedidos p
            LEFT JOIN produtos pr ON p.produto_id = pr.id
            WHERE p.cliente_id = $1
            ORDER BY p.data_pedido DESC, p.numero_pedido DESC
            LIMIT $2 OFFSET $3
        `, [id, parseInt(limit), offset]);

        const countResult = await req.db.query(
            'SELECT COUNT(*) as total FROM pedidos WHERE cliente_id = $1',
            [id]
        );
        const total = parseInt(countResult.rows[0].total);

        res.json({
            cliente: clienteResult.rows[0],
            pedidos: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Erro ao buscar pedidos do cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});

/**
 * POST /api/clientes
 * Criar novo cliente
 */
router.post('/', clienteValidation, activityLogMiddleware('criar', 'cliente'), async (req, res) => {
    try {
        const {
            nome, razao_social, cnpj_cpf, telefone, email, endereco, observacoes, logo_url,
            endereco_entrega, cidade, estado, cep, contato_nome, vendedor_id
        } = req.body;

        // Vendedor associado é o usuário atual (se for vendedor) ou o informado (se for admin)
        const userResult = await req.db.query(
            'SELECT nivel FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const isAdmin = ['superadmin', 'admin'].includes(userNivel);

        // Vendedor: usa o próprio usuário; Admin: pode escolher ou deixar nulo
        const vendedorFinal = isAdmin
            ? (vendedor_id || req.userId)
            : req.userId;

        const result = await req.db.query(`
            INSERT INTO clientes (
                nome, razao_social, cnpj_cpf, telefone, email, endereco, observacoes, logo_url,
                endereco_entrega, cidade, estado, cep, contato_nome,
                vendedor_id, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            nome, razao_social, cnpj_cpf, telefone, email, endereco, observacoes, logo_url,
            endereco_entrega, cidade, estado, cep, contato_nome,
            vendedorFinal, req.userId
        ]);

        res.status(201).json({
            message: 'Cliente criado com sucesso',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'CNPJ/CPF já cadastrado' });
        }
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

/**
 * PUT /api/clientes/:id
 * Atualizar cliente
 * Somente o vendedor associado ou admin/superadmin pode editar
 */
router.put('/:id', idValidation, clienteValidation, activityLogMiddleware('atualizar', 'cliente'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome, razao_social, cnpj_cpf, telefone, email, endereco, observacoes, ativo, logo_url,
            endereco_entrega, cidade, estado, cep, contato_nome, vendedor_id
        } = req.body;

        // Verificar permissão de edição
        const userResult = await req.db.query(
            'SELECT nivel FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const isAdmin = ['superadmin', 'admin'].includes(userNivel);

        // Buscar cliente atual
        const clienteAtual = await req.db.query(
            'SELECT vendedor_id FROM clientes WHERE id = $1',
            [id]
        );

        if (clienteAtual.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Verificar se o usuário pode editar
        const vendedorDoCliente = clienteAtual.rows[0].vendedor_id;
        if (!isAdmin && vendedorDoCliente !== req.userId) {
            return res.status(403).json({ error: 'Você não tem permissão para editar este cliente' });
        }

        // Vendedor não pode mudar o vendedor_id, apenas admin
        const vendedorFinal = isAdmin && vendedor_id !== undefined
            ? vendedor_id
            : vendedorDoCliente;

        const result = await req.db.query(`
            UPDATE clientes
            SET nome = COALESCE($1, nome),
                razao_social = $2,
                cnpj_cpf = COALESCE($3, cnpj_cpf),
                telefone = COALESCE($4, telefone),
                email = COALESCE($5, email),
                endereco = COALESCE($6, endereco),
                observacoes = COALESCE($7, observacoes),
                ativo = COALESCE($8, ativo),
                logo_url = $9,
                endereco_entrega = COALESCE($10, endereco_entrega),
                cidade = COALESCE($11, cidade),
                estado = COALESCE($12, estado),
                cep = COALESCE($13, cep),
                contato_nome = COALESCE($14, contato_nome),
                vendedor_id = $15
            WHERE id = $16
            RETURNING *
        `, [
            nome, razao_social, cnpj_cpf, telefone, email, endereco, observacoes, ativo, logo_url,
            endereco_entrega, cidade, estado, cep, contato_nome,
            vendedorFinal, id
        ]);

        res.json({
            message: 'Cliente atualizado com sucesso',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

/**
 * DELETE /api/clientes/:id
 * Soft delete do cliente
 * Somente o vendedor associado ou admin/superadmin pode excluir
 */
router.delete('/:id', idValidation, activityLogMiddleware('excluir', 'cliente'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar permissão
        const userResult = await req.db.query(
            'SELECT nivel FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const isAdmin = ['superadmin', 'admin'].includes(userNivel);

        // Buscar cliente
        const clienteAtual = await req.db.query(
            'SELECT vendedor_id FROM clientes WHERE id = $1',
            [id]
        );

        if (clienteAtual.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Verificar permissão
        if (!isAdmin && clienteAtual.rows[0].vendedor_id !== req.userId) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este cliente' });
        }

        // Verificar se cliente tem pedidos
        const pedidosResult = await req.db.query(
            'SELECT COUNT(*) as total FROM pedidos WHERE cliente_id = $1',
            [id]
        );

        if (parseInt(pedidosResult.rows[0].total) > 0) {
            // Soft delete se tiver pedidos
            const result = await req.db.query(`
                UPDATE clientes SET ativo = false WHERE id = $1 RETURNING *
            `, [id]);

            return res.json({
                message: 'Cliente desativado (possui pedidos vinculados)',
                cliente: result.rows[0]
            });
        }

        // Hard delete se não tiver pedidos
        const result = await req.db.query(
            'DELETE FROM clientes WHERE id = $1 RETURNING *',
            [id]
        );

        res.json({
            message: 'Cliente excluído com sucesso',
            cliente: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});

module.exports = router;
