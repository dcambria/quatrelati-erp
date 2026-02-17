/**
 * Contact Email Service - Landing Page Quatrelati
 * Envia emails de solicitação de orçamento via AWS SES
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Configurar cliente SES
const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'daniel.cambria@bureau-it.com';
const FROM_NAME = 'Quatrelati Landing Page';

async function sendContactEmail(contactData) {
    const { nome, empresa, telefone, mensagem } = contactData;
    const to = process.env.CONTACT_EMAIL || 'wilson@laticinioquatrelati.com.br';

    // Limpar telefone para WhatsApp (remover caracteres não numéricos)
    const telefoneWhatsApp = telefone.replace(/\D/g, '');

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #F5C518 0%, #D4A017 100%); border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; color: #fff; font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">🧈 Nova Solicitação de Orçamento</h1>
                        </td>
                    </tr>

                    <!-- Conteúdo -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 18px;">Dados do Contato</h2>

                            <p style="margin: 8px 0; color: #6B7280; font-size: 15px;">
                                <strong style="color: #374151;">Nome:</strong> ${nome}
                            </p>
                            <p style="margin: 8px 0; color: #6B7280; font-size: 15px;">
                                <strong style="color: #374151;">Empresa:</strong> ${empresa}
                            </p>
                            <p style="margin: 8px 0; color: #6B7280; font-size: 15px;">
                                <strong style="color: #374151;">Telefone:</strong> ${telefone}
                            </p>

                            <hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;" />

                            <h3 style="margin: 0 0 12px; color: #1F2937; font-size: 16px;">Mensagem:</h3>
                            <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${mensagem}</p>

                            <hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;" />

                            <!-- Fichas Técnicas -->
                            <h3 style="margin: 0 0 12px; color: #1F2937; font-size: 16px;">📄 Documentos Anexados Automaticamente:</h3>
                            <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 2;">
                                <li><a href="${process.env.SITE_URL || 'http://localhost:3100'}/assets/fichas-tecnicas/Manteiga%20Extra%20Sem%20Sal%20Quatrelati.pdf" style="color: #2563EB; text-decoration: none;">Ficha Técnica - Manteiga Extra Sem Sal</a></li>
                                <li><a href="${process.env.SITE_URL || 'http://localhost:3100'}/assets/fichas-tecnicas/Cadastro%20Quatrelati.pdf" style="color: #2563EB; text-decoration: none;">Dados Cadastrais Quatrelati</a></li>
                            </ul>

                            <!-- Botão WhatsApp -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 32px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://wa.me/55${telefoneWhatsApp}?text=Olá%20${encodeURIComponent(nome)},%20recebi%20sua%20solicitação%20de%20orçamento%20pela%20nossa%20landing%20page.%20Vamos%20conversar%20sobre%20os%20produtos%20Quatrelati!"
                                           style="display: inline-block; padding: 14px 40px; background: #25D366; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 6px rgba(37, 211, 102, 0.3);">
                                            📱 Responder via WhatsApp
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">
                                <strong>Laticínio Quatrelati</strong> — Qualidade do campo, amor à sua receita! 🐄
                            </p>
                            <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                                Email enviado automaticamente via Landing Page
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const textBody = `
Nova Solicitação de Orçamento - Laticínio Quatrelati

Nome: ${nome}
Empresa: ${empresa}
Telefone: ${telefone}

Mensagem:
${mensagem}

--
Documentos Quatrelati:
- Ficha Técnica - Manteiga Extra: ${process.env.SITE_URL || 'http://localhost:3100'}/assets/fichas-tecnicas/Manteiga%20Extra%20Sem%20Sal%20Quatrelati.pdf
- Dados Cadastrais: ${process.env.SITE_URL || 'http://localhost:3100'}/assets/fichas-tecnicas/Cadastro%20Quatrelati.pdf

Responder via WhatsApp: https://wa.me/55${telefoneWhatsApp}

Quatrelati Alimentos — Grupo Três Marias 🧈🐄
    `;

    const params = {
        Source: `${FROM_NAME} <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
            Subject: { Data: `Nova Solicitação de Orçamento - ${empresa}`, Charset: 'UTF-8' },
            Body: {
                Html: { Data: htmlBody, Charset: 'UTF-8' },
                Text: { Data: textBody, Charset: 'UTF-8' }
            }
        }
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);
        console.log(`[EMAIL] ✅ Solicitação enviada para: ${to} | MessageID: ${response.MessageId}`);
        return { messageId: response.MessageId, success: true };
    } catch (error) {
        console.error('[EMAIL] ❌ Erro ao enviar solicitação:', error.message);
        throw error;
    }
}

module.exports = {
    sendContactEmail
};
