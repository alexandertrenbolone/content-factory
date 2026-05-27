import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../lib/auth';
import { encrypt, decrypt } from '../lib/crypto';
import * as googleDrive from '../services/googleDrive';
import * as yandexDisk from '../services/yandexDisk';

const router = Router();
const prisma = new PrismaClient();

// GET /storage/status — какие хранилища подключены
router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const connections = await prisma.storageConnection.findMany({
    where: { companyId: req.companyId! },
    select: { provider: true, folderName: true, createdAt: true },
  });
  res.json(connections);
});

// --- Google Drive ---

router.get('/google/auth', requireAuth, (req: AuthRequest, res: Response) => {
  const url = googleDrive.getAuthUrl(req.companyId!);
  res.json({ url });
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state: companyId, error } = req.query as { code: string; state: string; error?: string };
  if (error || !code || !companyId) {
    res.redirect('/storage?error=cancelled');
    return;
  }
  try {
    const tokens = await googleDrive.exchangeCode(code);
    await prisma.storageConnection.upsert({
      where: { companyId_provider: { companyId, provider: 'google' } },
      update: {
        encryptedAccessToken: encrypt(tokens.access_token!),
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      create: {
        companyId,
        provider: 'google',
        encryptedAccessToken: encrypt(tokens.access_token!),
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
    res.redirect('/storage?connected=google');
  } catch (e: any) {
    console.error('[storage/google/callback]', e.message);
    res.status(500).send('Ошибка при подключении Google Drive. Попробуй ещё раз.');
  }
});

// --- Yandex Disk ---

router.get('/yandex/auth', requireAuth, (req: AuthRequest, res: Response) => {
  const url = yandexDisk.getAuthUrl(req.companyId!);
  res.json({ url });
});

router.get('/yandex/callback', async (req: Request, res: Response) => {
  const { code, state: companyId, error } = req.query as { code: string; state: string; error?: string };
  if (error || !code || !companyId) {
    res.redirect('/storage?error=cancelled');
    return;
  }
  try {
    const tokens = await yandexDisk.exchangeCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await prisma.storageConnection.upsert({
      where: { companyId_provider: { companyId, provider: 'yandex' } },
      update: {
        encryptedAccessToken: encrypt(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        expiresAt,
      },
      create: {
        companyId,
        provider: 'yandex',
        encryptedAccessToken: encrypt(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt,
      },
    });
    res.redirect('/storage?connected=yandex');
  } catch (e: any) {
    console.error('[storage/yandex/callback]', e.message);
    res.status(500).send('Ошибка при подключении Яндекс Диска. Попробуй ещё раз.');
  }
});

// DELETE /storage/:provider — отключить хранилище
router.delete('/:provider', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.storageConnection.deleteMany({
    where: { companyId: req.companyId!, provider: req.params.provider as string },
  });
  res.json({ ok: true });
});

export default router;
