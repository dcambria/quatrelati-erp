// =====================================================
// Rotas de Autenticação
// v1.3.0 - Rate limiting em endpoints sensíveis
// =====================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { loginValidation } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');
const {
    loginLimiter,
    forgotPasswordLimiter,
    whatsappRecoveryLimiter,
    verifyLimiter,
    resetPasswordLimiter
} = require('../middleware/rateLimit');

// Configuração do Twilio para WhatsApp (valores em .env)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

let twilioClient = null;
try {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('[TWILIO] Cliente inicializado com sucesso');
} catch (error) {
    console.error('[TWILIO] Erro ao inicializar cliente:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = '24h';
const REFRESH_EXPIRES_IN = '7d';

/**
 * POST /api/auth/login
 * Realiza login e retorna tokens
 */
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuário
        const result = await req.db.query(
            'SELECT id, nome, email, senha_hash, nivel, ativo, pode_visualizar_todos FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];

        // Verificar se usuário está ativo
        if (!user.ativo) {
            return res.status(401).json({ error: 'Usuário desativado' });
        }

        // Verificar senha
        const senhaValida = await bcrypt.compare(password, user.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar tokens
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, nivel: user.nivel },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { id: user.id, type: 'refresh' },
            JWT_REFRESH_SECRET,
            { expiresIn: REFRESH_EXPIRES_IN }
        );

        // Salvar refresh token no banco
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await req.db.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        );

        res.json({
            message: 'Login realizado com sucesso',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                nivel: user.nivel,
                pode_visualizar_todos: user.pode_visualizar_todos || false
            },
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRES_IN
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao realizar login' });
    }
});

