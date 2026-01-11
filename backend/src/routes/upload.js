// =====================================================
// Rotas de Upload
// v1.1.0 - WebP conversion
// =====================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fromIni } = require('@aws-sdk/credential-provider-ini');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');

// Configurar S3 client com profile default
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: fromIni({ profile: 'default' }),
});

const S3_BUCKET = process.env.S3_BUCKET || 'bureau-it.com';
const S3_PREFIX = 'quatrelati/produtos';
const S3_PREFIX_LOGOS = 'quatrelati/logos';

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
        res.status(500).json({ error: 'Erro ao fazer upload da logo' });
    }
});

module.exports = router;
