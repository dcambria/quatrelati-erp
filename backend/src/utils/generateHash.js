// Utilitário para gerar hash de senha
// Executar: node src/utils/generateHash.js

const bcrypt = require('bcryptjs');

const senha = 'Quatrelati@2026';

bcrypt.hash(senha, 10, (err, hash) => {
  if (err) {
    console.error('Erro ao gerar hash:', err);
    return;
  }
  console.log('Senha:', senha);
  console.log('Hash:', hash);
});
