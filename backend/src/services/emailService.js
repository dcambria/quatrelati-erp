/**
 * ===========================================
 * Quatrelati - Email Service
 * Envio de emails via AWS SES
 * v2.2.0
 * ===========================================
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { fromIni } = require('@aws-sdk/credential-provider-ini');

// Configurar cliente SES com profile default
const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: fromIni({ profile: 'default' }),
});

// Email remetente (deve estar verificado no SES)
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'daniel.cambria@bureau-it.com';
const FROM_NAME = 'Quatrelati';

/**
 * Envia email de Magic Link via AWS SES
 */
async function sendMagicLinkEmail(to, userName, magicLinkUrl) {
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
                                        <a href="${inviteLinkUrl}"
                                           style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                                            Configurar meu Acesso
                                        </a>
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

module.exports = {
    sendMagicLinkEmail,
    sendInviteEmail,
};
