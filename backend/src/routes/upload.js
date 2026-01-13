// =====================================================
// Rotas de Upload
// v1.2.0 - Credenciais AWS via env vars ou fallback
// =====================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fromIni } = require('@aws-sdk/credential-provider-ini');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

// Configurar S3 client
// Prioridade: env vars > arquivo de credenciais
const getS3Client = () => {
    const config = {
        region: process.env.AWS_REGION || 'us-east-1',
    };

    // Se tiver credenciais via env vars, usar elas
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
    } else {
        // Fallback para arquivo de credenciais (desenvolvimento local)
        try {
            config.credentials = fromIni({ profile: 'default' });
        } catch (e) {
            console.warn('[UPLOAD] AWS credentials não configuradas - uploads para S3 não funcionarão');
        }
    }

    return new S3Client(config);
};

const s3Client = getS3Client();

const S3_BUCKET = process.env.S3_BUCKET || 'bureau-it.com';
const S3_PREFIX = 'quatrelati/erp/produtos';
const S3_PREFIX_LOGOS = 'quatrelati/erp/logos';

// Configurar multer para armazenar em memória
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1 * 1024 * 1024, // 1MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'));
        }
    },
});

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * Converte imagem para WebP com tamanho máximo de 100KB
 */
async function convertToWebP(buffer) {
    let quality = 80;
    let webpBuffer = await sharp(buffer)
        .webp({ quality })
        .toBuffer();

    // Reduzir qualidade progressivamente até ficar abaixo de 100KB
    while (webpBuffer.length > 100 * 1024 && quality > 10) {
        quality -= 10;
        webpBuffer = await sharp(buffer)
            .webp({ quality })
            .toBuffer();
    }

    // Se ainda estiver grande, redimensionar a imagem
    if (webpBuffer.length > 100 * 1024) {
        const metadata = await sharp(buffer).metadata();
        let width = metadata.width || 800;

        while (webpBuffer.length > 100 * 1024 && width > 200) {
            width = Math.floor(width * 0.8);
            webpBuffer = await sharp(buffer)
                .resize({ width, withoutEnlargement: true })
                .webp({ quality: 70 })
                .toBuffer();
        }
    }

    return webpBuffer;
}

/**
 * POST /api/upload/image
 * Upload de imagem para S3 (converte para WebP até 100KB)
 */
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        // Converter para WebP otimizado
        const webpBuffer = await convertToWebP(req.file.buffer);

        // Gerar nome único para o arquivo
        const fileName = `${crypto.randomBytes(16).toString('hex')}.webp`;
        const key = `${S3_PREFIX}/${fileName}`;

        // Upload para S3
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: webpBuffer,
            ContentType: 'image/webp',
            ACL: 'public-read',
        });

        await s3Client.send(command);

        // Construir URL pública
        const url = `https://s3.amazonaws.com/${S3_BUCKET}/${key}`;

        console.log(`[UPLOAD] Imagem WebP enviada: ${url} (${Math.round(webpBuffer.length / 1024)}KB)`);

        res.json({
            message: 'Upload realizado com sucesso',
            url,
            key,
            size: webpBuffer.length,
        });
    } catch (error) {
        console.error('Erro no upload:', error);

        // Erro específico de credenciais AWS
        if (error.name === 'CredentialsProviderError' || error.message?.includes('credentials')) {
            return res.status(500).json({
                error: 'Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.'
            });
        }

        // Erro de permissão do bucket
        if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
            return res.status(500).json({
                error: 'Sem permissão para fazer upload no bucket S3.'
            });
        }

        res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
});

/**
 * POST /api/upload/logo
 * Upload de logo de cliente para S3 (converte para WebP até 100KB)
 */
router.post('/logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        // Converter para WebP otimizado
        const webpBuffer = await convertToWebP(req.file.buffer);

        // Gerar nome único para o arquivo
        const fileName = `${crypto.randomBytes(16).toString('hex')}.webp`;
        const key = `${S3_PREFIX_LOGOS}/${fileName}`;

        // Upload para S3
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: webpBuffer,
            ContentType: 'image/webp',
            ACL: 'public-read',
        });

        await s3Client.send(command);

        // Construir URL pública
        const url = `https://s3.amazonaws.com/${S3_BUCKET}/${key}`;

        console.log(`[UPLOAD] Logo WebP enviada: ${url} (${Math.round(webpBuffer.length / 1024)}KB)`);

        res.json({
            message: 'Logo enviada com sucesso',
            url,
            key,
            size: webpBuffer.length,
        });
    } catch (error) {
        console.error('Erro no upload de logo:', error);

        // Erro específico de credenciais AWS
        if (error.name === 'CredentialsProviderError' || error.message?.includes('credentials')) {
            return res.status(500).json({
                error: 'Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.'
            });
        }

        // Erro de permissão do bucket
        if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
            return res.status(500).json({
                error: 'Sem permissão para fazer upload no bucket S3.'
            });
        }

        res.status(500).json({ error: 'Erro ao fazer upload da logo' });
    }
});

module.exports = router;
