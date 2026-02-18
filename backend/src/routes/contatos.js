// =====================================================
// Rotas de Contatos do Site
// v1.3.0 - DELETE /api/contatos/:id (superadmin only)
// =====================================================

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { apiKeyMiddleware } = require('../middleware/apiKey');
const { idValidation } = require('../middleware/validation');
const { activityLogMiddleware } = require('../middleware/activityLog');
const { sendReplyEmail } = require('../services/emailService');
const { logActivity } = require('../middleware/activityLog');

// Multer para upload de anexos de email (memória, sem gravar em disco)
const emailUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por arquivo
});

// Rate limiter para o endpoint público de recebimento de contatos
const contatosLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 30, // 30 contatos por IP por 15 minutos
    message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/contatos
 * Recebe contato do site (autenticado por API Key)
 * Não requer JWT — chamada inter-serviço
 */
router.post('/', contatosLimiter, apiKeyMiddleware, async (req, res) => {
    try {
        const { nome, empresa, email, telefone, mensagem, tipo, token, status } = req.body;

        if (!nome || !mensagem) {
            return res.status(400).json({ error: 'Campos nome e mensagem são obrigatórios' });
        }

        const result = await req.db.query(
            `INSERT INTO contatos_site (nome, empresa, email, telefone, mensagem, tipo, token, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, recebido_em`,
            [
                nome.trim(),
                empresa ? empresa.trim() : null,
                email ? email.trim().toLowerCase() : null,
                telefone ? telefone.trim() : null,
                mensagem.trim(),
                tipo || 'contato',
                token || null,
                status || 'novo'
            ]
        );

        console.log(`[CONTATOS] Novo contato recebido: ${nome} (${empresa || 'sem empresa'}) — ID ${result.rows[0].id}`);

        return res.status(201).json({
            success: true,
            id: result.rows[0].id,
            recebido_em: result.rows[0].recebido_em
        });
    } catch (error) {
        console.error('[CONTATOS] Erro ao registrar contato:', error.message);
        return res.status(500).json({ error: 'Erro interno ao registrar contato' });
    }
});

// Todas as rotas abaixo requerem autenticação JWT
router.use(authMiddleware);

/**
 * GET /api/contatos
 * Lista contatos com filtros e paginação
 * Query params: status, search, page, limit
 */
