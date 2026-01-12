// =====================================================
// Testes de Integração - Configurações Routes
// =====================================================

const request = require('supertest');
const { createTestApp, createMockPool, generateTestToken } = require('../testHelper');

const configuracoesRoutes = require('../../src/routes/configuracoes');

describe('Configuracoes Routes Integration', () => {
    let app;
    let mockPool;
    let superadminToken;
    let adminToken;

    beforeEach(() => {
        mockPool = createMockPool();
        app = createTestApp(mockPool);

        // Routes use authMiddleware + superadminOnly internally
        app.use('/api/configuracoes', configuracoesRoutes);

        superadminToken = generateTestToken({ id: 1, nivel: 'superadmin' });
        adminToken = generateTestToken({ id: 2, nivel: 'admin' });
    });

    describe('GET /api/configuracoes', () => {
        it('deve listar configurações para superadmin', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { chave: 'log_superadmin', valor: 'true', updated_by_nome: 'Admin' },
                    { chave: 'tema', valor: 'dark', updated_by_nome: 'Admin' }
                ],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/configuracoes')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('configuracoes');
            expect(Array.isArray(response.body.configuracoes)).toBe(true);
        });

        it('deve rejeitar acesso por admin (não superadmin)', async () => {
            const response = await request(app)
                .get('/api/configuracoes')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(403);
        });

        it('deve rejeitar requisição sem autenticação', async () => {
            const response = await request(app)
                .get('/api/configuracoes');

            expect(response.status).toBe(401);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/configuracoes')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/configuracoes/:chave', () => {
        it('deve retornar configuração específica', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ chave: 'log_superadmin', valor: 'true', updated_by_nome: 'Admin' }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/configuracoes/log_superadmin')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('configuracao');
            expect(response.body.configuracao.chave).toBe('log_superadmin');
        });

        it('deve retornar 404 para configuração inexistente', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/configuracoes/inexistente')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(404);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/configuracoes/log_superadmin')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('PUT /api/configuracoes/:chave', () => {
        it('deve atualizar configuração existente', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ chave: 'log_superadmin', valor: 'false' }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/configuracoes/log_superadmin')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ valor: 'false' });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('atualizada');
        });

        it('deve criar configuração se não existir', async () => {
            // UPDATE retorna vazio (não existe)
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // INSERT cria nova
            mockPool.query.mockResolvedValueOnce({
                rows: [{ chave: 'nova_config', valor: 'valor_teste' }],
                rowCount: 1
            });

            const response = await request(app)
                .put('/api/configuracoes/nova_config')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ valor: 'valor_teste' });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('criada');
        });

        it('deve rejeitar acesso por admin (não superadmin)', async () => {
            const response = await request(app)
                .put('/api/configuracoes/log_superadmin')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ valor: 'false' });

            expect(response.status).toBe(403);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .put('/api/configuracoes/log_superadmin')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ valor: 'false' });

            expect(response.status).toBe(500);
        });
    });

    // =====================================================
    // TESTES DE EXPORTAÇÃO
    // =====================================================

    describe('GET /api/configuracoes/exportar/clientes', () => {
        it('deve exportar clientes em JSON', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, nome: 'Cliente 1', cnpj_cpf: '12345678901', ativo: true },
                    { id: 2, nome: 'Cliente 2', cnpj_cpf: '98765432101', ativo: true }
                ],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/configuracoes/exportar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('tipo', 'clientes');
            expect(response.body).toHaveProperty('dados');
            expect(response.body.dados).toHaveLength(2);
        });

        it('deve exportar apenas clientes ativos quando solicitado', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Cliente Ativo', ativo: true }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/configuracoes/exportar/clientes?ativos_apenas=true')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE ativo = true'),
                expect.any(Array)
            );
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/configuracoes/exportar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/configuracoes/exportar/produtos', () => {
        it('deve exportar produtos em JSON', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, codigo: 'P001', nome: 'Produto 1', preco: 10.00 },
                    { id: 2, codigo: 'P002', nome: 'Produto 2', preco: 20.00 }
                ],
                rowCount: 2
            });

            const response = await request(app)
                .get('/api/configuracoes/exportar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('tipo', 'produtos');
            expect(response.body.dados).toHaveLength(2);
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/configuracoes/exportar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/configuracoes/exportar/pedidos', () => {
        it('deve exportar pedidos com itens', async () => {
            // Query de pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, cliente_nome: 'Cliente 1', total: 100.00 }],
                rowCount: 1
            });
            // Query de itens do pedido 1
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, produto_nome: 'Produto 1', quantidade_caixas: 10 }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/configuracoes/exportar/pedidos')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('tipo', 'pedidos');
            expect(response.body.dados[0]).toHaveProperty('itens');
        });

        it('deve aplicar filtros de data', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/configuracoes/exportar/pedidos?data_inicio=2024-01-01&data_fim=2024-12-31')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('data_pedido >='),
                expect.arrayContaining(['2024-01-01', '2024-12-31'])
            );
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/configuracoes/exportar/pedidos')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/configuracoes/exportar/completo', () => {
        it('deve exportar backup completo', async () => {
            // Clientes
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Cliente 1' }],
                rowCount: 1
            });
            // Produtos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Produto 1' }],
                rowCount: 1
            });
            // Pedidos
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, cliente_nome: 'Cliente 1' }],
                rowCount: 1
            });
            // Itens do pedido
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, produto_nome: 'Produto 1' }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/configuracoes/exportar/completo')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('tipo', 'backup_completo');
            expect(response.body).toHaveProperty('clientes');
            expect(response.body).toHaveProperty('produtos');
            expect(response.body).toHaveProperty('pedidos');
        });

        it('deve retornar 500 em caso de erro', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .get('/api/configuracoes/exportar/completo')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(500);
        });
    });

    // =====================================================
    // TESTES DE IMPORTAÇÃO
    // =====================================================

    describe('POST /api/configuracoes/importar/clientes', () => {
        it('deve importar clientes de arquivo JSON', async () => {
            const dadosImportacao = {
                tipo: 'clientes',
                versao: '1.0',
                dados: [
                    { nome: 'Novo Cliente', cnpj_cpf: '11111111111', ativo: true }
                ]
            };

            // Verificar se cliente existe
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Insert
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'clientes.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('importados', 1);
        });

        it('deve atualizar cliente existente', async () => {
            const dadosImportacao = {
                tipo: 'clientes',
                versao: '1.0',
                dados: [
                    { nome: 'Cliente Atualizado', cnpj_cpf: '11111111111' }
                ]
            };

            // Cliente existe
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
            // Update
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'clientes.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('atualizados', 1);
        });

        it('deve rejeitar arquivo com tipo inválido', async () => {
            const dadosInvalidos = {
                tipo: 'produtos',
                dados: []
            };

            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosInvalidos)), {
                    filename: 'produtos.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Tipo de arquivo inválido');
        });

        it('deve rejeitar substituição quando há pedidos', async () => {
            const dadosImportacao = {
                tipo: 'clientes',
                versao: '1.0',
                dados: []
            };

            // Há pedidos
            mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'clientes.json',
                    contentType: 'application/json'
                })
                .field('modo', 'substituir');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('pedidos existentes');
        });

        it('deve retornar 400 quando não há arquivo', async () => {
            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .field('modo', 'adicionar');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Nenhum arquivo');
        });
    });

    describe('POST /api/configuracoes/importar/produtos', () => {
        it('deve importar produtos de arquivo JSON', async () => {
            const dadosImportacao = {
                tipo: 'produtos',
                versao: '1.0',
                dados: [
                    { codigo: 'P001', nome: 'Novo Produto', preco: 10.00 }
                ]
            };

            // Verificar se produto existe
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Insert
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'produtos.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('importados', 1);
        });

        it('deve rejeitar arquivo com tipo inválido', async () => {
            const dadosInvalidos = {
                tipo: 'clientes',
                dados: []
            };

            const response = await request(app)
                .post('/api/configuracoes/importar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosInvalidos)), {
                    filename: 'clientes.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Tipo de arquivo inválido');
        });

        it('deve rejeitar substituição quando há pedido_itens', async () => {
            const dadosImportacao = {
                tipo: 'produtos',
                versao: '1.0',
                dados: []
            };

            // Há itens
            mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'produtos.json',
                    contentType: 'application/json'
                })
                .field('modo', 'substituir');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('pedidos existentes');
        });

        it('deve retornar 400 quando não há arquivo', async () => {
            const response = await request(app)
                .post('/api/configuracoes/importar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`)
                .field('modo', 'adicionar');

            expect(response.status).toBe(400);
        });

        it('deve atualizar produto existente', async () => {
            const dadosImportacao = {
                tipo: 'produtos',
                versao: '1.0',
                dados: [
                    { codigo: 'P001', nome: 'Produto Atualizado', preco: 15.00 }
                ]
            };

            // Produto existe
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
            // Update
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'produtos.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('atualizados', 1);
        });
    });

    describe('POST /api/configuracoes/importar - erros de importação', () => {
        it('deve reportar erros individuais na importação de clientes', async () => {
            const dadosImportacao = {
                tipo: 'clientes',
                versao: '1.0',
                dados: [
                    { nome: 'Cliente OK', cnpj_cpf: '11111111111' },
                    { nome: 'Cliente Erro', cnpj_cpf: '22222222222' }
                ]
            };

            // Primeiro cliente: não existe, insert ok
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            // Segundo cliente: não existe, insert falha
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockRejectedValueOnce(new Error('Constraint violation'));

            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'clientes.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(200);
            expect(response.body.importados).toBe(1);
            expect(response.body.erros).toBeDefined();
            expect(response.body.erros).toHaveLength(1);
        });

        it('deve reportar erros individuais na importação de produtos', async () => {
            const dadosImportacao = {
                tipo: 'produtos',
                versao: '1.0',
                dados: [
                    { codigo: 'P001', nome: 'Produto OK', preco: 10 },
                    { codigo: 'P002', nome: 'Produto Erro', preco: 20 }
                ]
            };

            // Primeiro produto: não existe, insert ok
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            // Segundo produto: não existe, insert falha
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

            const response = await request(app)
                .post('/api/configuracoes/importar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'produtos.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(200);
            expect(response.body.importados).toBe(1);
            expect(response.body.erros).toHaveLength(1);
        });

        it('deve permitir substituir clientes quando não há pedidos', async () => {
            const dadosImportacao = {
                tipo: 'clientes',
                versao: '1.0',
                dados: [
                    { nome: 'Novo Cliente', cnpj_cpf: '33333333333' }
                ]
            };

            // Verificar se há pedidos (não há)
            mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
            // Delete all
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Insert novo cliente - não existe
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Insert
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'clientes.json',
                    contentType: 'application/json'
                })
                .field('modo', 'substituir');

            expect(response.status).toBe(200);
            expect(response.body.importados).toBe(1);
        });

        it('deve permitir substituir produtos quando não há pedido_itens', async () => {
            const dadosImportacao = {
                tipo: 'produtos',
                versao: '1.0',
                dados: [
                    { codigo: 'P999', nome: 'Novo Produto', preco: 99 }
                ]
            };

            // Verificar se há pedido_itens (não há)
            mockPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
            // Delete all
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Insert novo produto - não existe
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            // Insert
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app)
                .post('/api/configuracoes/importar/produtos')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from(JSON.stringify(dadosImportacao)), {
                    filename: 'produtos.json',
                    contentType: 'application/json'
                })
                .field('modo', 'substituir');

            expect(response.status).toBe(200);
            expect(response.body.importados).toBe(1);
        });

        it('deve retornar 500 para JSON inválido', async () => {
            const response = await request(app)
                .post('/api/configuracoes/importar/clientes')
                .set('Authorization', `Bearer ${superadminToken}`)
                .attach('arquivo', Buffer.from('invalid json {{{'), {
                    filename: 'clientes.json',
                    contentType: 'application/json'
                })
                .field('modo', 'adicionar');

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/configuracoes/exportar/produtos - filtro ativos', () => {
        it('deve exportar apenas produtos ativos quando solicitado', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, nome: 'Produto Ativo', ativo: true }],
                rowCount: 1
            });

            const response = await request(app)
                .get('/api/configuracoes/exportar/produtos?ativos_apenas=true')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE ativo = true'),
                expect.any(Array)
            );
        });
    });

    describe('GET /api/configuracoes/exportar/pedidos - filtro status', () => {
        it('deve aplicar filtro de status', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)
                .get('/api/configuracoes/exportar/pedidos?status=pendente')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('status'),
                expect.arrayContaining(['pendente'])
            );
        });
    });
});
