// Script para atualizar as senhas dos usuários iniciais
// Este script é executado automaticamente na inicialização do servidor

const bcrypt = require('bcryptjs');

const SENHA_PADRAO = 'Quatrelati@2026';

async function seedPasswords(pool) {
  try {
    // Criar tabela magic_links se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) DEFAULT 'password_reset',
        used_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices se não existirem
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
      CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links(user_id);
    `);

    console.log('Verificando senhas dos usuários...');

    // Gerar hash da senha padrão
    const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

    // Atualizar usuários que têm senha placeholder
    const result = await pool.query(`
      UPDATE usuarios
      SET senha_hash = $1
      WHERE senha_hash LIKE '$2a$10$92IXUNpkjO0rOQ5%'
      RETURNING email
    `, [senhaHash]);

    if (result.rows.length > 0) {
      console.log(`Senhas atualizadas para: ${result.rows.map(r => r.email).join(', ')}`);
    } else {
      console.log('Todas as senhas já estão configuradas corretamente.');
    }
  } catch (error) {
    console.error('Erro ao atualizar senhas:', error);
  }
}

module.exports = seedPasswords;
