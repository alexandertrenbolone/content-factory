"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../lib/auth");
const crypto_1 = require("../lib/crypto");
const llm_1 = require("../adapters/llm");
const validate_1 = require("../lib/validate");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const LLM_PROVIDERS = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter', 'groq'];
const IMAGE_PROVIDERS = ['openai', 'fal', 'pollinations'];
// POST /keys/llm — сохранить LLM ключ
router.post('/llm', auth_1.requireAuth, async (req, res) => {
    const { provider, apiKey } = req.body;
    const err = (0, validate_1.firstError)((0, validate_1.validateEnum)(provider, 'provider', LLM_PROVIDERS));
    if (err) {
        res.status(400).json({ error: err });
        return;
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        res.status(400).json({ error: 'API ключ слишком короткий или пустой' });
        return;
    }
    // Проверяем ключ перед сохранением
    try {
        const adapter = (0, llm_1.createLlmAdapter)(provider, apiKey.trim());
        await adapter.generate('Say "ok".', 'You are a helpful assistant.', 5);
    }
    catch (e) {
        const msg = e.message || '';
        if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid_api_key') || msg.includes('API key')) {
            res.status(400).json({ error: `Неверный API ключ для ${provider}` });
        }
        else if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
            // Лимит — ключ может быть верным, сохраняем без проверки
            const encryptedKey = (0, crypto_1.encrypt)(apiKey.trim());
            await prisma.llmKey.upsert({
                where: { companyId_provider: { companyId: req.companyId, provider } },
                update: { encryptedKey, isActive: true },
                create: { companyId: req.companyId, provider, encryptedKey },
            });
            res.json({ ok: true, provider, warning: 'Ключ сохранён, но проверка не удалась из-за лимита запросов' });
        }
        else {
            res.status(400).json({ error: `Не удалось проверить ключ: ${msg}` });
        }
        return;
    }
    const encryptedKey = (0, crypto_1.encrypt)(apiKey.trim());
    await prisma.llmKey.upsert({
        where: { companyId_provider: { companyId: req.companyId, provider } },
        update: { encryptedKey, isActive: true },
        create: { companyId: req.companyId, provider, encryptedKey },
    });
    res.json({ ok: true, provider });
});
// POST /keys/llm/test — проверить LLM ключ
router.post('/llm/test', auth_1.requireAuth, async (req, res) => {
    const { provider } = req.body;
    const err = (0, validate_1.validateEnum)(provider, 'provider', LLM_PROVIDERS);
    if (err) {
        res.status(400).json({ error: err });
        return;
    }
    const record = await prisma.llmKey.findUnique({
        where: { companyId_provider: { companyId: req.companyId, provider } },
    });
    if (!record) {
        res.status(404).json({ error: 'Ключ не найден' });
        return;
    }
    try {
        const apiKey = (0, crypto_1.decrypt)(record.encryptedKey);
        const adapter = (0, llm_1.createLlmAdapter)(provider, apiKey);
        const result = await adapter.generate('Say "ok" in one word.', 'You are a helpful assistant.', 10);
        res.json({ ok: true, provider, response: result.trim() });
    }
    catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
});
// GET /keys/llm — список подключённых LLM провайдеров
router.get('/llm', auth_1.requireAuth, async (req, res) => {
    const keys = await prisma.llmKey.findMany({
        where: { companyId: req.companyId, isActive: true },
        select: { provider: true, createdAt: true },
    });
    res.json(keys);
});
// DELETE /keys/llm/:provider — удалить ключ
router.delete('/llm/:provider', auth_1.requireAuth, async (req, res) => {
    const provider = req.params.provider;
    if (!LLM_PROVIDERS.includes(provider)) {
        res.status(400).json({ error: `Неизвестный провайдер: ${provider}` });
        return;
    }
    await prisma.llmKey.updateMany({
        where: { companyId: req.companyId, provider },
        data: { isActive: false },
    });
    res.json({ ok: true });
});
// POST /keys/image — сохранить Image ключ
router.post('/image', auth_1.requireAuth, async (req, res) => {
    const { provider, apiKey } = req.body;
    const err = (0, validate_1.validateEnum)(provider, 'provider', IMAGE_PROVIDERS);
    if (err) {
        res.status(400).json({ error: err });
        return;
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        res.status(400).json({ error: 'API ключ слишком короткий или пустой' });
        return;
    }
    const encryptedKey = (0, crypto_1.encrypt)(apiKey.trim());
    await prisma.imageKey.upsert({
        where: { companyId_provider: { companyId: req.companyId, provider } },
        update: { encryptedKey, isActive: true },
        create: { companyId: req.companyId, provider, encryptedKey },
    });
    res.json({ ok: true, provider });
});
// GET /keys/image — список подключённых Image провайдеров
router.get('/image', auth_1.requireAuth, async (req, res) => {
    const keys = await prisma.imageKey.findMany({
        where: { companyId: req.companyId, isActive: true },
        select: { provider: true, createdAt: true },
    });
    res.json(keys);
});
exports.default = router;
