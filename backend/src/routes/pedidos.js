// =====================================================
// Rotas de Pedidos
// v2.0.3 - Query do PDF usa colunas completas do cliente
// =====================================================

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { pedidoValidation, pedidoUpdateValidation, idValidation, pedidosQueryValidation } = require('../middleware/validation');
const { activityLogMiddleware } = require('../middleware/activityLog');
const { vendedorFilterMiddleware } = require('../middleware/vendedorFilter');
const { exportarPedidosPDF, exportarPedidosExcel, exportarPedidoIndividualPDF } = require('../services/pdfExportService');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * GET /api/pedidos
 * Lista pedidos com filtros e itens agrupados
 * Usuários normais veem apenas seus pedidos
 * Admin, superadmin e visualizador veem todos
 */
router.get('/', pedidosQueryValidation, vendedorFilterMiddleware, async (req, res) => {
    try {
        const {
            mes,
            ano,
            cliente_id,
            produto_id,
            vendedor_id,
            status,
            page = 1,
            limit = 50
        } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Filtro de vendedor usando middleware centralizado
        const vendedorFilter = req.addVendedorFilter('p.created_by', vendedor_id, paramIndex);
        if (vendedorFilter.clause) {
            whereConditions.push(vendedorFilter.clause);
            params.push(vendedorFilter.param);
            paramIndex = vendedorFilter.newIndex;
        }

        // Filtro por mês/ano (baseado na data de entrega)
        if (mes && ano) {
            whereConditions.push(`EXTRACT(MONTH FROM p.data_entrega) = $${paramIndex} AND EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex + 1}`);
            params.push(parseInt(mes), parseInt(ano));
            paramIndex += 2;
        } else if (ano) {
            whereConditions.push(`EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex}`);
            params.push(parseInt(ano));
            paramIndex++;
        }

        // Filtro por cliente
        if (cliente_id) {
            whereConditions.push(`p.cliente_id = $${paramIndex}`);
            params.push(parseInt(cliente_id));
            paramIndex++;
        }

        // Filtro por produto (busca em pedido_itens)
        if (produto_id) {
            whereConditions.push(`EXISTS (SELECT 1 FROM pedido_itens pi WHERE pi.pedido_id = p.id AND pi.produto_id = $${paramIndex})`);
            params.push(parseInt(produto_id));
            paramIndex++;
        }

        // Filtro por status
        if (status && status !== 'todos') {
            whereConditions.push(`p.entregue = $${paramIndex}`);
            params.push(status === 'entregue');
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Query principal - buscar pedidos
        const query = `
            SELECT
                p.*,
                c.nome as cliente_nome,
                u.nome as vendedor_nome,
                u.email as vendedor_email
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.created_by = u.id
            ${whereClause}
            ORDER BY p.data_pedido DESC, p.numero_pedido DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await req.db.query(query, params);

        // Buscar itens de todos os pedidos retornados
        const pedidoIds = result.rows.map(p => p.id);
        let pedidosComItens = result.rows;

        if (pedidoIds.length > 0) {
            const itensQuery = `
                SELECT
                    pi.*,
                    pr.nome as produto_nome,
                    pr.peso_caixa_kg,
                    pr.imagem_url
                FROM pedido_itens pi
                LEFT JOIN produtos pr ON pi.produto_id = pr.id
                WHERE pi.pedido_id = ANY($1)
                ORDER BY pi.id
            `;
            const itensResult = await req.db.query(itensQuery, [pedidoIds]);

            // Agrupar itens por pedido
            const itensPorPedido = {};
            itensResult.rows.forEach(item => {
                if (!itensPorPedido[item.pedido_id]) {
                    itensPorPedido[item.pedido_id] = [];
                }
                itensPorPedido[item.pedido_id].push(item);
            });

            // Adicionar itens aos pedidos
            pedidosComItens = result.rows.map(pedido => ({
                ...pedido,
                itens: itensPorPedido[pedido.id] || []
            }));
        }

        // Contar total para paginação
        const countQuery = `
            SELECT COUNT(*) as total
            FROM pedidos p
            ${whereClause}
        `;
        const countParams = params.slice(0, -2);
        const countResult = await req.db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        // Calcular totais do período filtrado - separados por status
        const totaisQuery = `
            SELECT
                COALESCE(SUM(p.total), 0) as valor_total,
                COALESCE(SUM(p.peso_kg), 0) as peso_total,
                COALESCE(SUM(p.quantidade_caixas), 0) as unidades_total,
                COUNT(*) as quantidade_pedidos,
                COUNT(CASE WHEN p.entregue THEN 1 END) as entregues,
                COUNT(CASE WHEN NOT p.entregue THEN 1 END) as pendentes,
                COALESCE(SUM(CASE WHEN NOT p.entregue THEN p.peso_kg ELSE 0 END), 0) as peso_pendente,
                COALESCE(SUM(CASE WHEN NOT p.entregue THEN p.quantidade_caixas ELSE 0 END), 0) as unidades_pendente,
                COALESCE(SUM(CASE WHEN NOT p.entregue THEN p.total ELSE 0 END), 0) as valor_pendente,
                COALESCE(SUM(CASE WHEN p.entregue THEN p.peso_kg ELSE 0 END), 0) as peso_entregue,
                COALESCE(SUM(CASE WHEN p.entregue THEN p.quantidade_caixas ELSE 0 END), 0) as unidades_entregue,
                COALESCE(SUM(CASE WHEN p.entregue THEN p.total ELSE 0 END), 0) as valor_entregue
            FROM pedidos p
            ${whereClause}
        `;
        const totaisResult = await req.db.query(totaisQuery, countParams);

        res.json({
            pedidos: pedidosComItens,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            },
            totais: totaisResult.rows[0]
        });
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
});

/**
 * GET /api/pedidos/:id
 * Detalhes de um pedido com itens
 */
router.get('/:id', idValidation, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(`
            SELECT
                p.*,
                c.nome as cliente_nome,
                c.cnpj_cpf as cliente_cnpj,
                c.telefone as cliente_telefone,
                pr.nome as produto_nome,
                pr.descricao as produto_descricao,
                pr.peso_caixa_kg,
                u.nome as criado_por_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN produtos pr ON p.produto_id = pr.id
            LEFT JOIN usuarios u ON p.created_by = u.id
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Buscar itens do pedido
        const itensResult = await req.db.query(`
            SELECT
                pi.*,
                pr.nome as produto_nome,
                pr.peso_caixa_kg
            FROM pedido_itens pi
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = $1
            ORDER BY pi.id
        `, [id]);

        const pedido = result.rows[0];
        pedido.itens = itensResult.rows;

        res.json({ pedido });
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
});

/**
 * POST /api/pedidos
 * Criar novo pedido com múltiplos itens
 * Usa transação para garantir integridade dos dados
 */
router.post('/', activityLogMiddleware('criar', 'pedido'), async (req, res) => {
    // Obter client do pool para transação
    const client = await req.db.connect();

    try {
        const {
            data_pedido,
            cliente_id,
            nf,
            data_entrega,
            observacoes,
            preco_descarga_pallet,
            horario_recebimento,
            itens // Array de { produto_id, quantidade_caixas, preco_unitario }
        } = req.body;

        // Validação básica
        if (!data_pedido || !cliente_id) {
            client.release();
            return res.status(400).json({ error: 'Data e cliente são obrigatórios' });
        }

        if (!itens || !Array.isArray(itens) || itens.length === 0) {
            client.release();
            return res.status(400).json({ error: 'Pelo menos um item é obrigatório' });
        }

        // Iniciar transação
        await client.query('BEGIN');

        // Gerar número do pedido (YYMMXX)
        const dataPedido = new Date(data_pedido);
        const ano = dataPedido.getFullYear().toString().slice(-2);
        const mes = (dataPedido.getMonth() + 1).toString().padStart(2, '0');

        // Buscar último número do mês
        const ultimoNumero = await client.query(`
            SELECT numero_pedido
            FROM pedidos
            WHERE numero_pedido LIKE $1
            ORDER BY numero_pedido DESC
            LIMIT 1
        `, [`${ano}${mes}%`]);

        let sequencial = 1;
        if (ultimoNumero.rows.length > 0) {
            const ultimoSeq = parseInt(ultimoNumero.rows[0].numero_pedido.slice(-2));
            sequencial = ultimoSeq + 1;
        }

        const numeroPedido = `${ano}${mes}${sequencial.toString().padStart(2, '0')}`;

        // Calcular totais dos itens
        let totalGeral = 0;
        let pesoGeral = 0;
        let quantidadeGeral = 0;

        const itensProcessados = [];
        for (const item of itens) {
            const produtoResult = await client.query(
                'SELECT peso_caixa_kg, preco_padrao FROM produtos WHERE id = $1',
                [item.produto_id]
            );

            if (produtoResult.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ error: `Produto ${item.produto_id} não encontrado` });
            }

            const pesoCaixa = parseFloat(produtoResult.rows[0].peso_caixa_kg);
            const pesoItem = pesoCaixa * parseInt(item.quantidade_caixas);
            const subtotal = pesoItem * parseFloat(item.preco_unitario);

            itensProcessados.push({
                produto_id: item.produto_id,
                quantidade_caixas: parseInt(item.quantidade_caixas),
                peso_kg: pesoItem,
                preco_unitario: parseFloat(item.preco_unitario),
                subtotal
            });

            totalGeral += subtotal;
            pesoGeral += pesoItem;
            quantidadeGeral += parseInt(item.quantidade_caixas);
        }

        // Inserir pedido
        const result = await client.query(`
            INSERT INTO pedidos (
                data_pedido, cliente_id, numero_pedido, nf, data_entrega,
                quantidade_caixas, peso_kg, preco_unitario,
                total, observacoes, preco_descarga_pallet, horario_recebimento, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            data_pedido, cliente_id, numeroPedido, nf, data_entrega,
            quantidadeGeral, pesoGeral, itensProcessados[0]?.preco_unitario || 0,
            totalGeral, observacoes, preco_descarga_pallet || null, horario_recebimento || null, req.userId
        ]);

        const pedidoId = result.rows[0].id;

        // Inserir itens do pedido
        for (const item of itensProcessados) {
            await client.query(`
                INSERT INTO pedido_itens (
                    pedido_id, produto_id, quantidade_caixas, peso_kg, preco_unitario, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [pedidoId, item.produto_id, item.quantidade_caixas, item.peso_kg, item.preco_unitario, item.subtotal]);
        }

        // Commit da transação
        await client.query('COMMIT');

        // Buscar dados completos (fora da transação)
        const pedidoCompleto = await req.db.query(`
            SELECT
                p.*,
                c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = $1
        `, [pedidoId]);

        // Buscar itens
        const itensResult = await req.db.query(`
            SELECT pi.*, pr.nome as produto_nome
            FROM pedido_itens pi
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = $1
        `, [pedidoId]);

        const pedido = pedidoCompleto.rows[0];
        pedido.itens = itensResult.rows;

        res.status(201).json({
            message: 'Pedido criado com sucesso',
            pedido
        });
    } catch (error) {
        // Rollback em caso de erro
        await client.query('ROLLBACK');
        console.error('Erro ao criar pedido:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Número de pedido já existe' });
        }
        res.status(500).json({ error: 'Erro ao criar pedido' });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/pedidos/:id
 * Atualizar pedido com suporte a múltiplos itens
 * Usa transação para garantir integridade dos dados
 */
router.put('/:id', idValidation, activityLogMiddleware('atualizar', 'pedido'), async (req, res) => {
    const { id } = req.params;
    const { data_pedido, cliente_id, nf, data_entrega, observacoes, preco_descarga_pallet, horario_recebimento, created_by, itens } = req.body;

    // Se tem itens, usar transação
    if (itens && Array.isArray(itens) && itens.length > 0) {
        const client = await req.db.connect();

        try {
            await client.query('BEGIN');

            // Verificar se pedido existe
            const pedidoAtual = await client.query(
                'SELECT * FROM pedidos WHERE id = $1',
                [id]
            );

            if (pedidoAtual.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            // Calcular totais dos itens
            let totalGeral = 0;
            let pesoGeral = 0;
            let quantidadeGeral = 0;
            let precoMedio = 0;

            const itensProcessados = [];
            for (const item of itens) {
                const produtoResult = await client.query(
                    'SELECT peso_caixa_kg FROM produtos WHERE id = $1',
                    [item.produto_id]
                );

                if (produtoResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(400).json({ error: `Produto ${item.produto_id} não encontrado` });
                }

                const pesoCaixa = parseFloat(produtoResult.rows[0].peso_caixa_kg);
                const pesoItem = pesoCaixa * parseInt(item.quantidade_caixas);
                const subtotal = pesoItem * parseFloat(item.preco_unitario);

                itensProcessados.push({
                    produto_id: item.produto_id,
                    quantidade_caixas: parseInt(item.quantidade_caixas),
                    peso_kg: pesoItem,
                    preco_unitario: parseFloat(item.preco_unitario),
                    subtotal
                });

                totalGeral += subtotal;
                pesoGeral += pesoItem;
                quantidadeGeral += parseInt(item.quantidade_caixas);
            }

            // Calcular preço médio ponderado
            precoMedio = pesoGeral > 0 ? totalGeral / pesoGeral : itensProcessados[0]?.preco_unitario || 0;

            // Atualizar pedido principal
            await client.query(`
                UPDATE pedidos SET
                    data_pedido = $1,
                    cliente_id = $2,
                    nf = $3,
                    data_entrega = $4,
                    observacoes = $5,
                    quantidade_caixas = $6,
                    peso_kg = $7,
                    preco_unitario = $8,
                    total = $9,
                    preco_descarga_pallet = $10,
                    horario_recebimento = $11,
                    created_by = COALESCE($12, created_by)
                WHERE id = $13
            `, [
                data_pedido,
                cliente_id,
                nf || null,
                data_entrega || null,
                observacoes || null,
                quantidadeGeral,
                pesoGeral,
                precoMedio,
                totalGeral,
                preco_descarga_pallet || null,
                horario_recebimento || null,
                created_by || null,
                id
            ]);

            // Deletar itens antigos
            await client.query('DELETE FROM pedido_itens WHERE pedido_id = $1', [id]);

            // Inserir novos itens
            for (const item of itensProcessados) {
                await client.query(`
                    INSERT INTO pedido_itens (
                        pedido_id, produto_id, quantidade_caixas, peso_kg, preco_unitario, subtotal
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [id, item.produto_id, item.quantidade_caixas, item.peso_kg, item.preco_unitario, item.subtotal]);
            }

            // Commit da transação
            await client.query('COMMIT');
            client.release();
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            console.error('Erro ao atualizar pedido:', error);
            return res.status(500).json({ error: 'Erro ao atualizar pedido' });
        }
    } else {
        // Atualização simples sem itens (não precisa de transação)
        try {
            // Verificar se pedido existe
            const pedidoAtual = await req.db.query(
                'SELECT * FROM pedidos WHERE id = $1',
                [id]
            );

            if (pedidoAtual.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            const campos = [];
            const valores = [];
            let paramIndex = 1;

            const camposPermitidos = [
                'data_pedido', 'cliente_id', 'nf', 'data_entrega',
                'entregue', 'data_entrega_real', 'observacoes', 'preco_descarga_pallet', 'horario_recebimento', 'created_by'
            ];

            const updates = { data_pedido, cliente_id, nf, data_entrega, observacoes, preco_descarga_pallet, horario_recebimento, created_by };
            for (const campo of camposPermitidos) {
                if (updates[campo] !== undefined) {
                    campos.push(`${campo} = $${paramIndex}`);
                    valores.push(updates[campo]);
                    paramIndex++;
                }
            }

            if (campos.length > 0) {
                valores.push(id);
                await req.db.query(`
                    UPDATE pedidos
                    SET ${campos.join(', ')}
                    WHERE id = $${paramIndex}
                `, valores);
            }
        } catch (error) {
            console.error('Erro ao atualizar pedido:', error);
            return res.status(500).json({ error: 'Erro ao atualizar pedido' });
        }
    }

    // Buscar dados completos
    try {
        const pedidoCompleto = await req.db.query(`
            SELECT
                p.*,
                c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = $1
        `, [id]);

        // Buscar itens
        const itensResult = await req.db.query(`
            SELECT pi.*, pr.nome as produto_nome
            FROM pedido_itens pi
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = $1
            ORDER BY pi.id
        `, [id]);

        const pedido = pedidoCompleto.rows[0];
        pedido.itens = itensResult.rows;

        res.json({
            message: 'Pedido atualizado com sucesso',
            pedido
        });
    } catch (error) {
        console.error('Erro ao buscar pedido atualizado:', error);
        res.status(500).json({ error: 'Pedido atualizado mas erro ao buscar dados' });
    }
});

/**
 * DELETE /api/pedidos/:id
 * Excluir pedido
 */
router.delete('/:id', idValidation, activityLogMiddleware('excluir', 'pedido'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(
            'DELETE FROM pedidos WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.json({
            message: 'Pedido excluído com sucesso',
            pedido: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        res.status(500).json({ error: 'Erro ao excluir pedido' });
    }
});

/**
 * PATCH /api/pedidos/:id/entregar
 * Marcar pedido como entregue
 */
router.patch('/:id/entregar', idValidation, activityLogMiddleware('entregar', 'pedido'), async (req, res) => {
    try {
        const { id } = req.params;
        const { data_entrega_real } = req.body;

        const dataEntrega = data_entrega_real || new Date().toISOString().split('T')[0];

        const result = await req.db.query(`
            UPDATE pedidos
            SET entregue = true, data_entrega_real = $1
            WHERE id = $2
            RETURNING *
        `, [dataEntrega, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.json({
            message: 'Pedido marcado como entregue',
            pedido: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao marcar pedido como entregue:', error);
        res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }
});

/**
 * PATCH /api/pedidos/:id/reverter-entrega
 * Reverter pedido para pendente (desfazer entrega)
 */
router.patch('/:id/reverter-entrega', idValidation, activityLogMiddleware('reverter_entrega', 'pedido'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(`
            UPDATE pedidos
            SET entregue = false, data_entrega_real = NULL
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.json({
            message: 'Entrega revertida com sucesso',
            pedido: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao reverter entrega:', error);
        res.status(500).json({ error: 'Erro ao reverter entrega' });
    }
});

/**
 * GET /api/pedidos/exportar/pdf
 * Exportar pedidos filtrados para PDF
 * Filtros: mes, ano, cliente_id, produto_id, status, vendedor_id
 */
router.get('/exportar/pdf', pedidosQueryValidation, vendedorFilterMiddleware, async (req, res) => {
    try {
        let { mes, ano, cliente_id, produto_id, status, vendedor_id } = req.query;

        // Usar middleware para filtro de vendedor
        const filteredVendedorId = req.getVendedorId(vendedor_id);

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (mes && ano) {
            whereConditions.push(`EXTRACT(MONTH FROM p.data_entrega) = $${paramIndex} AND EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex + 1}`);
            params.push(parseInt(mes), parseInt(ano));
            paramIndex += 2;
        } else if (ano) {
            whereConditions.push(`EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex}`);
            params.push(parseInt(ano));
            paramIndex++;
        }

        if (cliente_id) {
            whereConditions.push(`p.cliente_id = $${paramIndex}`);
            params.push(parseInt(cliente_id));
            paramIndex++;
        }

        if (produto_id) {
            whereConditions.push(`EXISTS (SELECT 1 FROM pedido_itens pi WHERE pi.pedido_id = p.id AND pi.produto_id = $${paramIndex})`);
            params.push(parseInt(produto_id));
            paramIndex++;
        }

        if (status && status !== 'todos') {
            whereConditions.push(`p.entregue = $${paramIndex}`);
            params.push(status === 'entregue');
            paramIndex++;
        }

        if (filteredVendedorId) {
            whereConditions.push(`p.created_by = $${paramIndex}`);
            params.push(filteredVendedorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Buscar nome do vendedor se filtrado
        let nomeVendedor = null;
        if (filteredVendedorId) {
            const vendedorResult = await req.db.query('SELECT nome FROM usuarios WHERE id = $1', [filteredVendedorId]);
            nomeVendedor = vendedorResult.rows[0]?.nome;
        }

        // Query com dados do vendedor
        const result = await req.db.query(`
            SELECT p.*, c.nome as cliente_nome, u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.created_by = u.id
            ${whereClause}
            ORDER BY p.data_entrega ASC, p.numero_pedido ASC
        `, params);

        // Buscar totais por status
        const totaisQuery = `
            SELECT
                COALESCE(SUM(CASE WHEN NOT p.entregue THEN p.peso_kg ELSE 0 END), 0) as peso_pendente,
                COALESCE(SUM(CASE WHEN NOT p.entregue THEN p.quantidade_caixas ELSE 0 END), 0) as unidades_pendente,
                COALESCE(SUM(CASE WHEN NOT p.entregue THEN p.total ELSE 0 END), 0) as valor_pendente,
                COUNT(CASE WHEN NOT p.entregue THEN 1 END) as pedidos_pendentes,
                COALESCE(SUM(CASE WHEN p.entregue THEN p.peso_kg ELSE 0 END), 0) as peso_entregue,
                COALESCE(SUM(CASE WHEN p.entregue THEN p.quantidade_caixas ELSE 0 END), 0) as unidades_entregue,
                COALESCE(SUM(CASE WHEN p.entregue THEN p.total ELSE 0 END), 0) as valor_entregue,
                COUNT(CASE WHEN p.entregue THEN 1 END) as pedidos_entregues
            FROM pedidos p
            ${whereClause}
        `;
        const totaisResult = await req.db.query(totaisQuery, params);
        const totais = totaisResult.rows[0];

        // Buscar itens dos pedidos
        const pedidoIds = result.rows.map(p => p.id);
        let itensPorPedido = {};

        if (pedidoIds.length > 0) {
            const itensResult = await req.db.query(`
                SELECT pi.pedido_id, pi.quantidade_caixas, pi.peso_kg, pi.preco_unitario, pi.subtotal, pr.nome as produto_nome
                FROM pedido_itens pi
                LEFT JOIN produtos pr ON pi.produto_id = pr.id
                WHERE pi.pedido_id = ANY($1)
                ORDER BY pi.id
            `, [pedidoIds]);

            itensResult.rows.forEach(item => {
                if (!itensPorPedido[item.pedido_id]) {
                    itensPorPedido[item.pedido_id] = [];
                }
                itensPorPedido[item.pedido_id].push(item);
            });
        }

        // Delegar geração do PDF ao serviço
        await exportarPedidosPDF(res, {
            pedidos: result.rows,
            totais,
            itensPorPedido,
            mes,
            ano,
            nomeVendedor
        });
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
});

/**
 * GET /api/pedidos/exportar/excel
 * Exportar pedidos para Excel
 * Filtros: mes, ano, cliente_id, produto_id, status, vendedor_id
 */
router.get('/exportar/excel', pedidosQueryValidation, vendedorFilterMiddleware, async (req, res) => {
    try {
        let { mes, ano, cliente_id, produto_id, status, vendedor_id } = req.query;

        // Usar middleware para filtro de vendedor
        const filteredVendedorId = req.getVendedorId(vendedor_id);

        // Query base
        let query = `
            SELECT
                p.id, p.numero_pedido, p.data_pedido, p.data_entrega, p.nf, p.entregue,
                c.nome as cliente_nome, c.cidade as cliente_cidade, c.estado as cliente_estado,
                u.nome as vendedor_nome,
                pi.quantidade_caixas, pi.preco_unitario,
                pr.nome as produto_nome, pr.peso_caixa_kg
            FROM pedidos p
            JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.created_by = u.id
            LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (mes && ano) {
            query += ` AND EXTRACT(MONTH FROM p.data_entrega) = $${paramIndex++} AND EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex++}`;
            params.push(parseInt(mes), parseInt(ano));
        } else if (ano) {
            query += ` AND EXTRACT(YEAR FROM p.data_entrega) = $${paramIndex++}`;
            params.push(parseInt(ano));
        }

        if (cliente_id) {
            query += ` AND p.cliente_id = $${paramIndex++}`;
            params.push(parseInt(cliente_id));
        }

        if (produto_id) {
            query += ` AND pi.produto_id = $${paramIndex++}`;
            params.push(parseInt(produto_id));
        }

        if (status === 'pendente') {
            query += ` AND p.entregue = false`;
        } else if (status === 'entregue') {
            query += ` AND p.entregue = true`;
        }

        if (filteredVendedorId) {
            query += ` AND p.created_by = $${paramIndex++}`;
            params.push(filteredVendedorId);
        }

        query += ` ORDER BY p.data_entrega DESC, p.numero_pedido DESC`;

        const result = await req.db.query(query, params);

        // Delegar geração do Excel ao serviço
        await exportarPedidosExcel(res, { pedidos: result.rows, mes, ano });
    } catch (error) {
        console.error('Erro ao exportar Excel:', error);
        res.status(500).json({ error: 'Erro ao gerar Excel' });
    }
});

/**
 * GET /api/pedidos/:id/pdf
 * Exportar pedido individual para PDF (estilo Pedido de Vendas)
 */
router.get('/:id/pdf', idValidation, async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar pedido completo com todas as colunas do cliente
        const pedidoResult = await req.db.query(`
            SELECT p.*,
                c.nome as cliente_nome,
                COALESCE(c.razao_social, c.nome) as cliente_razao_social,
                c.cnpj_cpf as cliente_cnpj,
                c.telefone as cliente_telefone,
                c.email as cliente_email,
                c.endereco as cliente_endereco,
                COALESCE(c.endereco_entrega, c.endereco) as cliente_endereco_entrega,
                c.cidade as cliente_cidade,
                c.estado as cliente_estado,
                c.cep as cliente_cep,
                c.contato_nome as cliente_contato,
                c.observacoes as cliente_observacoes,
                u.nome as vendedor_nome,
                u.telefone as vendedor_telefone,
                u.email as vendedor_email
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.created_by = u.id
            WHERE p.id = $1
        `, [id]);

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const pedido = pedidoResult.rows[0];

        // Buscar itens do pedido
        const itensResult = await req.db.query(`
            SELECT pi.*, pr.nome as produto_nome, pr.peso_caixa_kg
            FROM pedido_itens pi
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = $1
            ORDER BY pi.id
        `, [id]);

        // Delegar geração do PDF ao serviço
        await exportarPedidoIndividualPDF(res, { pedido, itens: itensResult.rows });
    } catch (error) {
        console.error('Erro ao exportar PDF do pedido:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
});

module.exports = router;
