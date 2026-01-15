module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/utils/generateHash.js',
    '!src/services/pdfExportService.js',
    '!src/services/logger.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 70,
      lines: 55,
      statements: 55
    },
    // configuracoes.js com rotas de export/import
    './src/routes/configuracoes.js': {
      branches: 75,
      functions: 100,
      lines: 90,
      statements: 90
    },
    './src/routes/logs.js': {
      branches: 90,
      functions: 100,
      lines: 98,
      statements: 98
    },
    './src/routes/produtos.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/routes/usuarios.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/routes/upload.js': {
      branches: 80,
      functions: 100,
      lines: 92,
      statements: 92
    },
    './src/routes/clientes.js': {
      branches: 80,
      functions: 85,
      lines: 80,
      statements: 80
    },
    './src/routes/dashboard.js': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90
    },
    './src/routes/auth.js': {
      branches: 75,
      functions: 90,
      lines: 89,
      statements: 89
    },
    // pedidos.js - código PDF extraído para pdfExportService.js (excluído da cobertura)
    './src/routes/pedidos.js': {
      branches: 60,
      functions: 70,
      lines: 65,
      statements: 65
    },
    './src/middleware/validation.js': {
      branches: 88,
      functions: 100,
      lines: 95,
      statements: 94
    },
    './src/middleware/auth.js': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90
    },
    './src/middleware/activityLog.js': {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95
    },
    './src/middleware/errorLog.js': {
      branches: 80,
      functions: 85,
      lines: 95,
      statements: 95
    },
    './src/middleware/vendedorFilter.js': {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95
    },
    './src/services/emailService.js': {
      branches: 65,
      functions: 100,
      lines: 85,
      statements: 85
    },
    './src/utils/seedPasswords.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
