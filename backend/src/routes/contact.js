/**
 * ===========================================
 * Quatrelati - Rota de Contato Site Institucional
 * POST /api/contact
 * ===========================================
 */

const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../services/emailService');

router.post('/', async (req, res) => {
    const { nome, empresa, email, telefone, mensagem } = req.body;

    if (!nome || !empresa || !email || !telefone || !mensagem) {
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'E-mail inválido.' });
    }

    try {
        await sendContactEmail({ nome, empresa, email, telefone, mensagem });
        return res.json({ success: true, message: 'Solicitação enviada! Em breve entraremos em contato.' });
    } catch (error) {
        console.error('[CONTACT] Erro:', error.message);
        return res.status(500).json({ success: false, error: 'Erro ao enviar solicitação. Tente novamente.' });
    }
});

module.exports = router;
