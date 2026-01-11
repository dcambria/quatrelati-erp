// =====================================================
// Rotas de Pedidos
// v1.5.0 - PDF lista: vendedor no header, totais gerais,
//          blocos de resumo melhorados, footer aprimorado
// =====================================================

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const { authMiddleware } = require('../middleware/auth');
const { pedidoValidation, pedidoUpdateValidation, idValidation, pedidosQueryValidation } = require('../middleware/validation');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * GET /api/pedidos
 * Lista pedidos com filtros e itens agrupados
 * Usuários normais veem apenas seus pedidos
 * Admin, superadmin e visualizador veem todos
 */
router.get('/', pedidosQueryValidation, async (req, res) => {
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

        // Verificar nível do usuário para filtrar por criador
        const userResult = await req.db.query(
            'SELECT nivel, pode_visualizar_todos FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const podeVisualizarTodos = userResult.rows[0]?.pode_visualizar_todos;
        const canViewAll = ['superadmin', 'admin'].includes(userNivel) || podeVisualizarTodos;

        // Vendedores sem permissão só veem seus próprios pedidos
        if (!canViewAll) {
            whereConditions.push(`p.created_by = $${paramIndex}`);
            params.push(req.userId);
            paramIndex++;
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

        // Filtro por vendedor (apenas para quem pode ver todos)
        if (vendedor_id && canViewAll) {
            whereConditions.push(`p.created_by = $${paramIndex}`);
            params.push(parseInt(vendedor_id));
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
 */
router.post('/', async (req, res) => {
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
            return res.status(400).json({ error: 'Data e cliente são obrigatórios' });
        }

        if (!itens || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ error: 'Pelo menos um item é obrigatório' });
        }

        // Gerar número do pedido (YYMMXX)
        const dataPedido = new Date(data_pedido);
        const ano = dataPedido.getFullYear().toString().slice(-2);
        const mes = (dataPedido.getMonth() + 1).toString().padStart(2, '0');

        // Buscar último número do mês
        const ultimoNumero = await req.db.query(`
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
            const produtoResult = await req.db.query(
                'SELECT peso_caixa_kg, preco_padrao FROM produtos WHERE id = $1',
                [item.produto_id]
            );

            if (produtoResult.rows.length === 0) {
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
        const result = await req.db.query(`
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
            await req.db.query(`
                INSERT INTO pedido_itens (
                    pedido_id, produto_id, quantidade_caixas, peso_kg, preco_unitario, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [pedidoId, item.produto_id, item.quantidade_caixas, item.peso_kg, item.preco_unitario, item.subtotal]);
        }

        // Buscar dados completos
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
        console.error('Erro ao criar pedido:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Número de pedido já existe' });
        }
        res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});

/**
 * PUT /api/pedidos/:id
 * Atualizar pedido com suporte a múltiplos itens
 */
router.put('/:id', idValidation, async (req, res) => {
    try {
        const { id } = req.params;
        const { data_pedido, cliente_id, nf, data_entrega, observacoes, preco_descarga_pallet, horario_recebimento, created_by, itens } = req.body;

        // Verificar se pedido existe
        const pedidoAtual = await req.db.query(
            'SELECT * FROM pedidos WHERE id = $1',
            [id]
        );

        if (pedidoAtual.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Se tem itens, processar múltiplos produtos
        if (itens && Array.isArray(itens) && itens.length > 0) {
            // Calcular totais dos itens
            let totalGeral = 0;
            let pesoGeral = 0;
            let quantidadeGeral = 0;
            let precoMedio = 0;

            const itensProcessados = [];
            for (const item of itens) {
                const produtoResult = await req.db.query(
                    'SELECT peso_caixa_kg FROM produtos WHERE id = $1',
                    [item.produto_id]
                );

                if (produtoResult.rows.length === 0) {
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
            await req.db.query(`
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
            await req.db.query('DELETE FROM pedido_itens WHERE pedido_id = $1', [id]);

            // Inserir novos itens
            for (const item of itensProcessados) {
                await req.db.query(`
                    INSERT INTO pedido_itens (
                        pedido_id, produto_id, quantidade_caixas, peso_kg, preco_unitario, subtotal
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [id, item.produto_id, item.quantidade_caixas, item.peso_kg, item.preco_unitario, item.subtotal]);
            }
        } else {
            // Atualização simples sem itens
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
        }

        // Buscar dados completos
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
        console.error('Erro ao atualizar pedido:', error);
        res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }
});

/**
 * DELETE /api/pedidos/:id
 * Excluir pedido
 */
router.delete('/:id', idValidation, async (req, res) => {
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
router.patch('/:id/entregar', idValidation, async (req, res) => {
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
router.patch('/:id/reverter-entrega', idValidation, async (req, res) => {
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
router.get('/exportar/pdf', pedidosQueryValidation, async (req, res) => {
    try {
        let { mes, ano, cliente_id, produto_id, status, vendedor_id } = req.query;
        const https = require('https');
        const http = require('http');

        // Verificar nível do usuário
        const userResult = await req.db.query(
            'SELECT nivel, pode_visualizar_todos FROM usuarios WHERE id = $1',
            [req.userId]
        );
        const userNivel = userResult.rows[0]?.nivel;
        const podeVisualizarTodos = userResult.rows[0]?.pode_visualizar_todos;
        const canViewAll = ['superadmin', 'admin'].includes(userNivel) || podeVisualizarTodos;

        // Vendedores sem permissão só podem exportar seus próprios pedidos
        if (!canViewAll) {
            vendedor_id = req.userId;
        }

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

        // Filtro por vendedor (obrigatório para vendedores, opcional para admins)
        if (vendedor_id) {
            whereConditions.push(`p.created_by = $${paramIndex}`);
            params.push(parseInt(vendedor_id));
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Buscar nome do vendedor se filtrado
        let nomeVendedor = null;
        if (vendedor_id) {
            const vendedorResult = await req.db.query('SELECT nome FROM usuarios WHERE id = $1', [vendedor_id]);
            nomeVendedor = vendedorResult.rows[0]?.nome;
        }

        // Query com dados do vendedor
        const result = await req.db.query(`
            SELECT
                p.*,
                c.nome as cliente_nome,
                u.nome as vendedor_nome
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

        // Baixar logo da empresa do S3
        const logoUrl = 'https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-pdf.png';

        const fetchImage = (url) => {
            return new Promise((resolve, reject) => {
                const protocol = url.startsWith('https') ? https : http;
                protocol.get(url, (response) => {
                    const chunks = [];
                    response.on('data', (chunk) => chunks.push(chunk));
                    response.on('end', () => resolve(Buffer.concat(chunks)));
                    response.on('error', reject);
                }).on('error', reject);
            });
        };

        let logoBuffer = null;
        try {
            logoBuffer = await fetchImage(logoUrl);
        } catch (e) {
            console.log('Não foi possível carregar logo:', e.message);
        }

        // Criar PDF com bufferPages para paginação
        const doc = new PDFDocument({
            margin: 40,
            size: 'A4',
            layout: 'landscape',
            bufferPages: true,
            autoFirstPage: true
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=pedidos-quatrelati-${ano || 'todos'}-${mes || 'todos'}.pdf`);

        doc.pipe(res);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 40;
        const footerY = pageHeight - 35;
        const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm');

        // ===== CABEÇALHO =====
        if (logoBuffer) {
            try {
                doc.image(logoBuffer, margin, 18, { height: 38 });
            } catch (e) {
                doc.fillColor('#124EA6').fontSize(16).font('Helvetica-Bold');
                doc.text('QUATRELATI', margin, 28, { lineBreak: false });
            }
        } else {
            doc.fillColor('#124EA6').fontSize(16).font('Helvetica-Bold');
            doc.text('QUATRELATI', margin, 28, { lineBreak: false });
        }

        // Título e período à direita
        doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold');
        doc.text('Relatório de Pedidos', pageWidth - 250, 18, { width: 210, align: 'right', lineBreak: false });

        let periodoTexto = 'Todos os pedidos';
        if (mes && ano) {
            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            periodoTexto = `${meses[parseInt(mes) - 1]} de ${ano}`;
        } else if (ano) {
            periodoTexto = `Ano ${ano}`;
        }
        doc.fillColor('#6B7280').fontSize(10).font('Helvetica');
        doc.text(periodoTexto, pageWidth - 250, 36, { width: 210, align: 'right', lineBreak: false });

        // Indicar se é lista geral ou de vendedor
        const tipoLista = nomeVendedor ? `Vendedor: ${nomeVendedor}` : 'Lista Geral';
        doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold');
        doc.text(tipoLista, pageWidth - 250, 50, { width: 210, align: 'right', lineBreak: false });

        // Linha separadora
        doc.moveTo(margin, 68).lineTo(pageWidth - margin, 68).strokeColor('#D1D5DB').lineWidth(0.5).stroke();

        // ===== BLOCOS DE RESUMO (melhorado) =====
        let currentY = 78;
        const blockWidth = (pageWidth - margin * 2 - 20) / 2;

        // Bloco A ENTREGAR
        doc.rect(margin, currentY, blockWidth, 32).fillAndStroke('#FFFBEB', '#F59E0B');
        doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(9);
        doc.text('A ENTREGAR', margin + 10, currentY + 6, { lineBreak: false });
        doc.fillColor('#78350F').font('Helvetica').fontSize(8);
        doc.text(`${totais.pedidos_pendentes} pedidos  |  ${parseFloat(totais.peso_pendente).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg  |  ${parseInt(totais.unidades_pendente).toLocaleString('pt-BR')} cx`, margin + 10, currentY + 18, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(parseFloat(totais.valor_pendente).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), margin + blockWidth - 100, currentY + 12, { width: 90, align: 'right', lineBreak: false });

        // Bloco ENTREGUE
        const entregueX = margin + blockWidth + 20;
        doc.rect(entregueX, currentY, blockWidth, 32).fillAndStroke('#F0FDF4', '#22C55E');
        doc.fillColor('#166534').font('Helvetica-Bold').fontSize(9);
        doc.text('ENTREGUE', entregueX + 10, currentY + 6, { lineBreak: false });
        doc.fillColor('#14532D').font('Helvetica').fontSize(8);
        doc.text(`${totais.pedidos_entregues} pedidos  |  ${parseFloat(totais.peso_entregue).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg  |  ${parseInt(totais.unidades_entregue).toLocaleString('pt-BR')} cx`, entregueX + 10, currentY + 18, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(parseFloat(totais.valor_entregue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), entregueX + blockWidth - 100, currentY + 12, { width: 90, align: 'right', lineBreak: false });

        currentY += 45;

        // ===== TABELA - mesma ordem da página de pedidos =====
        // Colunas: Pedido | Data | Cliente | N.F. | Peso | Cx | R$ Unit. | Total | Entrega | Status
        const headers = ['Pedido', 'Data', 'Cliente', 'N.F.', 'Peso', 'Cx', 'R$ Unit.', 'Total', 'Entrega', 'Status'];
        const colWidths = [55, 55, 185, 50, 60, 35, 55, 80, 55, 55];
        const colAligns = ['left', 'center', 'left', 'center', 'right', 'right', 'right', 'right', 'center', 'center'];
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const startX = (pageWidth - tableWidth) / 2;
        const rowHeight = 20;

        // Função para desenhar cabeçalho da tabela (clean - sem fundo grande)
        const drawTableHeader = (y) => {
            // Apenas linha inferior para o header
            doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8);
            let xPos = startX;
            headers.forEach((header, i) => {
                doc.text(header, xPos + 4, y + 4, { width: colWidths[i] - 8, align: colAligns[i], lineBreak: false });
                xPos += colWidths[i];
            });
            // Linha abaixo do header
            doc.moveTo(startX, y + 18).lineTo(startX + tableWidth, y + 18).strokeColor('#374151').lineWidth(1).stroke();
            return y + 22;
        };

        currentY = drawTableHeader(currentY);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        result.rows.forEach((pedido) => {
            // Verificar se precisa nova página
            if (currentY + rowHeight > pageHeight - 50) {
                doc.addPage();
                currentY = drawTableHeader(40);
            }

            // Verificar se está atrasado (data entrega < hoje E não entregue)
            const dataEntregaObj = pedido.data_entrega ? new Date(pedido.data_entrega) : null;
            const estaAtrasado = dataEntregaObj && !pedido.entregue && dataEntregaObj < hoje;

            // Fundo amarelo para ENTREGUES (destaque economizando tinta)
            if (pedido.entregue) {
                doc.rect(startX, currentY, tableWidth, rowHeight).fill('#FEF9C3');
                // Bordas consistentes para linhas com fundo
                doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
            }

            // Linha inferior sutil
            doc.moveTo(startX, currentY + rowHeight).lineTo(startX + tableWidth, currentY + rowHeight).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

            const dataPedido = pedido.data_pedido
                ? format(new Date(pedido.data_pedido), 'dd/MM/yy')
                : '-';
            const dataEntrega = pedido.data_entrega
                ? format(new Date(pedido.data_entrega), 'dd/MM/yy')
                : '-';

            // Dados das colunas na ordem: Pedido, Data, Cliente, N.F., Peso, Cx, R$ Unit., Total, Entrega, Status
            const valores = [
                `#${pedido.numero_pedido || ''}`,
                dataPedido,
                (pedido.cliente_nome || '').substring(0, 32),
                pedido.nf || '-',
                parseFloat(pedido.peso_kg || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg',
                String(pedido.quantidade_caixas || 0),
                parseFloat(pedido.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                parseFloat(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                dataEntrega,
                pedido.entregue ? 'Entregue' : 'Pendente'
            ];

            // Desenhar linha
            let xPos = startX;
            valores.forEach((valor, i) => {
                // Cores
                if (i === 8 && estaAtrasado) {
                    // Data de entrega em VERMELHO se atrasado
                    doc.fillColor('#DC2626');
                } else if (i === 9) {
                    // Status: verde para entregue, âmbar para pendente
                    doc.fillColor(pedido.entregue ? '#166534' : '#92400E');
                } else if (i === 0) {
                    // Número do pedido em azul
                    doc.fillColor('#1D4ED8');
                } else if (i === 7) {
                    // Total em destaque
                    doc.fillColor('#1F2937');
                } else {
                    doc.fillColor('#4B5563');
                }

                // Fonte: negrito para pedido, cliente, total, status e data atrasada
                if (i === 0 || i === 2 || i === 7 || i === 9 || (i === 8 && estaAtrasado)) {
                    doc.font('Helvetica-Bold').fontSize(8);
                } else {
                    doc.font('Helvetica').fontSize(8);
                }

                doc.text(String(valor), xPos + 4, currentY + 6, { width: colWidths[i] - 8, align: colAligns[i], lineBreak: false });
                xPos += colWidths[i];
            });

            currentY += rowHeight;
        });

        // ===== TOTAIS GERAIS =====
        const totalGeral = parseFloat(totais.valor_pendente) + parseFloat(totais.valor_entregue);
        const pesoGeral = parseFloat(totais.peso_pendente) + parseFloat(totais.peso_entregue);
        const caixasGeral = parseInt(totais.unidades_pendente) + parseInt(totais.unidades_entregue);
        const pedidosGeral = parseInt(totais.pedidos_pendentes) + parseInt(totais.pedidos_entregues);

        // Verificar se precisa nova página para totais
        if (currentY + 30 > pageHeight - 60) {
            doc.addPage();
            currentY = 40;
        }

        // Linha separadora antes dos totais
        doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).strokeColor('#374151').lineWidth(1).stroke();

        // Barra de totais
        currentY += 4;
        doc.rect(startX, currentY, tableWidth, 24).fill('#1F2937');

        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        doc.text('TOTAIS GERAIS:', startX + 10, currentY + 7, { lineBreak: false });

        doc.font('Helvetica').fontSize(8);
        doc.text(`${pedidosGeral} pedidos`, startX + 110, currentY + 8, { lineBreak: false });
        doc.text(`${pesoGeral.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`, startX + 200, currentY + 8, { lineBreak: false });
        doc.text(`${caixasGeral.toLocaleString('pt-BR')} cx`, startX + 290, currentY + 8, { lineBreak: false });

        doc.font('Helvetica-Bold').fontSize(11);
        doc.text(totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), startX + tableWidth - 130, currentY + 6, { width: 120, align: 'right', lineBreak: false });

        currentY += 28;

        // ===== FUNÇÃO PARA DESENHAR LOGO BUREAU =====
        const drawBureauLogo = (x, y, scale = 0.12) => {
            doc.save();
            doc.translate(x, y);
            doc.scale(scale);

            // Seta (cinza)
            doc.fillColor('#6B7280');
            doc.path('M 16.59 44.68 L 16.59 87.58 L 28.69 71.86 L 45.68 71.86 Z').fill();

            // Letra t (dourado)
            doc.fillColor('#D4A017');
            doc.path('M 67.86 72.32 Q 62.86 72.32 60.31 69.99 C 58.59 68.44 57.73 66.04 57.73 62.77 L 57.73 53.57 L 54.59 53.57 L 54.59 45 L 57.73 45 L 57.73 38.29 L 68.89 38.29 L 68.89 45 L 75.06 45 L 75.06 53.57 L 68.89 53.57 L 68.89 60.29 C 68.89 61.09 69.12 61.69 69.58 62.41 C 70.04 62.72 70.58 62.90 71.58 62.90 C 72.58 62.90 74.00 62.23 75 62.23 L 75 70.8 C 74 71.3 73.18 71.5 71.82 71.9 C 70.46 72.22 69.16 72.32 67.86 72.32 Z').fill();

            // Ponto do i (dourado)
            doc.rect(41.13, 36.23, 11.16, 6.86).fill();

            // Corpo do i (dourado)
            doc.path('M 41.13 45 L 41.13 64.03 L 49.44 71.73 L 52.29 71.73 L 52.29 45 Z').fill();

            // Underline _ (dourado)
            doc.rect(78.18, 73.48, 29, 5.58).fill();

            doc.restore();
        };

        // ===== ADICIONAR RODAPÉ EM TODAS AS PÁGINAS =====
        const range = doc.bufferedPageRange();
        const totalPages = range.count;

        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);

            // Linha separadora do footer
            doc.moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

            // Rodapé esquerdo com logo Bureau (maior)
            doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7);
            doc.text('Desenvolvido por', margin, footerY + 2, { continued: false, lineBreak: false });
            drawBureauLogo(margin + 68, footerY - 3, 0.18);

            // Paginação centralizada
            doc.fillColor('#6B7280').fontSize(8);
            const paginacaoTexto = `Página ${i + 1} de ${totalPages}`;
            const paginacaoWidth = doc.widthOfString(paginacaoTexto);
            doc.text(paginacaoTexto, (pageWidth - paginacaoWidth) / 2, footerY + 2, { continued: false, lineBreak: false });

            // Data/hora direita
            const dataTexto = `Quatrelati - ${dataGeracao}`;
            const dataWidth = doc.widthOfString(dataTexto);
            doc.text(dataTexto, pageWidth - margin - dataWidth, footerY + 2, { continued: false, lineBreak: false });
        }

        doc.end();
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
});

/**
 * GET /api/pedidos/:id/pdf
 * Exportar pedido individual para PDF (estilo Pedido de Vendas)
 */
router.get('/:id/pdf', idValidation, async (req, res) => {
    try {
        const { id } = req.params;
        const https = require('https');
        const http = require('http');

        // Buscar pedido completo com dados do cliente, vendedor e empresa
        const pedidoResult = await req.db.query(`
            SELECT
                p.*,
                c.nome as cliente_nome,
                c.razao_social as cliente_razao_social,
                c.cnpj_cpf as cliente_cnpj,
                c.telefone as cliente_telefone,
                c.email as cliente_email,
                c.endereco as cliente_endereco,
                c.endereco_entrega as cliente_endereco_entrega,
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
            SELECT
                pi.*,
                pr.nome as produto_nome,
                pr.peso_caixa_kg
            FROM pedido_itens pi
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = $1
            ORDER BY pi.id
        `, [id]);

        const itens = itensResult.rows;

        // Baixar logos do S3
        const logoUrl = 'https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-azul.png';
        const bureauLogoUrl = 'https://s3.amazonaws.com/bureau-it.com/bureau-it.com__bureau-it black.png';

        const fetchImage = (url) => {
            return new Promise((resolve, reject) => {
                const protocol = url.startsWith('https') ? https : http;
                protocol.get(url, (response) => {
                    const chunks = [];
                    response.on('data', (chunk) => chunks.push(chunk));
                    response.on('end', () => resolve(Buffer.concat(chunks)));
                    response.on('error', reject);
                }).on('error', reject);
            });
        };

        let logoBuffer = null;
        let bureauLogoBuffer = null;
        try {
            logoBuffer = await fetchImage(logoUrl);
        } catch (e) {
            console.log('Não foi possível carregar logo Quatrelati:', e.message);
        }
        try {
            bureauLogoBuffer = await fetchImage(bureauLogoUrl);
        } catch (e) {
            console.log('Não foi possível carregar logo Bureau:', e.message);
        }

        // Criar PDF
        const doc = new PDFDocument({
            margin: 40,
            size: 'A4',
            layout: 'portrait'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=pedido-${pedido.numero_pedido}.pdf`);
        doc.pipe(res);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 40;
        const contentWidth = pageWidth - (margin * 2);

        // ==================== NÚMERO DO PEDIDO (TOPO DIREITO) ====================
        let currentY = margin;

        // Box do número do pedido - design limpo
        const pedidoBoxWidth = 120;
        const pedidoBoxHeight = 50;
        const pedidoBoxX = pageWidth - margin - pedidoBoxWidth;
        doc.rect(pedidoBoxX, currentY, pedidoBoxWidth, pedidoBoxHeight).fill('#FFE500');
        doc.rect(pedidoBoxX, currentY, pedidoBoxWidth, pedidoBoxHeight).stroke('#E5B800');
        doc.fillColor('#92400E').fontSize(9).font('Helvetica-Bold');
        doc.text('PEDIDO Nº', pedidoBoxX, currentY + 10, { width: pedidoBoxWidth, align: 'center' });
        doc.fillColor('#1F2937').fontSize(20).font('Helvetica-Bold');
        doc.text(`#${pedido.numero_pedido}`, pedidoBoxX, currentY + 24, { width: pedidoBoxWidth, align: 'center' });

        // ==================== HEADER DA EMPRESA ====================
        // Logo
        if (logoBuffer) {
            try {
                doc.image(logoBuffer, margin, currentY, { height: 50 });
            } catch (e) {
                doc.fillColor('#124EA6').fontSize(20).font('Helvetica-Bold');
                doc.text('QUATRELATI', margin, currentY + 15);
            }
        } else {
            doc.fillColor('#124EA6').fontSize(20).font('Helvetica-Bold');
            doc.text('QUATRELATI', margin, currentY + 15);
        }

        // Dados da empresa (ao lado do logo)
        const empresaX = margin + 115;
        doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold');
        doc.text('QUATRELATI ALIMENTOS LTDA', empresaX, currentY);
        doc.font('Helvetica').fontSize(8).fillColor('#666666');
        doc.text('RUA LUIZ PIMENTEL MATOS, 75 - Itapeva/SP - 18410-630', empresaX, currentY + 12);
        doc.text('(11) 98944-1945 - www.quatrelatimanteiga.com.br', empresaX, currentY + 22);
        doc.font('Helvetica-Bold').fillColor('#333333').fontSize(8);
        doc.text('CNPJ: 11.391.594/0001-25    IE: 372.247.938.116', empresaX, currentY + 34);

        currentY += 65;

        // ==================== TÍTULO CENTRALIZADO ====================
        doc.fillColor('#124EA6').fontSize(24).font('Helvetica-Bold');
        doc.text('Pedido de Vendas', margin, currentY, { width: contentWidth, align: 'center' });

        currentY += 40;

        // ==================== LINHA REPRESENTANTE / EMISSÃO ====================
        const infoRowHeight = 24;
        doc.rect(margin, currentY, contentWidth, infoRowHeight).fill('#F1F5F9');

        // Representante (esquerda)
        doc.fillColor('#64748B').fontSize(8).font('Helvetica');
        doc.text('Representante:', margin + 12, currentY + 8);
        doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(9);
        doc.text(pedido.vendedor_nome || '-', margin + 85, currentY + 7);

        // Emissão (direita)
        doc.fillColor('#64748B').fontSize(8).font('Helvetica');
        doc.text('Emissão:', pageWidth - margin - 100, currentY + 8);
        doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(9);
        doc.text(format(new Date(pedido.data_pedido), 'dd/MM/yyyy'), pageWidth - margin - 55, currentY + 7);

        currentY += infoRowHeight + 10;

        // ==================== DADOS DO CLIENTE ====================
        // Borda do bloco de cliente
        const clienteBoxHeight = 85;
        doc.rect(margin, currentY, contentWidth, clienteBoxHeight).stroke('#CCCCCC');

        // Coluna esquerda - dados do cliente
        const labelX = margin + 5;
        const valueX = margin + 75;
        doc.fillColor('#666666').fontSize(8).font('Helvetica');

        doc.text('Cliente:', labelX, currentY + 8);
        doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9);
        // Exibir razão social se existir, senão o nome
        const nomeCliente = pedido.cliente_razao_social || pedido.cliente_nome || '-';
        doc.text(nomeCliente, valueX, currentY + 8);

        doc.fillColor('#666666').font('Helvetica').fontSize(8);
        doc.text('Endereço:', labelX, currentY + 22);
        doc.fillColor('#333333').fontSize(8);
        const endereco = pedido.cliente_endereco_entrega || pedido.cliente_endereco || '-';
        doc.text(endereco, valueX, currentY + 22, { width: 250 });

        doc.fillColor('#666666');
        doc.text('Município/U.F.:', labelX, currentY + 36);
        doc.fillColor('#333333');
        const municipio = `${pedido.cliente_cidade || '-'} - ${pedido.cliente_estado || ''} ${pedido.cliente_cep ? `CEP ${pedido.cliente_cep}` : ''}`;
        doc.text(municipio, valueX, currentY + 36);

        doc.fillColor('#666666');
        doc.text('Telefone:', labelX, currentY + 50);
        doc.fillColor('#333333');
        doc.text(pedido.cliente_telefone || '-', valueX, currentY + 50);

        doc.fillColor('#666666');
        doc.text('Contato:', labelX, currentY + 64);
        doc.fillColor('#333333');
        doc.text(pedido.cliente_contato || '-', valueX, currentY + 64);

        // Coluna direita - dados fiscais
        const rightColX = pageWidth - margin - 180;
        doc.fillColor('#666666').font('Helvetica').fontSize(8);
        doc.text('CNPJ:', rightColX, currentY + 36);
        doc.fillColor('#333333');
        doc.text(pedido.cliente_cnpj || '-', rightColX + 35, currentY + 36);

        doc.fillColor('#666666');
        doc.text('IE:', rightColX, currentY + 50);
        doc.fillColor('#333333');
        doc.text('-', rightColX + 35, currentY + 50);

        doc.fillColor('#666666');
        doc.text('E-mail:', rightColX, currentY + 64);
        doc.fillColor('#333333');
        doc.text(pedido.cliente_email || '-', rightColX + 35, currentY + 64, { width: 140 });

        currentY += clienteBoxHeight + 10;

        // ==================== RESUMO DE QUANTIDADE ====================
        // Duas caixas lado a lado com visual profissional
        const resumoBoxWidth = (contentWidth - 15) / 2;
        const resumoBoxHeight = 35;

        // Box QUANTIDADE (esquerda)
        doc.rect(margin, currentY, resumoBoxWidth, resumoBoxHeight).fill('#F8FAFC');
        doc.rect(margin, currentY, 4, resumoBoxHeight).fill('#124EA6');
        doc.fillColor('#64748B').fontSize(8).font('Helvetica');
        doc.text('QUANTIDADE', margin + 12, currentY + 8);
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(16);
        doc.text(`${parseInt(pedido.quantidade_caixas || 0)} CX`, margin + 12, currentY + 18);

        // Box PESO TOTAL (direita)
        const pesoBoxX = margin + resumoBoxWidth + 15;
        doc.rect(pesoBoxX, currentY, resumoBoxWidth, resumoBoxHeight).fill('#F8FAFC');
        doc.rect(pesoBoxX, currentY, 4, resumoBoxHeight).fill('#124EA6');
        doc.fillColor('#64748B').fontSize(8).font('Helvetica');
        doc.text('PESO TOTAL', pesoBoxX + 12, currentY + 8);
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(16);
        doc.text(`${parseFloat(pedido.peso_kg || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`, pesoBoxX + 12, currentY + 18);

        currentY += resumoBoxHeight + 15;

        // ==================== TABELA DE ITENS ====================
        // Colunas: Item | Produto | Qtd | Peso | R$/kg | Subtotal
        // Largura total = contentWidth para padronizar com outros elementos
        const tableX = margin;
        const colWidths = [35, contentWidth - 35 - 65 - 75 - 70 - 90, 65, 75, 70, 90];
        const tableWidth = contentWidth;
        const minRowHeight = 24;
        const headerHeight = 24;

        // Cabeçalho da tabela - azul Quatrelati
        doc.rect(tableX, currentY, tableWidth, headerHeight).fill('#124EA6');
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

        let colX = tableX + 8;
        const headers = ['Item', 'Descrição do Produto', 'Qtd', 'Peso', 'R$/kg', 'Subtotal'];
        headers.forEach((header, i) => {
            const align = i > 1 ? 'center' : 'left';
            doc.text(header, colX, currentY + 8, { width: colWidths[i] - 12, align });
            colX += colWidths[i];
        });

        currentY += headerHeight;

        // Linhas de itens - altura dinâmica baseada no nome do produto
        let tableEndY = currentY;
        for (let i = 0; i < itens.length; i++) {
            const item = itens[i];
            const produtoNome = item.produto_nome || '-';

            // Calcular altura necessária para o nome do produto
            doc.fontSize(9).font('Helvetica-Bold');
            const produtoWidth = colWidths[1] - 12;
            const textHeight = doc.heightOfString(produtoNome, { width: produtoWidth });
            const rowHeight = Math.max(minRowHeight, textHeight + 14);

            // Fundo alternado para melhor leitura
            const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(tableX, currentY, tableWidth, rowHeight).fill(bgColor);
            doc.rect(tableX, currentY, tableWidth, rowHeight).stroke('#E5E7EB');

            // Centralizar verticalmente o conteúdo
            const textY = currentY + (rowHeight - textHeight) / 2;
            const singleLineY = currentY + (rowHeight - 9) / 2; // Para textos de uma linha

            colX = tableX + 8;
            doc.fillColor('#374151').fontSize(9).font('Helvetica');

            // Item número
            doc.fillColor('#64748B');
            doc.text(String(i + 1), colX, singleLineY);
            colX += colWidths[0];

            // Produto nome (pode ter múltiplas linhas)
            doc.fillColor('#1F2937').font('Helvetica-Bold');
            doc.text(produtoNome, colX, textY, { width: produtoWidth });
            colX += colWidths[1];

            // Quantidade com unidade (ex: "10 cx")
            doc.font('Helvetica').fillColor('#374151');
            doc.text(`${parseInt(item.quantidade_caixas || 0)} cx`, colX, singleLineY, { width: colWidths[2] - 12, align: 'center' });
            colX += colWidths[2];

            // Peso em kg
            doc.text(`${parseFloat(item.peso_kg || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`, colX, singleLineY, { width: colWidths[3] - 12, align: 'center' });
            colX += colWidths[3];

            // Valor unitário por kg
            doc.text(`R$ ${parseFloat(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colX, singleLineY, { width: colWidths[4] - 12, align: 'right' });
            colX += colWidths[4];

            // Subtotal
            doc.font('Helvetica-Bold').fillColor('#124EA6');
            doc.text(`R$ ${parseFloat(item.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colX, singleLineY, { width: colWidths[5] - 12, align: 'right' });

            currentY += rowHeight;
            tableEndY = currentY;
        }

        currentY = tableEndY + 10;

        // ==================== LINHA DE TOTAL (abaixo da tabela) ====================
        const totalRowHeight = 35;
        doc.rect(tableX, currentY, tableWidth, totalRowHeight).fill('#124EA6');

        // Valor Total alinhado à direita
        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
        doc.text('VALOR TOTAL:', tableX + tableWidth - 250, currentY + 11);
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text(`R$ ${parseFloat(pedido.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, tableX + tableWidth - 130, currentY + 9, { width: 120, align: 'right' });

        currentY += totalRowHeight + 15;

        // ==================== INFORMAÇÕES ADICIONAIS ====================
        // Layout em duas colunas: Observações (esquerda) | Condições (direita)
        const infoColWidth = contentWidth * 0.50;
        const condColWidth = contentWidth * 0.50;
        const infoBoxHeight = 80;

        // Box Observações (esquerda)
        doc.rect(margin, currentY, infoColWidth - 5, infoBoxHeight).fill('#FAFAFA');
        doc.rect(margin, currentY, infoColWidth - 5, infoBoxHeight).stroke('#E5E7EB');

        let obsY = currentY + 10;
        const obsLabelWidth = 100;
        const obsValueX = margin + obsLabelWidth;

        // Horário de Recebimento
        doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold');
        doc.text('Horário Receb.:', margin + 8, obsY);
        doc.fillColor('#1F2937').font('Helvetica').fontSize(8);
        const horarioReceb = pedido.horario_recebimento || 'Seg à Sex, 8:00 às 17:00hs';
        doc.text(horarioReceb, obsValueX, obsY);

        obsY += 14;

        // Preço descarga pallet
        doc.fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Preço Desc. Pallet:', margin + 8, obsY);
        doc.fillColor('#1F2937').font('Helvetica');
        const precoDescarga = pedido.preco_descarga_pallet
            ? `R$ ${parseFloat(pedido.preco_descarga_pallet).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : '-';
        doc.text(precoDescarga, obsValueX, obsY);

        obsY += 14;

        // Observações do pedido
        doc.fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Obs. Pedido:', margin + 8, obsY);
        doc.fillColor('#B45309').font('Helvetica');
        doc.text(pedido.observacoes || '-', obsValueX, obsY, { width: infoColWidth - obsLabelWidth - 20 });

        obsY += 14;

        // Observações do cliente
        doc.fillColor('#64748B').font('Helvetica-Bold');
        doc.text('Obs. Cliente:', margin + 8, obsY);
        doc.fillColor('#6B7280').font('Helvetica');
        doc.text(pedido.cliente_observacoes || '-', obsValueX, obsY, { width: infoColWidth - obsLabelWidth - 20 });

        // Box Condições (direita)
        const condX = margin + infoColWidth + 5;
        doc.rect(condX, currentY, condColWidth - 5, infoBoxHeight).fill('#F8FAFC');
        doc.rect(condX, currentY, condColWidth - 5, infoBoxHeight).stroke('#E5E7EB');

        let condY = currentY + 12;
        const condLabelX = condX + 12;
        const condValueX = condX + condColWidth - 20;

        // Prazo Pagamento
        doc.fillColor('#64748B').fontSize(9).font('Helvetica');
        doc.text('Prazo Pagamento:', condLabelX, condY);
        doc.fillColor('#1F2937').font('Helvetica-Bold');
        doc.text('28 DDL', condValueX - 60, condY, { width: 60, align: 'right' });

        condY += 18;

        // Frete
        doc.fillColor('#64748B').font('Helvetica');
        doc.text('Frete:', condLabelX, condY);
        const tipoFrete = pedido.entregue ? 'Entregue' : 'A entregar';
        doc.fillColor('#1F2937').font('Helvetica-Bold');
        doc.text(tipoFrete, condValueX - 60, condY, { width: 60, align: 'right' });

        // ==================== RODAPÉ FINAL (igual ao da lista) ====================
        const footerY = pageHeight - 30;
        const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm');

        // Função para desenhar logo Bureau (vetorial)
        const drawBureauLogo = (x, y, scale = 0.12) => {
            doc.save();
            doc.translate(x, y);
            doc.scale(scale);

            // Seta (cinza)
            doc.fillColor('#6B7280');
            doc.path('M 16.59 44.68 L 16.59 87.58 L 28.69 71.86 L 45.68 71.86 Z').fill();

            // Letra t (dourado)
            doc.fillColor('#D4A017');
            doc.path('M 67.86 72.32 Q 62.86 72.32 60.31 69.99 C 58.59 68.44 57.73 66.04 57.73 62.77 L 57.73 53.57 L 54.59 53.57 L 54.59 45 L 57.73 45 L 57.73 38.29 L 68.89 38.29 L 68.89 45 L 75.06 45 L 75.06 53.57 L 68.89 53.57 L 68.89 60.29 C 68.89 61.09 69.12 61.69 69.58 62.41 C 70.04 62.72 70.58 62.90 71.58 62.90 C 72.58 62.90 74.00 62.23 75 62.23 L 75 70.8 C 74 71.3 73.18 71.5 71.82 71.9 C 70.46 72.22 69.16 72.32 67.86 72.32 Z').fill();

            // Ponto do i (dourado)
            doc.rect(41.13, 36.23, 11.16, 6.86).fill();

            // Corpo do i (dourado)
            doc.path('M 41.13 45 L 41.13 64.03 L 49.44 71.73 L 52.29 71.73 L 52.29 45 Z').fill();

            // Underline _ (dourado)
            doc.rect(78.18, 73.48, 29, 5.58).fill();

            doc.restore();
        };

        // Linha separadora do rodapé
        doc.strokeColor('#E5E7EB').lineWidth(0.5);
        doc.moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8).stroke();

        // Rodapé esquerdo com logo Bureau - alinhado verticalmente
        doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7);
        doc.text('Desenvolvido por', margin, footerY + 2, { continued: false, lineBreak: false });
        drawBureauLogo(margin + 60, footerY - 3, 0.16);

        // Paginação centralizada
        doc.fillColor('#9CA3AF').fontSize(8);
        const paginacaoTexto = 'Página 1 de 1';
        const paginacaoWidth = doc.widthOfString(paginacaoTexto);
        doc.text(paginacaoTexto, (pageWidth - paginacaoWidth) / 2, footerY + 1, { continued: false, lineBreak: false });

        // Data/hora direita
        const dataTexto = `Quatrelati - ${dataGeracao}`;
        const dataWidth = doc.widthOfString(dataTexto);
        doc.text(dataTexto, pageWidth - margin - dataWidth, footerY + 1, { continued: false, lineBreak: false });

        doc.end();
    } catch (error) {
        console.error('Erro ao exportar PDF do pedido:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
});

module.exports = router;
