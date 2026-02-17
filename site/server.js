/**
 * Landing Page Quatrelati - Server
 * Micro servidor Express para processar formulário de contato
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { sendContactEmail } = require('./contactEmail');

const app = express();
const PORT = process.env.PORT || 3100;

// Confiar em headers do proxy reverso (Nginx/Cloudflare)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve index.html e assets

// Rate limiting: max 5 requests por 15 minutos
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Muitas solicitações. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rota de health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'quatrelati-landing',
        timestamp: new Date().toISOString()
    });
});

// Rota raiz - serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Rota de contato
app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
        const { nome, empresa, email, telefone, mensagem } = req.body;

        // Validação básica
        if (!nome || !empresa || !telefone || !mensagem) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        // Validação de formato
        if (nome.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Nome deve ter pelo menos 2 caracteres'
            });
        }

        if (empresa.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Nome da empresa deve ter pelo menos 2 caracteres'
            });
        }

        if (telefone.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Telefone inválido'
            });
        }

        if (mensagem.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Mensagem deve ter pelo menos 10 caracteres'
            });
        }

        // Enviar email
        console.log(`[SERVER] 📧 Processando solicitação de: ${nome} (${empresa})`);
        await sendContactEmail({ nome, empresa, email: email || '', telefone, mensagem });

        // Registrar contato no ERP (fire-and-forget)
        const erpUrl = process.env.ERP_API_URL;
        const erpApiKey = process.env.ERP_API_KEY;
        if (erpUrl && erpApiKey) {
            fetch(`${erpUrl}/api/contatos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': erpApiKey
                },
                body: JSON.stringify({ nome, empresa, email: email || '', telefone, mensagem })
            })
            .then(r => r.ok
                ? console.log('[ERP] ✅ Contato registrado no ERP')
                : console.warn('[ERP] ⚠️ ERP retornou erro:', r.status)
            )
            .catch(err => console.error('[ERP] ❌ Falha ao contatar ERP:', err.message));
        } else {
            console.warn('[ERP] ⚠️ ERP_API_URL ou ERP_API_KEY não configurados — contato não enviado ao ERP');
        }

        res.json({
            success: true,
            message: 'Solicitação enviada com sucesso! Entraremos em contato em breve.'
        });

    } catch (error) {
        console.error('[SERVER] ❌ Erro ao processar contato:', error);

        // Mensagens de erro mais específicas
        let errorMessage = 'Erro ao enviar solicitação. Tente novamente ou entre em contato via WhatsApp.';

        if (error.name === 'MessageRejected') {
            errorMessage = 'Erro no envio do email. Por favor, entre em contato via WhatsApp.';
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Middleware de erro 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Rota não encontrada'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('');
    console.log('📦🧈 ================================');
    console.log('   Quatrelati Alimentos');
    console.log('   Grupo Três Marias - 40 anos');
    console.log('📦🧈 ================================');
    console.log('');
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📧 Emails serão enviados para: ${process.env.CONTACT_EMAIL}`);
    console.log(`🔒 Rate limit: 5 requests / 15 minutos`);
    console.log('');
});
