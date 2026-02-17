/**
 * ===========================================
 * Quatrelati - Email Service
 * Envio de emails via AWS SES
 * v2.3.1 - Corrige botão em branco no email de convite (dark mode)
 * ===========================================
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Configurar cliente SES (usa IAM role automaticamente em EC2/Docker)
const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

// Email remetente (deve estar verificado no SES)
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'daniel.cambria@bureau-it.com';
const FROM_NAME = 'Quatrelati';

// Dominios de teste que nao devem receber emails reais
const TEST_DOMAINS = ['teste.local', 'test.local', 'exemplo.local', 'example.local'];

/**
 * Verifica se o email eh de teste e deve ser pulado
 */
function isTestEmail(email) {
    if (!email) return false;
    const domain = email.split('@')[1]?.toLowerCase();
    return TEST_DOMAINS.some(testDomain => domain?.endsWith(testDomain));
}

/**
 * Envia email de Magic Link via AWS SES
 */
async function sendMagicLinkEmail(to, userName, magicLinkUrl) {
    // Pular envio para emails de teste
    if (isTestEmail(to)) {
        console.log(`[EMAIL] Pulando envio de magic link para email de teste: ${to}`);
        return { skipped: true, reason: 'test_email' };
    }

    const firstName = userName.split(' ')[0];

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">

                    <!-- Header com logo -->
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #124EA6 0%, #0D3A7A 100%); border-radius: 16px 16px 0 0;">
                            <img src="https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-email.png" alt="Quatrelati" style="max-width: 180px; height: auto;" />
                        </td>
                    </tr>

                    <!-- Conteudo principal -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px;">
                            <!-- Icone de chave -->
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 50%; line-height: 64px;">
                                    <span style="font-size: 28px;">🔐</span>
                                </div>
                            </div>

                            <h1 style="margin: 0 0 8px; color: #1F2937; font-size: 22px; font-weight: 600; text-align: center;">
                                Ola, ${firstName}!
                            </h1>
                            <p style="margin: 0 0 32px; color: #6B7280; font-size: 15px; line-height: 1.6; text-align: center;">
                                Recebemos uma solicitacao de acesso ao sistema.<br/>
                                Clique no botao abaixo para entrar.
                            </p>

                            <!-- Botao -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <a href="${magicLinkUrl}"
                                           style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #124EA6 0%, #1565C0 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(18, 78, 166, 0.35);">
                                            Acessar Sistema
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info de expiracao -->
                            <div style="margin-top: 32px; padding: 16px 20px; background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #D4A017;">
                                <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.5;">
                                    <strong>⏱ Expira em 15 minutos</strong><br/>
                                    Este link so pode ser usado uma vez.
                                </p>
                            </div>

                            <!-- Divisor -->
                            <hr style="margin: 32px 0; border: none; border-top: 1px solid #E5E7EB;" />

                            <!-- Link alternativo -->
                            <p style="margin: 0 0 8px; color: #9CA3AF; font-size: 12px; text-align: center;">
                                Se o botao nao funcionar, copie e cole este link:
                            </p>
                            <p style="margin: 0; padding: 12px; background-color: #F3F4F6; border-radius: 6px; color: #124EA6; font-size: 11px; word-break: break-all; text-align: center;">
                                ${magicLinkUrl}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 16px 16px; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0 0 4px; color: #6B7280; font-size: 13px; font-weight: 500;">
                                Laticinio Quatrelati
                            </p>
                            <p style="margin: 0 0 16px; color: #9CA3AF; font-size: 12px;">
                                Fabricando Manteiga para Industria e Food Service
                            </p>
                            <p style="margin: 0; color: #D1D5DB; font-size: 11px;">
                                Se voce nao solicitou este acesso, ignore este email.
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
Ola, ${firstName}!

Recebemos uma solicitacao de acesso ao sistema Quatrelati.

Clique no link abaixo para entrar:
${magicLinkUrl}

IMPORTANTE: Este link expira em 15 minutos e so pode ser usado uma vez.

Se voce nao solicitou este acesso, ignore este email.

--
Laticinio Quatrelati
Fabricando Manteiga para Industria e Food Service
    `;

    const params = {
        Source: `${FROM_NAME} <${FROM_EMAIL}>`,
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Subject: {
                Data: 'Seu link de acesso - Quatrelati',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: htmlBody,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: textBody,
                    Charset: 'UTF-8',
                },
            },
        },
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);

        console.log(`[EMAIL] Enviado via AWS SES para: ${to}`);
        console.log(`[EMAIL] Message ID: ${response.MessageId}`);

        return { messageId: response.MessageId };
    } catch (error) {
        console.error('[EMAIL] Erro ao enviar via AWS SES:', error.message);
        throw error;
    }
}

/**
 * Envia email de convite para novo usuário via AWS SES
 */
async function sendInviteEmail(to, userName, inviteLinkUrl) {
    // Pular envio para emails de teste
    if (isTestEmail(to)) {
        console.log(`[EMAIL] Pulando envio de convite para email de teste: ${to}`);
        return { skipped: true, reason: 'test_email' };
    }

    const firstName = userName.split(' ')[0];

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">

                    <!-- Header com logo -->
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #124EA6 0%, #0D3A7A 100%); border-radius: 16px 16px 0 0;">
                            <img src="https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-email.png" alt="Quatrelati" style="max-width: 180px; height: auto;" />
                        </td>
                    </tr>

                    <!-- Conteudo principal -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px;">
                            <!-- Icone de boas-vindas -->
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%); border-radius: 50%; line-height: 64px;">
                                    <span style="font-size: 28px;">🎉</span>
                                </div>
                            </div>

                            <h1 style="margin: 0 0 8px; color: #1F2937; font-size: 22px; font-weight: 600; text-align: center;">
                                Bem-vindo, ${firstName}!
                            </h1>
                            <p style="margin: 0 0 32px; color: #6B7280; font-size: 15px; line-height: 1.6; text-align: center;">
                                Voce foi convidado para acessar o sistema de gestao do Laticinio Quatrelati.<br/>
                                Clique no botao abaixo para configurar sua senha e acessar o sistema.
                            </p>

                            <!-- Botao -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" bgcolor="#059669" style="background-color: #059669; border-radius: 8px;">
                                                    <a href="${inviteLinkUrl}"
                                                       target="_blank"
                                                       style="display: inline-block; padding: 14px 40px; background-color: #059669; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                                        <span style="color: #ffffff !important;">Configurar meu Acesso</span>
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info de expiracao -->
                            <div style="margin-top: 32px; padding: 16px 20px; background-color: #DBEAFE; border-radius: 8px; border-left: 4px solid #3B82F6;">
                                <p style="margin: 0; color: #1E40AF; font-size: 13px; line-height: 1.5;">
                                    <strong>⏱ Expira em 48 horas</strong><br/>
                                    Este link de convite so pode ser usado uma vez.
                                </p>
                            </div>

                            <!-- Divisor -->
                            <hr style="margin: 32px 0; border: none; border-top: 1px solid #E5E7EB;" />

                            <!-- Link alternativo -->
                            <p style="margin: 0 0 8px; color: #9CA3AF; font-size: 12px; text-align: center;">
                                Se o botao nao funcionar, copie e cole este link:
                            </p>
                            <p style="margin: 0; padding: 12px; background-color: #F3F4F6; border-radius: 6px; color: #124EA6; font-size: 11px; word-break: break-all; text-align: center;">
                                ${inviteLinkUrl}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; text-align: center; background-color: #F9FAFB; border-radius: 0 0 16px 16px; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0 0 4px; color: #6B7280; font-size: 13px; font-weight: 500;">
                                Laticinio Quatrelati
                            </p>
                            <p style="margin: 0 0 16px; color: #9CA3AF; font-size: 12px;">
                                Fabricando Manteiga para Industria e Food Service
                            </p>
                            <p style="margin: 0; color: #D1D5DB; font-size: 11px;">
                                Se voce nao esperava este convite, ignore este email.
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
Bem-vindo, ${firstName}!

Voce foi convidado para acessar o sistema de gestao do Laticinio Quatrelati.

Clique no link abaixo para configurar sua senha e acessar o sistema:
${inviteLinkUrl}

IMPORTANTE: Este link expira em 48 horas e so pode ser usado uma vez.

Se voce nao esperava este convite, ignore este email.

--
Laticinio Quatrelati
Fabricando Manteiga para Industria e Food Service
    `;

    const params = {
        Source: `${FROM_NAME} <${FROM_EMAIL}>`,
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Subject: {
                Data: 'Convite para o Sistema Quatrelati',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: htmlBody,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: textBody,
                    Charset: 'UTF-8',
                },
            },
        },
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);

        console.log(`[EMAIL] Convite enviado via AWS SES para: ${to}`);
        console.log(`[EMAIL] Message ID: ${response.MessageId}`);

        return { messageId: response.MessageId };
    } catch (error) {
        console.error('[EMAIL] Erro ao enviar convite via AWS SES:', error.message);
        throw error;
    }
}

