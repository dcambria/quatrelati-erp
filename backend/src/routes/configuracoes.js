// =====================================================
// Rotas de Configurações do Sistema
// Apenas superadmins podem acessar
// =====================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, superadminOnly } = require('../middleware/auth');

// Configurar multer para upload de arquivos JSON
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos JSON são permitidos'));
        }
    }
});

// Todas as rotas requerem autenticação e nível superadmin
router.use(authMiddleware);
router.use(superadminOnly);

/**
 * GET /api/configuracoes
 * Lista todas as configurações
 */
router.get('/', async (req, res) => {
    try {
        const result = await req.db.query(`
            SELECT c.*, u.nome as updated_by_nome
            FROM configuracoes c
            LEFT JOIN usuarios u ON c.updated_by = u.id
            ORDER BY c.chave ASC
        `);

        res.json({ configuracoes: result.rows });
    } catch (error) {
        console.error('Erro ao listar configurações:', error);
        res.status(500).json({ error: 'Erro ao listar configurações' });
    }
});

// =====================================================
// ROTAS DE EXPORTAÇÃO DE DADOS
// =====================================================

/**
 * GET /api/configuracoes/exportar/clientes
 * Exporta dados de clientes em JSON
 */
router.get('/exportar/clientes', async (req, res) => {
    try {
        const { ativos_apenas } = req.query;

        let query = 'SELECT * FROM clientes';
        const params = [];

        if (ativos_apenas === 'true') {
            query += ' WHERE ativo = true';
        }

        query += ' ORDER BY nome ASC';

        const result = await req.db.query(query, params);

        const exportData = {
            tipo: 'clientes',
            versao: '1.0',
            data_exportacao: new Date().toISOString(),
            total_registros: result.rows.length,
            dados: result.rows
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=clientes_${new Date().toISOString().split('T')[0]}.json`);
        res.json(exportData);
    } catch (error) {
        console.error('Erro ao exportar clientes:', error);
        res.status(500).json({ error: 'Erro ao exportar clientes' });
    }
});

/**
 * GET /api/configuracoes/exportar/produtos
 * Exporta dados de produtos em JSON
 */
router.get('/exportar/produtos', async (req, res) => {
    try {
        const { ativos_apenas } = req.query;

        let query = 'SELECT * FROM produtos';
        const params = [];

        if (ativos_apenas === 'true') {
            query += ' WHERE ativo = true';
        }

        query += ' ORDER BY nome ASC';

        const result = await req.db.query(query, params);

        const exportData = {
            tipo: 'produtos',
            versao: '1.0',
            data_exportacao: new Date().toISOString(),
            total_registros: result.rows.length,
            dados: result.rows
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=produtos_${new Date().toISOString().split('T')[0]}.json`);
        res.json(exportData);
    } catch (error) {
        console.error('Erro ao exportar produtos:', error);
        res.status(500).json({ error: 'Erro ao exportar produtos' });
    }
});

/**
 * GET /api/configuracoes/exportar/pedidos
 * Exporta dados de pedidos em JSON (com filtros opcionais)
 */
