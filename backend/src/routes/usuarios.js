// =====================================================
// Rotas de Usuários
// v1.4.0 - Admin pode gerenciar usuários (exceto superadmin)
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { usuarioValidation, usuarioUpdateValidation, idValidation } = require('../middleware/validation');
const { activityLogMiddleware } = require('../middleware/activityLog');
const emailService = require('../services/emailService');

// Todas as rotas requerem autenticação e nível admin ou superadmin
router.use(authMiddleware);
router.use(adminOnly);

/**
 * GET /api/usuarios
 * Lista todos os usuários
 */
router.get('/', async (req, res) => {
    try {
        const { ativo } = req.query;

        let whereClause = '';
        let params = [];

        if (ativo !== undefined) {
            whereClause = 'WHERE ativo = $1';
            params.push(ativo === 'true');
        }

        const result = await req.db.query(`
            SELECT id, nome, email, telefone, nivel, ativo, created_at, updated_at
            FROM usuarios
            ${whereClause}
            ORDER BY nome ASC
        `, params);

        res.json({ usuarios: result.rows });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

/**
 * GET /api/usuarios/:id
 * Detalhes de um usuário
 */
router.get('/:id', idValidation, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(`
            SELECT id, nome, email, telefone, nivel, ativo, created_at, updated_at
            FROM usuarios
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ usuario: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

/**
 * POST /api/usuarios
 * Criar novo usuário
 */
router.post('/', usuarioValidation, activityLogMiddleware('criar', 'usuario'), async (req, res) => {
    try {
        const { nome, email, telefone, senha, nivel = 'vendedor' } = req.body;

        // Verificar se email já existe
        const emailExiste = await req.db.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (emailExiste.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        const result = await req.db.query(`
            INSERT INTO usuarios (nome, email, telefone, senha_hash, nivel)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, nome, email, telefone, nivel, ativo, created_at
        `, [nome, email, telefone || null, senhaHash, nivel]);

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

/**
 * PUT /api/usuarios/:id
 * Atualizar usuário
 */
router.put('/:id', idValidation, usuarioUpdateValidation, activityLogMiddleware('atualizar', 'usuario'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone, senha, nivel, ativo } = req.body;

        // Verificar se usuário existe
        const usuarioAtual = await req.db.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [id]
        );

        if (usuarioAtual.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar se está tentando desativar o próprio usuário
        if (parseInt(id) === req.userId && ativo === false) {
            return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário' });
        }

        // Admin não pode editar superadmin
        if (usuarioAtual.rows[0].nivel === 'superadmin' && req.userNivel !== 'superadmin') {
            return res.status(403).json({ error: 'Apenas superadmin pode editar outro superadmin' });
        }

        // Admin não pode promover a superadmin
        if (nivel === 'superadmin' && req.userNivel !== 'superadmin') {
            return res.status(403).json({ error: 'Apenas superadmin pode promover usuários a superadmin' });
        }

        // Verificar se email já existe (se foi alterado)
        if (email && email !== usuarioAtual.rows[0].email) {
            const emailExiste = await req.db.query(
                'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
                [email, id]
            );

            if (emailExiste.rows.length > 0) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }
        }

        // Montar update
        let senhaHash = usuarioAtual.rows[0].senha_hash;
        if (senha) {
            senhaHash = await bcrypt.hash(senha, 10);
        }

        const result = await req.db.query(`
            UPDATE usuarios
            SET nome = COALESCE($1, nome),
                email = COALESCE($2, email),
                telefone = COALESCE($3, telefone),
                senha_hash = $4,
                nivel = COALESCE($5, nivel),
                ativo = COALESCE($6, ativo)
            WHERE id = $7
            RETURNING id, nome, email, telefone, nivel, ativo, created_at, updated_at
        `, [nome, email, telefone, senhaHash, nivel, ativo, id]);

        res.json({
            message: 'Usuário atualizado com sucesso',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

/**
 * DELETE /api/usuarios/:id
 * Soft delete do usuário
 */
router.delete('/:id', idValidation, activityLogMiddleware('excluir', 'usuario'), async (req, res) => {
    try {
        const { id } = req.params;

        // Não permitir excluir o próprio usuário
        if (parseInt(id) === req.userId) {
            return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
        }

        // Verificar se usuário existe
        const usuarioAtual = await req.db.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [id]
        );

        if (usuarioAtual.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Admin não pode excluir superadmin
        if (usuarioAtual.rows[0].nivel === 'superadmin' && req.userNivel !== 'superadmin') {
            return res.status(403).json({ error: 'Apenas superadmin pode excluir outro superadmin' });
        }

        // Verificar se usuário criou pedidos
        const pedidosResult = await req.db.query(
            'SELECT COUNT(*) as total FROM pedidos WHERE created_by = $1',
            [id]
        );

        if (parseInt(pedidosResult.rows[0].total) > 0) {
            // Soft delete se criou pedidos
            const result = await req.db.query(`
                UPDATE usuarios SET ativo = false WHERE id = $1
                RETURNING id, nome, email, nivel, ativo
            `, [id]);

            // Invalidar refresh tokens
            await req.db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);

            return res.json({
                message: 'Usuário desativado (possui pedidos vinculados)',
                usuario: result.rows[0]
            });
        }

        // Hard delete se não criou pedidos
        await req.db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);

        const result = await req.db.query(
            'DELETE FROM usuarios WHERE id = $1 RETURNING id, nome, email',
            [id]
        );

        res.json({
            message: 'Usuário excluído com sucesso',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

/**
 * POST /api/usuarios/:id/invite
 * Envia email de convite para um usuário existente
 */
router.post('/:id/invite', idValidation, activityLogMiddleware('reenviar_convite', 'usuario'), async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar usuário
        const result = await req.db.query(
            'SELECT id, nome, email, ativo FROM usuarios WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = result.rows[0];

        if (!user.ativo) {
            return res.status(400).json({ error: 'Não é possível enviar convite para usuário inativo' });
        }

        // Gerar token único (48 horas de validade)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        // Salvar magic link do tipo invite
        await req.db.query(
            `INSERT INTO magic_links (user_id, token, type, expires_at)
             VALUES ($1, $2, 'invite', $3)`,
            [user.id, token, expiresAt]
        );

        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/magic-link?token=${token}`;

        // Enviar email de convite
        await emailService.sendInviteEmail(user.email, user.nome, inviteLink);

        console.log(`[INVITE] Convite enviado para: ${user.email}`);

        res.json({
            message: 'Convite enviado com sucesso',
            ...(process.env.NODE_ENV !== 'production' && { devLink: inviteLink })
        });
    } catch (error) {
        console.error('Erro ao enviar convite:', error);
        res.status(500).json({ error: 'Erro ao enviar convite' });
    }
});

/**
 * POST /api/usuarios/invite
 * Cria usuário e envia convite por email
 */
router.post('/invite', activityLogMiddleware('enviar_convite', 'usuario'), async (req, res) => {
    try {
        const { nome, email, nivel = 'vendedor' } = req.body;

        if (!nome || nome.length < 2) {
            return res.status(400).json({ error: 'Nome deve ter no mínimo 2 caracteres' });
        }

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Verificar se email já existe
        const emailExiste = await req.db.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (emailExiste.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Criar usuário com senha temporária (será redefinida pelo convite)
        const senhaTemporaria = crypto.randomBytes(32).toString('hex');
        const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

        const result = await req.db.query(`
            INSERT INTO usuarios (nome, email, senha_hash, nivel)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nome, email, nivel, ativo, created_at
        `, [nome, email, senhaHash, nivel]);

        const user = result.rows[0];

        // Gerar token de convite (48 horas)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await req.db.query(
            `INSERT INTO magic_links (user_id, token, type, expires_at)
             VALUES ($1, $2, 'invite', $3)`,
            [user.id, token, expiresAt]
        );

        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/magic-link?token=${token}`;

        // Enviar email de convite
        await emailService.sendInviteEmail(user.email, user.nome, inviteLink);

        console.log(`[INVITE] Usuário criado e convite enviado para: ${user.email}`);

        res.status(201).json({
            message: 'Usuário criado e convite enviado com sucesso',
            usuario: user,
            ...(process.env.NODE_ENV !== 'production' && { devLink: inviteLink })
        });
    } catch (error) {
        console.error('Erro ao criar usuário com convite:', error);
        res.status(500).json({ error: 'Erro ao criar usuário com convite' });
    }
});

module.exports = router;
