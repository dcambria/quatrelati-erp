// =====================================================
// Serviço de Logging Estruturado com Winston
// v1.0.0
// =====================================================

const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato personalizado para logs
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
        metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
});

// Formato JSON para produção
const jsonFormat = printf(({ level, message, timestamp, ...meta }) => {
    return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
    });
});

// Configuração baseada no ambiente
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Transports
const transports = [
    // Console output
    new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            logFormat
        )
    })
];

// Em produção, adiciona logs em arquivo
if (isProduction) {
    transports.push(
        // Logs de erro em arquivo separado
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            format: combine(
                timestamp(),
                errors({ stack: true }),
                jsonFormat
            ),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Todos os logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            format: combine(
                timestamp(),
                jsonFormat
            ),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
}

// Criar logger
const logger = winston.createLogger({
    level: logLevel,
    defaultMeta: { service: 'quatrelati-api' },
    transports,
    // Não sair em erros de logging
    exitOnError: false
});

// Helpers para contexto de requisição
logger.request = (req, message, meta = {}) => {
    logger.info(message, {
        requestId: req.id,
        userId: req.userId,
        method: req.method,
        path: req.path,
        ...meta
    });
};

logger.requestError = (req, error, meta = {}) => {
    logger.error(error.message, {
        requestId: req.id,
        userId: req.userId,
        method: req.method,
        path: req.path,
        stack: error.stack,
        ...meta
    });
};

// Wrapper para console.log existente (migração gradual)
logger.legacy = (message, ...args) => {
    if (args.length > 0) {
        logger.debug(message, { args });
    } else {
        logger.debug(message);
    }
};

module.exports = logger;