router.get('/exportar/pedidos', async (req, res) => {
    try {
        const { data_inicio, data_fim, status } = req.query;

        let query = `
            SELECT p.*,
                c.nome as cliente_nome, c.cnpj_cpf as cliente_cnpj,
                u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.created_by = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (data_inicio) {
            query += ` AND p.data_pedido >= $${paramIndex}`;
            params.push(data_inicio);
            paramIndex++;
        }

        if (data_fim) {
            query += ` AND p.data_pedido <= $${paramIndex}`;
            params.push(data_fim);
            paramIndex++;
        }

        if (status) {
            query += ` AND p.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ' ORDER BY p.data_pedido DESC';

        const pedidosResult = await req.db.query(query, params);

        // Buscar itens de cada pedido
        const pedidosComItens = await Promise.all(
            pedidosResult.rows.map(async (pedido) => {
                const itensResult = await req.db.query(`
                    SELECT pi.*, pr.nome as produto_nome, pr.codigo as produto_codigo
                    FROM pedido_itens pi
                    LEFT JOIN produtos pr ON pi.produto_id = pr.id
                    WHERE pi.pedido_id = $1
                    ORDER BY pi.id
                `, [pedido.id]);

                return {
                    ...pedido,
                    itens: itensResult.rows
                };
            })
        );

        const exportData = {
            tipo: 'pedidos',
            versao: '1.0',
            data_exportacao: new Date().toISOString(),
            filtros: { data_inicio, data_fim, status },
            total_registros: pedidosComItens.length,
            dados: pedidosComItens
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=pedidos_${new Date().toISOString().split('T')[0]}.json`);
        res.json(exportData);
    } catch (error) {
        console.error('Erro ao exportar pedidos:', error);
        res.status(500).json({ error: 'Erro ao exportar pedidos' });
    }
});

/**
 * GET /api/configuracoes/exportar/completo
 * Exporta todos os dados do sistema em JSON
 */
router.get('/exportar/completo', async (req, res) => {
    try {
        // Exportar clientes
        const clientesResult = await req.db.query('SELECT * FROM clientes ORDER BY nome ASC');

        // Exportar produtos
        const produtosResult = await req.db.query('SELECT * FROM produtos ORDER BY nome ASC');

        // Exportar pedidos com itens
        const pedidosResult = await req.db.query(`
            SELECT p.*,
                c.nome as cliente_nome,
                u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.created_by = u.id
            ORDER BY p.data_pedido DESC
        `);

        const pedidosComItens = await Promise.all(
            pedidosResult.rows.map(async (pedido) => {
                const itensResult = await req.db.query(`
                    SELECT pi.*, pr.nome as produto_nome
                    FROM pedido_itens pi
                    LEFT JOIN produtos pr ON pi.produto_id = pr.id
                    WHERE pi.pedido_id = $1
                `, [pedido.id]);

                return {
                    ...pedido,
                    itens: itensResult.rows
                };
            })
        );

        const exportData = {
            tipo: 'backup_completo',
            versao: '1.0',
            data_exportacao: new Date().toISOString(),
            clientes: {
                total: clientesResult.rows.length,
                dados: clientesResult.rows
            },
            produtos: {
                total: produtosResult.rows.length,
                dados: produtosResult.rows
            },
            pedidos: {
                total: pedidosComItens.length,
                dados: pedidosComItens
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=backup_quatrelati_${new Date().toISOString().split('T')[0]}.json`);
        res.json(exportData);
    } catch (error) {
        console.error('Erro ao exportar backup completo:', error);
        res.status(500).json({ error: 'Erro ao exportar backup completo' });
    }
});

// =====================================================
// ROTAS DE IMPORTAÇÃO DE DADOS
// =====================================================

/**
 * POST /api/configuracoes/importar/clientes
 * Importa dados de clientes de um arquivo JSON
 */
router.post('/importar/clientes', upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const dados = JSON.parse(req.file.buffer.toString());

        if (dados.tipo !== 'clientes') {
            return res.status(400).json({ error: 'Tipo de arquivo inválido. Esperado: clientes' });
        }

        const { modo } = req.body; // 'adicionar' ou 'substituir'
        let importados = 0;
        let atualizados = 0;
        let erros = [];

        // Se modo for substituir, limpar tabela primeiro
        if (modo === 'substituir') {
            // Verificar se há pedidos vinculados
            const pedidosResult = await req.db.query('SELECT COUNT(*) FROM pedidos');
            if (parseInt(pedidosResult.rows[0].count) > 0) {
                return res.status(400).json({
                    error: 'Não é possível substituir clientes com pedidos existentes'
                });
            }
            await req.db.query('DELETE FROM clientes');
        }

        for (const cliente of dados.dados) {
            try {
                // Verificar se cliente existe pelo CNPJ/CPF
                const existente = await req.db.query(
                    'SELECT id FROM clientes WHERE cnpj_cpf = $1',
                    [cliente.cnpj_cpf]
                );

                if (existente.rows.length > 0) {
                    // Atualizar
                    await req.db.query(`
                        UPDATE clientes SET
                            nome = $1, razao_social = $2, telefone = $3, email = $4,
                            endereco = $5, cidade = $6, estado = $7, cep = $8,
                            contato_nome = $9, observacoes = $10, ativo = $11,
                            endereco_entrega = $12, updated_at = CURRENT_TIMESTAMP
                        WHERE cnpj_cpf = $13
                    `, [
                        cliente.nome, cliente.razao_social, cliente.telefone, cliente.email,
                        cliente.endereco, cliente.cidade, cliente.estado, cliente.cep,
                        cliente.contato_nome, cliente.observacoes, cliente.ativo !== false,
                        cliente.endereco_entrega, cliente.cnpj_cpf
                    ]);
                    atualizados++;
                } else {
                    // Inserir
                    await req.db.query(`
                        INSERT INTO clientes (
                            nome, razao_social, cnpj_cpf, telefone, email,
                            endereco, cidade, estado, cep, contato_nome,
                            observacoes, ativo, endereco_entrega
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    `, [
                        cliente.nome, cliente.razao_social, cliente.cnpj_cpf,
                        cliente.telefone, cliente.email, cliente.endereco,
                        cliente.cidade, cliente.estado, cliente.cep,
                        cliente.contato_nome, cliente.observacoes, cliente.ativo !== false,
                        cliente.endereco_entrega
                    ]);
                    importados++;
                }
            } catch (err) {
                erros.push({ cliente: cliente.nome, erro: err.message });
            }
        }

        res.json({
            message: 'Importação concluída',
            importados,
            atualizados,
            erros: erros.length > 0 ? erros : undefined
        });
    } catch (error) {
        console.error('Erro ao importar clientes:', error);
        res.status(500).json({ error: 'Erro ao importar clientes: ' + error.message });
    }
});

