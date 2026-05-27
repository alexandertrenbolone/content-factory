import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../lib/auth';
import { encrypt, decrypt } from '../lib/crypto';
import { createLlmAdapter } from '../adapters/llm';
import { createImageAdapter } from '../adapters/image';
import { validateEnum, firstError } from '../lib/validate';

const router = Router();
const prisma = new PrismaClient();

const LLM_PROVIDERS = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter', 'groq'];
const IMAGE_PROVIDERS = ['openai', 'fal', 'pollinations'];

// POST /keys/llm — сохранить LLM ключ
router.post('/llm', requireAuth, async (req: AuthRequest, res: Response) => {
  const { provider, apiKey } = req.body;

  const err = firstError(
    validateEnum(provider, 'provider', LLM_PROVIDERS),
  );
  if (err) { res.status(400).json({ error: err }); return; }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    res.status(400).json({ error: 'API ключ слишком короткий или пустой' });
    return;
  }

  // Проверяем ключ перед сохранением
  try {
    const adapter = createLlmAdapter(provider, apiKey.trim());
    await (adapter as any).generate('Say "ok".', 'You are a helpful assistant.', 5);
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid_api_key') || msg.includes('API key')) {
      res.status(400).json({ error: `Неверный API ключ для ${provider}` });
    } else if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
      // Лимит — ключ может быть верным, сохраняем без проверки
      const encryptedKey = encrypt(apiKey.trim());
      await prisma.llmKey.upsert({
        where: { companyId_provider: { companyId: req.companyId!, provider } },
        update: { encryptedKey, isActive: true },
        create: { companyId: req.companyId!, provider, encryptedKey },
      });
      res.json({ ok: true, provider, warning: 'Ключ сохранён, но проверка не удалась из-за лимита запросов' });
    } else {
      res.status(400).json({ error: `Не удалось проверить ключ: ${msg}` });
    }
    return;
  }

  const encryptedKey = encrypt(apiKey.trim());
  await prisma.llmKey.upsert({
    where: { companyId_provider: { companyId: req.companyId!, provider } },
    update: { encryptedKey, isActive: true },
    create: { companyId: req.companyId!, provider, encryptedKey },
  });
  res.json({ ok: true, provider });
});

// POST /keys/llm/test — проверить LLM ключ
router.post('/llm/test', requireAuth, async (req: AuthRequest, res: Response) => {
  const { provider } = req.body;
  const err = validateEnum(provider, 'provider', LLM_PROVIDERS);
  if (err) { res.status(400).json({ error: err }); return; }

  const record = await prisma.llmKey.findUnique({
    where: { companyId_provider: { companyId: req.companyId!, provider } },
  });
  if (!record) { res.status(404).json({ error: 'Ключ не найден' }); return; }

  try {
    const apiKey = decrypt(record.encryptedKey);
    const adapter = createLlmAdapter(provider, apiKey);
    const result = await (adapter as any).generate('Say "ok" in one word.', 'You are a helpful assistant.', 10);
    res.json({ ok: true, provider, response: result.trim() });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// GET /keys/llm — список подключённых LLM провайдеров
router.get('/llm', requireAuth, async (req: AuthRequest, res: Response) => {
  const keys = await prisma.llmKey.findMany({
    where: { companyId: req.companyId!, isActive: true },
    select: { provider: true, createdAt: true },
  });
  res.json(keys);
});

// DELETE /keys/llm/:provider — удалить ключ
router.delete('/llm/:provider', requireAuth, async (req: AuthRequest, res: Response) => {
  const provider = req.params.provider as string;
  if (!LLM_PROVIDERS.includes(provider)) {
    res.status(400).json({ error: `Неизвестный провайдер: ${provider}` });
    return;
  }
  await prisma.llmKey.updateMany({
    where: { companyId: req.companyId!, provider },
    data: { isActive: false },
  });
  res.json({ ok: true });
});

// POST /keys/image — сохранить Image ключ
router.post('/image', requireAuth, async (req: AuthRequest, res: Response) => {
  const { provider, apiKey } = req.body;

  const err = validateEnum(provider, 'provider', IMAGE_PROVIDERS);
  if (err) { res.status(400).json({ error: err }); return; }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    res.status(400).json({ error: 'API ключ слишком короткий или пустой' });
    return;
  }

  const encryptedKey = encrypt(apiKey.trim());
  await prisma.imageKey.upsert({
    where: { companyId_provider: { companyId: req.companyId!, provider } },
    update: { encryptedKey, isActive: true },
    create: { companyId: req.companyId!, provider, encryptedKey },
  });
  res.json({ ok: true, provider });
});

// POST /keys/image/test — реально проверить Image ключ
router.post('/image/test', requireAuth, async (req: AuthRequest, res: Response) => {
  const { provider } = req.body;
  const err = validateEnum(provider, 'provider', IMAGE_PROVIDERS);
  if (err) { res.status(400).json({ error: err }); return; }

  const record = await prisma.imageKey.findUnique({
    where: { companyId_provider: { companyId: req.companyId!, provider } },
  });
  if (!record) { res.status(404).json({ error: 'Ключ не найден' }); return; }

  const apiKey = decrypt(record.encryptedKey);

  try {
    if (provider === 'openai') {
      // Проверяем ключ через список моделей — бесплатно, не генерирует изображение
      await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });
      // Дополнительно проверяем доступ к DALL-E
      try {
        await axios.post('https://api.openai.com/v1/images/generations', {
          model: 'dall-e-2', prompt: 'red circle', n: 1, size: '256x256',
        }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });
        res.json({ ok: true, provider });
      } catch (dallErr: any) {
        const msg = dallErr.response?.data?.error?.message || dallErr.message;
        // Ключ верный, но DALL-E недоступен на этом аккаунте
        res.json({ ok: false, error: `Ключ верный, но DALL-E недоступен: ${msg}` });
      }
    } else if (provider === 'fal') {
      await axios.post(
        'https://fal.run/fal-ai/flux/schnell',
        { prompt: 'red circle', image_size: 'square_hd', num_images: 1 },
        { headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 },
      );
      res.json({ ok: true, provider });
    } else {
      // pollinations — бесплатно, ключ не нужен
      res.json({ ok: true, provider });
    }
  } catch (e: any) {
    const status = e.response?.status;
    const detail: string = e.response?.data?.detail || e.response?.data?.error?.message || e.message || '';
    if (provider === 'fal' && status === 403 && detail.includes('Exhausted balance')) {
      res.status(400).json({ ok: false, error: 'Ключ верный, но баланс исчерпан. Пополни баланс на fal.ai/dashboard/billing' });
    } else if (status === 401 || (status === 403 && !detail.includes('Exhausted'))) {
      res.status(400).json({ ok: false, error: `Неверный API ключ для ${provider}` });
    } else {
      res.status(400).json({ ok: false, error: detail || e.message });
    }
  }
});

// GET /keys/image — список подключённых Image провайдеров
router.get('/image', requireAuth, async (req: AuthRequest, res: Response) => {
  const keys = await prisma.imageKey.findMany({
    where: { companyId: req.companyId!, isActive: true },
    select: { provider: true, createdAt: true },
  });
  res.json(keys);
});

export default router;
