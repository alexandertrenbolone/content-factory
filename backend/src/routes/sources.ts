import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { requireAuth, AuthRequest } from '../lib/auth';
import { isValidUrl, validateString, validateInt, firstError } from '../lib/validate';
import Parser from 'rss-parser';

function getPollQueue() {
  const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null, tls: { rejectUnauthorized: false } });
  return new Queue('pollSources', { connection: redis });
}

const router = Router();
const prisma = new PrismaClient();
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
});

const VALID_INTERVALS = [10, 30, 60, 120, 360, 720, 1440];

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const sources = await prisma.source.findMany({
    where: { companyId: req.companyId!, isActive: true },
    include: { topic: { select: { name: true } } },
  });
  res.json(sources);
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { url, name, topicId, pollIntervalMinutes } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Укажи RSS URL' });
    return;
  }
  if (!isValidUrl(url.trim())) {
    res.status(400).json({ error: 'Неверный формат URL. Должен начинаться с http:// или https://' });
    return;
  }
  if (name !== undefined) {
    const err = validateString(name, 'name', { min: 1, max: 100, required: false });
    if (err) { res.status(400).json({ error: err }); return; }
  }

  const interval = parseInt(pollIntervalMinutes) || 30;
  if (!VALID_INTERVALS.includes(interval)) {
    res.status(400).json({ error: `Интервал опроса должен быть одним из: ${VALID_INTERVALS.join(', ')} минут` });
    return;
  }

  if (topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, companyId: req.companyId!, isActive: true },
    });
    if (!topic) { res.status(404).json({ error: 'Тема не найдена' }); return; }
  }

  try {
    const feed = await parser.parseURL(url.trim());
    const sourceName = (name?.trim()) || feed.title || url;
    const source = await prisma.source.upsert({
      where: { companyId_url: { companyId: req.companyId!, url: url.trim() } },
      update: { isActive: true, name: sourceName, topicId: topicId || null, pollIntervalMinutes: interval },
      create: { companyId: req.companyId!, url: url.trim(), name: sourceName, topicId: topicId || null, pollIntervalMinutes: interval },
    });
    res.status(201).json({ ...source, feedTitle: feed.title, itemCount: feed.items.length });
  } catch (e: any) {
    const msg: string = e.message || '';
    if (msg.includes('404')) {
      res.status(400).json({ error: 'RSS лента не найдена (404). Проверь URL.' });
    } else if (msg.includes('403')) {
      res.status(400).json({ error: 'Доступ к RSS ленте запрещён (403). Сайт блокирует запросы.' });
    } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      res.status(400).json({ error: 'Сайт не отвечает (timeout). Попробуй позже.' });
    } else if (msg.includes('XML') || msg.includes('parse') || msg.includes('Invalid')) {
      res.status(400).json({ error: 'Не удалось разобрать RSS. Убедись что это RSS/Atom лента, а не обычный сайт.' });
    } else {
      res.status(400).json({ error: `Не удалось прочитать RSS: ${msg}` });
    }
  }
});

router.post('/poll', requireAuth, async (_req: AuthRequest, res: Response) => {
  await getPollQueue().add('poll-manual', {});
  res.json({ ok: true });
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, topicId, pollIntervalMinutes } = req.body;

  if (name !== undefined) {
    const err = validateString(name, 'name', { min: 1, max: 100 });
    if (err) { res.status(400).json({ error: err }); return; }
  }
  if (pollIntervalMinutes !== undefined) {
    const interval = parseInt(pollIntervalMinutes);
    if (!VALID_INTERVALS.includes(interval)) {
      res.status(400).json({ error: `Интервал опроса должен быть одним из: ${VALID_INTERVALS.join(', ')} минут` });
      return;
    }
  }
  if (topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, companyId: req.companyId!, isActive: true },
    });
    if (!topic) { res.status(404).json({ error: 'Тема не найдена' }); return; }
  }

  await prisma.source.updateMany({
    where: { id: req.params.id as string, companyId: req.companyId! },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      topicId: topicId || null,
      ...(pollIntervalMinutes !== undefined && { pollIntervalMinutes: parseInt(pollIntervalMinutes) }),
    },
  });
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.source.updateMany({
    where: { id: req.params.id as string, companyId: req.companyId! },
    data: { isActive: false },
  });
  res.json({ ok: true });
});

export default router;
