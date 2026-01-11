// Testes unitários do serviço de autenticação

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    test('deve gerar hash válido para senha', async () => {
      const senha = 'Quatrelati@2026';
      const hash = await bcrypt.hash(senha, 10);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(60);
      expect(hash).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    test('deve validar senha correta', async () => {
      const senha = 'Quatrelati@2026';
      const hash = await bcrypt.hash(senha, 10);

      const valido = await bcrypt.compare(senha, hash);
      expect(valido).toBe(true);
    });

    test('deve rejeitar senha incorreta', async () => {
      const senha = 'Quatrelati@2026';
      const hash = await bcrypt.hash(senha, 10);

      const valido = await bcrypt.compare('SenhaErrada', hash);
      expect(valido).toBe(false);
    });
  });

  describe('JWT Token', () => {
    const secret = 'test-secret';

    test('deve gerar token JWT válido', () => {
      const payload = { id: 1, email: 'teste@teste.com', nivel: 'admin' };
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    test('deve decodificar token válido', () => {
      const payload = { id: 1, email: 'teste@teste.com', nivel: 'admin' };
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      const decoded = jwt.verify(token, secret);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.nivel).toBe(payload.nivel);
    });

    test('deve rejeitar token com secret inválido', () => {
      const payload = { id: 1, email: 'teste@teste.com' };
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      expect(() => {
        jwt.verify(token, 'wrong-secret');
      }).toThrow();
    });
  });
});