/**
 * POST /api/auth/refresh
 * Renova o access token usando refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token não fornecido' });
        }

        // Verificar se token existe e é válido
        const tokenResult = await req.db.query(
            'SELECT rt.*, u.nome, u.email, u.nivel, u.ativo FROM refresh_tokens rt JOIN usuarios u ON rt.user_id = u.id WHERE rt.token = $1 AND rt.expires_at > NOW()',
            [refreshToken]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
        }

        const tokenData = tokenResult.rows[0];

        // Verificar se usuário ainda está ativo
        if (!tokenData.ativo) {
            await req.db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
            return res.status(401).json({ error: 'Usuário desativado' });
        }

        // Gerar novo access token
        const accessToken = jwt.sign(
            { id: tokenData.user_id, email: tokenData.email, nivel: tokenData.nivel },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            accessToken,
            expiresIn: JWT_EXPIRES_IN
        });
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        res.status(500).json({ error: 'Erro ao renovar token' });
    }
});

/**
 * POST /api/auth/logout
 * Invalida o refresh token
 */
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await req.db.query(
                'DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2',
                [refreshToken, req.userId]
            );
        }

        res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({ error: 'Erro ao realizar logout' });
    }
});

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await req.db.query(
            'SELECT id, nome, email, telefone, nivel, ativo, pode_visualizar_todos, created_at FROM usuarios WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

/**
 * PUT /api/auth/profile
 * Atualiza dados do perfil do usuário autenticado
 */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { nome, telefone } = req.body;

        if (!nome || nome.trim().length < 2) {
            return res.status(400).json({ error: 'Nome é obrigatório (mínimo 2 caracteres)' });
        }

        const result = await req.db.query(`
            UPDATE usuarios
            SET nome = $1, telefone = $2
            WHERE id = $3
            RETURNING id, nome, email, telefone, nivel, ativo, created_at
        `, [nome.trim(), telefone || null, req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({
            message: 'Perfil atualizado com sucesso',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Envia magic link para redefinir senha
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        // Buscar usuário
        const result = await req.db.query(
            'SELECT id, nome, email FROM usuarios WHERE email = $1 AND ativo = true',
            [email]
        );

        // Sempre retorna sucesso para não revelar se email existe
        if (result.rows.length === 0) {
            return res.json({ message: 'Se o email existir, enviaremos um link de acesso' });
        }

        const user = result.rows[0];

        // Gerar token único
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Salvar magic link
        await req.db.query(
            `INSERT INTO magic_links (user_id, token, type, expires_at)
             VALUES ($1, $2, 'password_reset', $3)`,
            [user.id, token, expiresAt]
        );

        const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/magic-link?token=${token}`;

        // Enviar email com magic link
        const emailService = require('../services/emailService');
        const emailResult = await emailService.sendMagicLinkEmail(user.email, user.nome, magicLink);

        console.log(`[MAGIC LINK] Email enviado para: ${user.email}`);

        res.json({
            message: 'Se o email existir, enviaremos um link de acesso',
            // Em dev, retorna o link para facilitar testes
            ...(process.env.NODE_ENV !== 'production' && {
                devLink: magicLink,
                ...(emailResult.previewUrl && { emailPreview: emailResult.previewUrl })
            })
        });
    } catch (error) {
        console.error('Erro ao gerar magic link:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
});

/**
 * POST /api/auth/verify-magic-link
 * Valida magic link e retorna tokens
 */
router.post('/verify-magic-link', verifyLimiter, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token é obrigatório' });
        }

        // Buscar magic link válido
        const result = await req.db.query(
            `SELECT ml.*, u.id as user_id, u.nome, u.email, u.nivel
             FROM magic_links ml
             JOIN usuarios u ON ml.user_id = u.id
             WHERE ml.token = $1
             AND ml.used_at IS NULL
             AND ml.expires_at > NOW()
             AND u.ativo = true`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Link inválido ou expirado' });
        }

        const magicLink = result.rows[0];

        // Marcar como usado
        await req.db.query(
            'UPDATE magic_links SET used_at = NOW() WHERE id = $1',
            [magicLink.id]
        );

        // Gerar tokens
        const accessToken = jwt.sign(
            { id: magicLink.user_id, email: magicLink.email, nivel: magicLink.nivel },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { id: magicLink.user_id, type: 'refresh' },
            JWT_REFRESH_SECRET,
            { expiresIn: REFRESH_EXPIRES_IN }
        );

        // Salvar refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await req.db.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [magicLink.user_id, refreshToken, expiresAt]
        );

        res.json({
            message: 'Login realizado com sucesso',
            user: {
                id: magicLink.user_id,
                nome: magicLink.nome,
                email: magicLink.email,
                nivel: magicLink.nivel
            },
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRES_IN
        });
    } catch (error) {
        console.error('Erro ao validar magic link:', error);
        res.status(500).json({ error: 'Erro ao validar link' });
    }
});

/**
 * PUT /api/auth/change-password
 * Altera a senha do usuário autenticado
 */
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Senhas são obrigatórias' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Nova senha deve ter no mínimo 8 caracteres' });
        }

        // Buscar usuário
        const result = await req.db.query(
            'SELECT senha_hash FROM usuarios WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual
        const senhaValida = await bcrypt.compare(currentPassword, result.rows[0].senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        // Hash da nova senha
        const novaSenhaHash = await bcrypt.hash(newPassword, 10);

        // Atualizar senha
        await req.db.query(
            'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
            [novaSenhaHash, req.userId]
        );

        // Invalidar todos os refresh tokens do usuário
        await req.db.query(
            'DELETE FROM refresh_tokens WHERE user_id = $1',
            [req.userId]
        );

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

/**
 * POST /api/auth/forgot-password-whatsapp
 * Envia código de recuperação via WhatsApp (Twilio)
 */
router.post('/forgot-password-whatsapp', whatsappRecoveryLimiter, async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Telefone é obrigatório' });
        }

        // Normalizar telefone (remover espaços, parênteses, hífens)
        const normalizedPhone = phone.replace(/[\s\(\)\-\+]/g, '');

        // Buscar usuário por telefone
        const result = await req.db.query(
            `SELECT id, nome, email, telefone FROM usuarios
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, ' ', ''), '(', ''), ')', ''), '-', ''), '+', '') LIKE $1
             AND ativo = true`,
            [`%${normalizedPhone.slice(-9)}`] // Buscar pelos últimos 9 dígitos
        );

        // Sempre retorna sucesso para não revelar se usuário existe
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Se o número estiver cadastrado, você receberá um código via WhatsApp'
            });
        }

        const user = result.rows[0];

        // Gerar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Salvar código no banco
        await req.db.query(
            `INSERT INTO magic_links (user_id, token, type, expires_at)
             VALUES ($1, $2, 'whatsapp_recovery', $3)`,
            [user.id, code, expiresAt]
        );

        // Formatar número para o Twilio (precisa ser no formato +5511999999999)
        let twilioPhone = user.telefone.replace(/[\s\(\)\-]/g, '');
        if (!twilioPhone.startsWith('+')) {
            twilioPhone = '+' + twilioPhone;
        }

        // Enviar mensagem via Twilio
        if (twilioClient) {
            try {
                const messageResult = await twilioClient.messages.create({
                    body: `*Quatrelati* - Recuperação de Senha\n\nOlá ${user.nome.split(' ')[0]}!\n\nSeu código de verificação é: *${code}*\n\nEste código expira em 15 minutos.\n\nSe você não solicitou esta recuperação, ignore esta mensagem.`,
                    from: TWILIO_WHATSAPP_FROM,
                    to: `whatsapp:${twilioPhone}`
                });

                console.log(`[TWILIO] Mensagem enviada para ${twilioPhone}: ${messageResult.sid}`);

                res.json({
                    success: true,
                    message: 'Código enviado para seu WhatsApp',
                    userPhone: `****${twilioPhone.slice(-4)}`,
                    email: user.email // Para usar na verificação do código
                });
            } catch (twilioError) {
                console.error('[TWILIO] Erro ao enviar mensagem:', twilioError.message);

                // Se falhar o Twilio, retorna erro mas mantém o código gerado
                res.status(500).json({
                    error: 'Erro ao enviar mensagem WhatsApp. Verifique se o número está correto e tente novamente.',
                    details: process.env.NODE_ENV !== 'production' ? twilioError.message : undefined
                });
            }
        } else {
            // Fallback: log do código em dev
            console.log(`[WHATSAPP RECOVERY] Código gerado para: ${user.email} - Código: ${code}`);

            if (process.env.NODE_ENV !== 'production') {
                res.json({
                    success: true,
                    message: 'Código enviado (modo desenvolvimento)',
                    devCode: code, // Apenas em desenvolvimento
                    email: user.email
                });
            } else {
                res.status(500).json({ error: 'Serviço de WhatsApp não configurado' });
            }
        }
    } catch (error) {
        console.error('Erro ao gerar recuperação WhatsApp:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
});

/**
 * POST /api/auth/verify-whatsapp-code
 * Valida código de recuperação do WhatsApp
 */
router.post('/verify-whatsapp-code', verifyLimiter, async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: 'Email e código são obrigatórios' });
        }

        // Buscar código válido
        const result = await req.db.query(
            `SELECT ml.*, u.id as user_id, u.nome, u.email, u.nivel
             FROM magic_links ml
             JOIN usuarios u ON ml.user_id = u.id
             WHERE ml.token = $1
             AND ml.type = 'whatsapp_recovery'
             AND ml.used_at IS NULL
             AND ml.expires_at > NOW()
             AND u.email = $2
             AND u.ativo = true`,
            [code, email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Código inválido ou expirado' });
        }

        const recovery = result.rows[0];

        // Marcar como usado
        await req.db.query(
            'UPDATE magic_links SET used_at = NOW() WHERE id = $1',
            [recovery.id]
        );

        // Gerar token de redefinição de senha (válido por 10 minutos)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

        await req.db.query(
            `INSERT INTO magic_links (user_id, token, type, expires_at)
             VALUES ($1, $2, 'password_reset', $3)`,
            [recovery.user_id, resetToken, resetExpires]
        );

        res.json({
            message: 'Código verificado com sucesso',
            resetToken,
            user: {
                nome: recovery.nome,
                email: recovery.email
            }
        });
    } catch (error) {
        console.error('Erro ao verificar código:', error);
        res.status(500).json({ error: 'Erro ao verificar código' });
    }
});

/**
 * POST /api/auth/reset-password
 * Redefine a senha usando token de recuperação
 */
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
        }

        // Buscar token válido
        const result = await req.db.query(
            `SELECT ml.*, u.id as user_id
             FROM magic_links ml
             JOIN usuarios u ON ml.user_id = u.id
             WHERE ml.token = $1
             AND ml.type = 'password_reset'
             AND ml.used_at IS NULL
             AND ml.expires_at > NOW()
             AND u.ativo = true`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Token inválido ou expirado' });
        }

        const recovery = result.rows[0];

        // Hash da nova senha
        const senhaHash = await bcrypt.hash(newPassword, 10);

        // Atualizar senha
        await req.db.query(
            'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
            [senhaHash, recovery.user_id]
        );

        // Marcar token como usado
        await req.db.query(
            'UPDATE magic_links SET used_at = NOW() WHERE id = $1',
            [recovery.id]
        );

        // Invalidar todos os refresh tokens
        await req.db.query(
            'DELETE FROM refresh_tokens WHERE user_id = $1',
            [recovery.user_id]
        );

        res.json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
});

module.exports = router;
