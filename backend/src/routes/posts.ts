import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { requireAuth, AuthRequest } from '../lib/auth';
import { redisConnection } from '../redis';

const router = Router();
const prisma = new PrismaClient();
const publishQueue = new Queue('publishPost', { connection: redisConnection });

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status, cursor } = req.query as Record<string, string>;
  const take = 20;

  const posts = await prisma.post.findMany({
    where: { companyId: req.companyId!, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { topic: { select: { name: true } } },
  });

  const hasMore = posts.length > take;
  if (hasMore) posts.pop();

  res.json({ posts, hasMore, nextCursor: hasMore ? posts[posts.length - 1].id : null });
});

router.post('/clear-queue', requireAuth, async (req: AuthRequest, res: Response) => {
  const { count } = await prisma.post.deleteMany({
    where: {
      companyId: req.companyId!,
      status: { in: ['pending', 'failed'] },
    },
  });

  await publishQueue.drain();
  await publishQueue.clean(0, 1000, 'delayed');

  res.json({ ok: true, deleted: count });
});

router.post('/:id/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id as string, companyId: req.companyId! },
  });
  if (!post) { res.status(404).json({ error: 'Not found' }); return; }
  if (post.status === 'published') { res.status(400).json({ error: 'Already published' }); return; }

  // Сбрасываем статус failed → pending перед повторной публикацией
  if (post.status === 'failed') {
    await prisma.post.update({ where: { id: post.id }, data: { status: 'pending', error: null } });
  }

  await publishQueue.add('publishPost', { postId: post.id }, { delay: 0 });
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.post.deleteMany({
    where: { id: req.params.id as string, companyId: req.companyId! },
  });
  res.json({ ok: true });
});

export default router;