/**
 * POST /api/configuracoes/importar/produtos
 * Importa dados de produtos de um arquivo JSON
 */
router.post('/importar/produtos', upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const dados = JSON.parse(req.file.buffer.toString());

        if (dados.tipo !== 'produtos') {
            return res.status(400).json({ error: 'Tipo de arquivo inválido. Esperado: produtos' });
        }

        const { modo } = req.body;
        let importados = 0;
        let atualizados = 0;
        let erros = [];

        if (modo === 'substituir') {
            // Verificar se há pedidos vinculados
            const pedidosResult = await req.db.query('SELECT COUNT(*) FROM pedido_itens');
            if (parseInt(pedidosResult.rows[0].count) > 0) {
                return res.status(400).json({
                    error: 'Não é possível substituir produtos com pedidos existentes'
                });
            }
            await req.db.query('DELETE FROM produtos');
        }

        for (const produto of dados.dados) {
            try {
                // Verificar se produto existe pelo código
                const existente = await req.db.query(
                    'SELECT id FROM produtos WHERE codigo = $1',
                    [produto.codigo]
                );

                if (existente.rows.length > 0) {
                    await req.db.query(`
                        UPDATE produtos SET
                            nome = $1, preco = $2, peso_caixa_kg = $3,
                            imagem_url = $4, ativo = $5, updated_at = CURRENT_TIMESTAMP
                        WHERE codigo = $6
                    `, [
                        produto.nome, produto.preco, produto.peso_caixa_kg,
                        produto.imagem_url, produto.ativo !== false, produto.codigo
                    ]);
                    atualizados++;
                } else {
                    await req.db.query(`
                        INSERT INTO produtos (codigo, nome, preco, peso_caixa_kg, imagem_url, ativo)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        produto.codigo, produto.nome, produto.preco,
                        produto.peso_caixa_kg, produto.imagem_url, produto.ativo !== false
                    ]);
                    importados++;
                }
            } catch (err) {
                erros.push({ produto: produto.nome, erro: err.message });
            }
        }

        res.json({
            message: 'Importação concluída',
            importados,
            atualizados,
            erros: erros.length > 0 ? erros : undefined
        });
    } catch (error) {
        console.error('Erro ao importar produtos:', error);
        res.status(500).json({ error: 'Erro ao importar produtos: ' + error.message });
    }
});

// =====================================================
// ROTAS DE CONFIGURAÇÕES GERAIS
// =====================================================

/**
 * GET /api/configuracoes/:chave
 * Busca uma configuração específica
 */
router.get('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;

        const result = await req.db.query(`
            SELECT c.*, u.nome as updated_by_nome
            FROM configuracoes c
            LEFT JOIN usuarios u ON c.updated_by = u.id
            WHERE c.chave = $1
        `, [chave]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Configuração não encontrada' });
        }

        res.json({ configuracao: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

/**
 * PUT /api/configuracoes/:chave
 * Atualiza uma configuração
 */
router.put('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const { valor } = req.body;

        const result = await req.db.query(`
            UPDATE configuracoes
            SET valor = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
            WHERE chave = $3
            RETURNING *
        `, [valor, req.userId, chave]);

        if (result.rows.length === 0) {
            // Se não existe, criar
            const insertResult = await req.db.query(`
                INSERT INTO configuracoes (chave, valor, updated_by)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [chave, valor, req.userId]);

            return res.json({
                message: 'Configuração criada com sucesso',
                configuracao: insertResult.rows[0]
            });
        }

        res.json({
            message: 'Configuração atualizada com sucesso',
            configuracao: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
});

module.exports = router;
