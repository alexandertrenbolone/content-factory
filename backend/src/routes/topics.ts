import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../lib/auth';
import { validateString, validateEnum, validateInt, firstError } from '../lib/validate';

const router = Router();
const prisma = new PrismaClient();

const LLM_PROVIDERS = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter', 'groq'];
const IMAGE_PROVIDERS = ['openai', 'fal', 'pollinations'];

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const topics = await prisma.topic.findMany({
    where: { companyId: req.companyId!, isActive: true },
    include: { socialAccount: { select: { platform: true, label: true } } },
  });
  res.json(topics);
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  // autoPublish добавлен — без него дефолт в БД всегда true (баг: ручной режим игнорировался)
  const { name, llmProvider, imageProvider, systemPrompt, socialAccountId, postFormat, scheduleMinutes, autoPublish } = req.body;

  const err = firstError(
    validateString(name, 'name', { min: 1, max: 100 }),
    validateEnum(llmProvider, 'llmProvider', LLM_PROVIDERS),
    validateString(systemPrompt, 'systemPrompt', { min: 10, max: 2000 }),
    validateString(socialAccountId, 'socialAccountId', { min: 1, max: 100 }),
    validateInt(scheduleMinutes ?? 60, 'scheduleMinutes', { min: 1, max: 10080, required: false }),
    imageProvider ? validateEnum(imageProvider, 'imageProvider', IMAGE_PROVIDERS, false) : null,
  );
  if (err) { res.status(400).json({ error: err }); return; }

  const account = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId, companyId: req.companyId!, isActive: true },
  });
  if (!account) { res.status(404).json({ error: 'Канал не найден или не активен' }); return; }

  const topic = await prisma.topic.create({
    data: {
      companyId: req.companyId!,
      name: name.trim(),
      llmProvider,
      systemPrompt: systemPrompt.trim(),
      socialAccountId,
      imageProvider: imageProvider || null,
      postFormat: postFormat || 'text',
      scheduleMinutes: parseInt(scheduleMinutes) || 60,
      // Фикс: передаём autoPublish из запроса, иначе дефолт true
      autoPublish: typeof autoPublish === 'boolean' ? autoPublish : true,
    },
  });
  res.status(201).json(topic);
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, systemPrompt, llmProvider, imageProvider, socialAccountId, scheduleMinutes, postFormat, autoPublish } = req.body;

  // Валидируем только те поля, которые переданы
  if (name !== undefined) {
    const err = validateString(name, 'name', { min: 1, max: 100 });
    if (err) { res.status(400).json({ error: err }); return; }
  }
  if (systemPrompt !== undefined) {
    const err = validateString(systemPrompt, 'systemPrompt', { min: 10, max: 2000 });
    if (err) { res.status(400).json({ error: err }); return; }
  }
  if (llmProvider !== undefined) {
    const err = validateEnum(llmProvider, 'llmProvider', LLM_PROVIDERS);
    if (err) { res.status(400).json({ error: err }); return; }
  }
  if (imageProvider !== undefined && imageProvider !== null && imageProvider !== '') {
    const err = validateEnum(imageProvider, 'imageProvider', IMAGE_PROVIDERS);
    if (err) { res.status(400).json({ error: err }); return; }
  }
  if (scheduleMinutes !== undefined) {
    const err = validateInt(scheduleMinutes, 'scheduleMinutes', { min: 1, max: 10080 });
    if (err) { res.status(400).json({ error: err }); return; }
  }
  if (socialAccountId !== undefined) {
    const account = await prisma.socialAccount.findFirst({
      where: { id: socialAccountId, companyId: req.companyId!, isActive: true },
    });
    if (!account) { res.status(404).json({ error: 'Канал не найден или не активен' }); return; }
  }

  await prisma.topic.updateMany({
    where: { id: req.params.id as string, companyId: req.companyId! },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(systemPrompt !== undefined && { systemPrompt: String(systemPrompt).trim() }),
      ...(llmProvider !== undefined && { llmProvider }),
      ...(imageProvider !== undefined && { imageProvider: imageProvider || null }),
      ...(socialAccountId !== undefined && { socialAccountId }),
      ...(scheduleMinutes !== undefined && { scheduleMinutes: parseInt(scheduleMinutes) }),
      ...(postFormat !== undefined && { postFormat }),
      ...(autoPublish !== undefined && { autoPublish: Boolean(autoPublish) }),
    },
  });
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.topic.updateMany({
    where: { id: req.params.id as string, companyId: req.companyId! },
    data: { isActive: false },
  });
  res.json({ ok: true });
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'isActive должен быть булевым значением' });
    return;
  }
  await prisma.topic.updateMany({
    where: { id: req.params.id as string, companyId: req.companyId! },
    data: { isActive },
  });
  res.json({ ok: true });
});

export default router;
