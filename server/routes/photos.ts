/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/photos/upload  — authenticated multipart upload
 * GET  /api/photos/:id     — returns presigned URL (5-minute TTL) or local file path
 */

import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuth } from '../auth/middleware.js';
import { prisma } from '../db.js';
import { config } from '../config.js';

const router = Router();

// Magic-byte validation for allowed image types
const ALLOWED_MAGIC: Array<{ mime: string; bytes: Buffer; offset?: number }> = [
  { mime: 'image/jpeg', bytes: Buffer.from([0xff, 0xd8, 0xff]) },
  { mime: 'image/png',  bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
  { mime: 'image/webp', bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0 },
];

function validateMagicBytes(buffer: Buffer): string | null {
  for (const sig of ALLOWED_MAGIC) {
    const slice = buffer.subarray(sig.offset ?? 0, (sig.offset ?? 0) + sig.bytes.length);
    if (slice.equals(sig.bytes)) return sig.mime;
    // WebP: RIFF????WEBP
    if (sig.mime === 'image/webp' && slice.equals(sig.bytes)) {
      const webp = buffer.subarray(8, 12).toString('ascii');
      if (webp === 'WEBP') return 'image/webp';
    }
  }
  return null;
}

// Use memory storage so we can inspect magic bytes before writing to disk/S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  },
});

// Ensure upload directory exists in dev
function ensureUploadDir(): string {
  const dir = path.resolve(config.UPLOAD_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

router.post(
  '/upload',
  requireAuth,
  upload.single('photo'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Validate magic bytes
    const detectedMime = validateMagicBytes(req.file.buffer);
    if (!detectedMime) {
      res.status(422).json({ error: 'File content does not match an allowed image type (JPEG, PNG, WebP)' });
      return;
    }

    const user = (req as any).user;
    const projectId = req.body.projectId as string | undefined;
    const punchItemId = req.body.punchItemId as string | undefined;

    const ext = detectedMime.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${crypto.randomUUID()}.${ext}`;

    let storageUrl: string;

    if (config.S3_BUCKET) {
      // S3 upload path
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const s3 = new S3Client({ region: config.AWS_REGION });
      const key = `uploads/${filename}`;
      await s3.send(new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: detectedMime,
        ServerSideEncryption: 'AES256',
      }));
      storageUrl = `s3://${config.S3_BUCKET}/${key}`;
    } else {
      // Local dev path
      if (config.NODE_ENV === 'production') {
        res.status(503).json({ error: 'S3_BUCKET must be configured in production' });
        return;
      }
      const uploadDir = ensureUploadDir();
      const dest = path.join(uploadDir, filename);
      fs.writeFileSync(dest, req.file.buffer);
      storageUrl = `/uploads/${filename}`;
    }

    // Create Photo record
    const photo = await prisma.photo.create({
      data: {
        filename,
        mimeType: detectedMime,
        sizeBytes: req.file.buffer.length,
        storageUrl,
        projectId: projectId ?? '',
        uploadedById: user.id,
        ...(punchItemId ? { punchItemId } : {}),
      },
    });

    // If punchItemId provided, link it
    if (punchItemId) {
      await prisma.punchItem.update({
        where: { id: punchItemId },
        data: { photoId: photo.id },
      });
    }

    res.status(201).json({
      photoId: photo.id,
      filename,
      url: storageUrl.startsWith('s3://') ? null : storageUrl,
    });
  }
);

router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!photo) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  if (config.S3_BUCKET && photo.storageUrl.startsWith('s3://')) {
    // Generate presigned URL valid for 5 minutes
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const s3 = new S3Client({ region: config.AWS_REGION });
    const key = photo.storageUrl.replace(`s3://${config.S3_BUCKET}/`, '');
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
      { expiresIn: 300 }
    );
    res.json({ url, expiresInSeconds: 300 });
  } else {
    // Local dev: return static path
    res.json({ url: photo.storageUrl, expiresInSeconds: null });
  }
});

export default router;

