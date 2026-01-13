-- =====================================================
-- Migration 004: Add error_logs table
-- v1.0.0 - Tabela para registrar erros do sistema
-- =====================================================

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES usuarios(id),
    user_nome VARCHAR(255),
    user_nivel VARCHAR(50),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    request_body JSONB,
    validation_errors JSONB,
    stack_trace TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