/**
 * Envia email de contato do site institucional via AWS SES
 */
async function sendContactEmail({ nome, empresa, email, telefone, mensagem }) {
    const CONTATO_TO = process.env.CONTATO_EMAIL || 'daniel.cambria@gmail.com';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f0f4f8;">
  <table role="presentation" style="width:100%;background:#f0f4f8;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:520px;">
        <tr>
          <td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,#314c97 0%,#0d2436 100%);border-radius:16px 16px 0 0;">
            <img src="https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-email.png" alt="Quatrelati" style="max-width:180px;height:auto;">
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:40px;">
            <h2 style="margin:0 0 24px;color:#0d2436;font-size:20px;">Novo contato pelo site</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#6B7280;font-size:13px;width:120px;">Nome</td><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#1F2937;font-size:14px;font-weight:600;">${nome}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#6B7280;font-size:13px;">Empresa</td><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#1F2937;font-size:14px;">${empresa}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#6B7280;font-size:13px;">E-mail</td><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#314c97;font-size:14px;"><a href="mailto:${email}" style="color:#314c97;">${email}</a></td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#6B7280;font-size:13px;">Telefone</td><td style="padding:10px 0;border-bottom:1px solid #f3f3f3;color:#1F2937;font-size:14px;">${telefone}</td></tr>
              <tr><td style="padding:10px 0;color:#6B7280;font-size:13px;vertical-align:top;">Mensagem</td><td style="padding:10px 0;color:#1F2937;font-size:14px;line-height:1.6;">${mensagem.replace(/\n/g, '<br>')}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;text-align:center;background:#F9FAFB;border-radius:0 0 16px 16px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">Quatrelati Alimentos — Site Institucional</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const textBody = `Novo contato pelo site — Quatrelati\n\nNome: ${nome}\nEmpresa: ${empresa}\nE-mail: ${email}\nTelefone: ${telefone}\n\nMensagem:\n${mensagem}`;

    const params = {
        Source: `Quatrelati Site <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [CONTATO_TO] },
        ReplyToAddresses: [email],
        Message: {
            Subject: { Data: `Orçamento: ${nome} — ${empresa}`, Charset: 'UTF-8' },
            Body: {
                Html: { Data: htmlBody, Charset: 'UTF-8' },
                Text: { Data: textBody, Charset: 'UTF-8' },
            },
        },
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);
        console.log(`[EMAIL] Contato site enviado via SES. MessageId: ${response.MessageId}`);
        return { messageId: response.MessageId };
    } catch (error) {
        console.error('[EMAIL] Erro ao enviar contato via SES:', error.message);
        throw error;
    }
}

/**
 * Envia email de resposta para um contato do site
 * @param {string} to - Email do destinatário (contato)
 * @param {string} toName - Nome do contato
 * @param {string} assunto - Assunto do email
 * @param {string} corpo - Corpo em texto simples
 * @param {string} remetenteNome - Nome do atendente que enviou
 */
async function sendReplyEmail(to, toName, assunto, corpo, remetenteNome) {
    if (isTestEmail(to)) {
        console.log(`[EMAIL] Pulando reply para email de teste: ${to}`);
        return { skipped: true, reason: 'test_email' };
    }

    const firstName = toName.split(' ')[0];

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f0f4f8;">
  <table role="presentation" style="width:100%;background:#f0f4f8;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:520px;">
        <tr>
          <td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,#314c97 0%,#0d2436 100%);border-radius:16px 16px 0 0;">
            <img src="https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-email.png" alt="Quatrelati" style="max-width:180px;height:auto;">
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:40px;">
            <p style="margin:0 0 8px;color:#6B7280;font-size:13px;">Olá, ${firstName}!</p>
            <p style="margin:0 0 32px;color:#1F2937;font-size:15px;line-height:1.7;white-space:pre-wrap;">${corpo.replace(/\n/g, '<br>')}</p>
            <hr style="margin:32px 0;border:none;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">
              Atenciosamente,<br>
              <strong>${remetenteNome}</strong><br>
              Laticinio Quatrelati
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;text-align:center;background:#F9FAFB;border-radius:0 0 16px 16px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">Quatrelati Alimentos — Fabricando Manteiga para Industria e Food Service</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const textBody = `Olá, ${firstName}!\n\n${corpo}\n\n--\n${remetenteNome}\nLaticinio Quatrelati`;

    const params = {
        Source: `${FROM_NAME} <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
            Subject: { Data: assunto, Charset: 'UTF-8' },
            Body: {
                Html: { Data: htmlBody, Charset: 'UTF-8' },
                Text: { Data: textBody, Charset: 'UTF-8' },
            },
        },
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);
        console.log(`[EMAIL] Reply enviado para: ${to} — MessageId: ${response.MessageId}`);
        return { messageId: response.MessageId };
    } catch (error) {
        console.error('[EMAIL] Erro ao enviar reply via SES:', error.message);
        throw error;
    }
}

module.exports = {
    sendMagicLinkEmail,
    sendInviteEmail,
    sendContactEmail,
    sendReplyEmail,
};