router.get('/', async (req, res) => {
    try {
        const { status, tipo, search, page = 1, limit = 50 } = req.query;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (status) {
            whereConditions.push(`cs.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (tipo) {
            whereConditions.push(`cs.tipo = $${paramIndex}`);
            params.push(tipo);
            paramIndex++;
        }

        if (search) {
            whereConditions.push(
                `(cs.nome ILIKE $${paramIndex} OR cs.empresa ILIKE $${paramIndex} OR cs.email ILIKE $${paramIndex})`
            );
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT
                cs.*,
                u.nome AS atendido_por_nome,
                c.nome AS cliente_nome
            FROM contatos_site cs
            LEFT JOIN usuarios u ON cs.atendido_por = u.id
            LEFT JOIN clientes c ON cs.cliente_id = c.id
            ${whereClause}
            ORDER BY cs.recebido_em DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const result = await req.db.query(query, params);

        // Contagem total
        const countParams = params.slice(0, -2);
        const countResult = await req.db.query(
            `SELECT COUNT(*) FROM contatos_site cs ${whereClause}`,
            countParams
        );

        // Contagem de "novos" para badge no menu
        const novosResult = await req.db.query(
            `SELECT COUNT(*) FROM contatos_site WHERE status = 'novo' AND tipo = 'contato'`
        );

        return res.json({
            contatos: result.rows,
            total: parseInt(countResult.rows[0].count),
            novos: parseInt(novosResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('[CONTATOS] Erro ao listar contatos:', error.message);
        return res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * GET /api/contatos/novos/count
 * Retorna apenas a contagem de contatos novos (para badge do menu)
 */
router.get('/novos/count', async (req, res) => {
    try {
        const result = await req.db.query(
            `SELECT COUNT(*) FROM contatos_site WHERE status = 'novo' AND tipo = 'contato'`
        );
        return res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        return res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * GET /api/contatos/:id
 * Detalhe de um contato
 */
router.get('/:id', idValidation, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(
            `SELECT
                cs.*,
                u.nome AS atendido_por_nome,
                c.nome AS cliente_nome
             FROM contatos_site cs
             LEFT JOIN usuarios u ON cs.atendido_por = u.id
             LEFT JOIN clientes c ON cs.cliente_id = c.id
             WHERE cs.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error('[CONTATOS] Erro ao buscar contato:', error.message);
        return res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * PATCH /api/contatos/:id/status
 * Atualiza status e observações internas
 * Body: { status, observacoes_internas }
 */
router.patch('/:id/status', idValidation, activityLogMiddleware('atualizar', 'contato'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, observacoes_internas } = req.body;

        const statusValidos = ['pendente', 'novo', 'em_atendimento', 'convertido', 'descartado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({ error: `Status inválido. Use: ${statusValidos.join(', ')}` });
        }

        const result = await req.db.query(
            `UPDATE contatos_site
             SET status = $1,
                 observacoes_internas = COALESCE($2, observacoes_internas),
                 atendido_por = $3,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [status, observacoes_internas || null, req.userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        console.log(`[CONTATOS] ID ${id} atualizado para status "${status}" por usuário ${req.userId}`);
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('[CONTATOS] Erro ao atualizar status:', error.message);
        return res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * GET /api/contatos/:id/historico
 * Histórico de ações registradas no activity_logs para este contato
 */
router.get('/:id/historico', idValidation, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(
            `SELECT
                id,
                user_nome   AS usuario_nome,
                action      AS acao,
                details     AS detalhes,
                created_at
             FROM activity_logs
             WHERE entity = 'contato' AND entity_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [id]
        );

        return res.json({ historico: result.rows });
    } catch (error) {
        console.error('[CONTATOS] Erro ao buscar histórico:', error.message);
        return res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * POST /api/contatos/:id/email
 * Envia email de resposta para o contato via SES
 * Body: { assunto, corpo }
 */
router.post('/:id/email', idValidation, emailUpload.array('arquivos', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { assunto, corpo } = req.body;

        if (!assunto || !corpo) {
            return res.status(400).json({ error: 'Campos assunto e corpo são obrigatórios' });
        }

        const contatoResult = await req.db.query(
            `SELECT nome, email FROM contatos_site WHERE id = $1`,
            [id]
        );

        if (contatoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        const { nome, email } = contatoResult.rows[0];

        if (!email) {
            return res.status(400).json({ error: 'Este contato não possui email cadastrado' });
        }

        const remetenteResult = await req.db.query(
            `SELECT nome FROM usuarios WHERE id = $1`,
            [req.userId]
        );
        const remetenteNome = remetenteResult.rows[0]?.nome || 'Equipe Quatrelati';

        await sendReplyEmail(email, nome, assunto, corpo, remetenteNome, req.files || []);

        // Registrar no activity_log via helper (nomes de colunas corretos)
        await logActivity(req.db, {
            userId: req.userId,
            userNome: remetenteNome,
            userNivel: req.userNivel || 'desconhecido',
            action: 'email_enviado',
            entity: 'contato',
            entityId: parseInt(id),
            entityName: nome,
            details: { assunto, corpo, num_anexos: (req.files || []).length || undefined },
            ipAddress: req.ip || null,
            userAgent: req.get('User-Agent'),
        });

        const numAnexos = (req.files || []).length;
        console.log(`[CONTATOS] Email enviado para ${email} pelo usuário ${req.userId}${numAnexos ? ` (${numAnexos} anexo(s))` : ''}`);
        return res.json({ success: true });
    } catch (error) {
        console.error('[CONTATOS] Erro ao enviar email:', error.message);
        return res.status(500).json({ error: 'Erro interno ao enviar email' });
    }
});

/**
 * POST /api/contatos/:id/converter
 * Converte contato em cliente (operação atômica com transação)
 * Body: { nome, razao_social, cnpj_cpf, email, telefone, observacoes, vendedor_id }
 */
router.post('/:id/converter', idValidation, activityLogMiddleware('converter', 'contato'), async (req, res) => {
    const client = await req.db.connect();
    try {
        const { id } = req.params;
        const {
            nome,
            razao_social,
            cnpj_cpf,
            email,
            telefone,
            observacoes,
            vendedor_id
        } = req.body;

        if (!nome) {
            client.release();
            return res.status(400).json({ error: 'Nome é obrigatório para criar cliente' });
        }

        await client.query('BEGIN');

        // Verificar se contato existe e não foi convertido ainda
        const contatoResult = await client.query(
            `SELECT * FROM contatos_site WHERE id = $1 FOR UPDATE`,
            [id]
        );

        if (contatoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        const contato = contatoResult.rows[0];

        if (contato.status === 'convertido') {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({ error: 'Contato já foi convertido em cliente' });
        }

        // Criar cliente
        const clienteResult = await client.query(
            `INSERT INTO clientes (nome, razao_social, cnpj_cpf, email, telefone, observacoes, created_by, vendedor_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, nome`,
            [
                nome.trim(),
                razao_social ? razao_social.trim() : null,
                cnpj_cpf ? cnpj_cpf.trim() : null,
                email ? email.trim().toLowerCase() : null,
                telefone ? telefone.trim() : null,
                observacoes ? observacoes.trim() : null,
                req.userId,
                vendedor_id || null
            ]
        );

        const novoCliente = clienteResult.rows[0];

        // Atualizar contato para "convertido"
        await client.query(
            `UPDATE contatos_site
             SET status = 'convertido',
                 cliente_id = $1,
                 atendido_por = $2,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [novoCliente.id, req.userId, id]
        );

        await client.query('COMMIT');
        client.release();

        console.log(`[CONTATOS] ID ${id} convertido em cliente ID ${novoCliente.id}`);

        return res.status(201).json({
            success: true,
            cliente_id: novoCliente.id,
            cliente_nome: novoCliente.nome
        });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        console.error('[CONTATOS] Erro ao converter contato:', error.message);
        return res.status(500).json({ error: 'Erro interno' });
    }
});

/**
 * DELETE /api/contatos/:id
 * Apaga um contato permanentemente (apenas superadmin)
 */
router.delete('/:id', idValidation, activityLogMiddleware('apagar', 'contato'), async (req, res) => {
    if (req.userNivel !== 'superadmin') {
        return res.status(403).json({ error: 'Apenas superadmin pode apagar contatos' });
    }

    try {
        const { id } = req.params;

        const result = await req.db.query(
            `DELETE FROM contatos_site WHERE id = $1 RETURNING id, nome`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        console.log(`[CONTATOS] ID ${id} (${result.rows[0].nome}) apagado pelo superadmin ${req.userId}`);
        return res.json({ success: true });
    } catch (error) {
        console.error('[CONTATOS] Erro ao apagar contato:', error.message);
        return res.status(500).json({ error: 'Erro interno' });
    }
});

module.exports = router;
