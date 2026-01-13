// =====================================================
// Testes Unitários - Email Service
// =====================================================

// Mock AWS SES antes de importar o módulo
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ses', () => ({
    SESClient: jest.fn().mockImplementation(() => ({
        send: mockSend
    })),
    SendEmailCommand: jest.fn().mockImplementation((params) => params)
}));

jest.mock('@aws-sdk/credential-provider-ini', () => ({
    fromIni: jest.fn().mockReturnValue({})
}));

describe('Email Service', () => {
    let emailService;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reimportar o módulo para ter acesso às funções
        emailService = require('../../src/services/emailService');
    });

    describe('sendMagicLinkEmail', () => {
        it('deve enviar email de magic link com sucesso', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id-123'
            });

            const result = await emailService.sendMagicLinkEmail(
                'user@bureau-it.com',
                'John Doe',
                'https://quatrelati.com/magic-link?token=abc123'
            );

            expect(result).toEqual({ messageId: 'test-message-id-123' });
            expect(mockSend).toHaveBeenCalled();
        });

        it('deve usar primeiro nome no email', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id'
            });

            await emailService.sendMagicLinkEmail(
                'user@bureau-it.com',
                'Maria Silva Santos',
                'https://example.com/link'
            );

            const sentCommand = mockSend.mock.calls[0][0];
            expect(sentCommand.Message.Body.Html.Data).toContain('Maria');
        });

        it('deve incluir link no corpo do email', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id'
            });

            const magicLink = 'https://quatrelati.com/magic-link?token=unique-token-123';

            await emailService.sendMagicLinkEmail(
                'user@bureau-it.com',
                'Test User',
                magicLink
            );

            const sentCommand = mockSend.mock.calls[0][0];
            expect(sentCommand.Message.Body.Html.Data).toContain(magicLink);
            expect(sentCommand.Message.Body.Text.Data).toContain(magicLink);
        });

        it('deve configurar assunto correto', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id'
            });

            await emailService.sendMagicLinkEmail(
                'user@bureau-it.com',
                'Test User',
                'https://example.com/link'
            );

            const sentCommand = mockSend.mock.calls[0][0];
            expect(sentCommand.Message.Subject.Data).toBe('Seu link de acesso - Quatrelati');
        });

        it('deve lançar erro quando SES falhar', async () => {
            mockSend.mockRejectedValueOnce(new Error('SES Error'));

            await expect(
                emailService.sendMagicLinkEmail(
                    'user@bureau-it.com',
                    'Test User',
                    'https://example.com/link'
                )
            ).rejects.toThrow('SES Error');
        });
    });

    describe('sendInviteEmail', () => {
        it('deve enviar email de convite com sucesso', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'invite-message-id-456'
            });

            const result = await emailService.sendInviteEmail(
                'newuser@bureau-it.com',
                'New User',
                'https://quatrelati.com/magic-link?token=invite-token'
            );

            expect(result).toEqual({ messageId: 'invite-message-id-456' });
            expect(mockSend).toHaveBeenCalled();
        });

        it('deve usar primeiro nome no email de convite', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id'
            });

            await emailService.sendInviteEmail(
                'user@bureau-it.com',
                'Carlos Alberto Silva',
                'https://example.com/invite'
            );

            const sentCommand = mockSend.mock.calls[0][0];
            expect(sentCommand.Message.Body.Html.Data).toContain('Carlos');
            expect(sentCommand.Message.Body.Html.Data).toContain('Bem-vindo');
        });

        it('deve incluir link de convite no corpo do email', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id'
            });

            const inviteLink = 'https://quatrelati.com/magic-link?token=invite-unique-123';

            await emailService.sendInviteEmail(
                'user@bureau-it.com',
                'Test User',
                inviteLink
            );

            const sentCommand = mockSend.mock.calls[0][0];
            expect(sentCommand.Message.Body.Html.Data).toContain(inviteLink);
            expect(sentCommand.Message.Body.Text.Data).toContain(inviteLink);
        });

        it('deve configurar assunto de convite correto', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id'
            });

            await emailService.sendInviteEmail(
                'user@bureau-it.com',
                'Test User',
                'https://example.com/invite'
            );

            const sentCommand = mockSend.mock.calls[0][0];
            expect(sentCommand.Message.Subject.Data).toBe('Convite para o Sistema Quatrelati');
        });

        it('deve mencionar expiração de 48 horas', async () => {
            mockSend.mockResolvedValueOnce({
                MessageId: 'test-message-id'
            });

            await emailService.sendInviteEmail(
                'user@bureau-it.com',
                'Test User',
                'https://example.com/invite'
            );

            const sentCommand = mockSend.mock.calls[0][0];
            expect(sentCommand.Message.Body.Html.Data).toContain('48 horas');
            expect(sentCommand.Message.Body.Text.Data).toContain('48 horas');
        });

        it('deve lançar erro quando SES falhar', async () => {
            mockSend.mockRejectedValueOnce(new Error('SES Invite Error'));

            await expect(
                emailService.sendInviteEmail(
                    'user@bureau-it.com',
                    'Test User',
                    'https://example.com/invite'
                )
            ).rejects.toThrow('SES Invite Error');
        });
    });
});
