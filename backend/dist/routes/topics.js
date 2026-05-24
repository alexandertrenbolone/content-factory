"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../lib/auth");
const validate_1 = require("../lib/validate");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const LLM_PROVIDERS = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter', 'groq'];
const IMAGE_PROVIDERS = ['openai', 'fal', 'pollinations'];
router.get('/', auth_1.requireAuth, async (req, res) => {
    const topics = await prisma.topic.findMany({
        where: { companyId: req.companyId, isActive: true },
        include: { socialAccount: { select: { platform: true, label: true } } },
    });
    res.json(topics);
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    const { name, llmProvider, imageProvider, systemPrompt, socialAccountId, postFormat, scheduleMinutes } = req.body;
    const err = (0, validate_1.firstError)((0, validate_1.validateString)(name, 'name', { min: 1, max: 100 }), (0, validate_1.validateEnum)(llmProvider, 'llmProvider', LLM_PROVIDERS), (0, validate_1.validateString)(systemPrompt, 'systemPrompt', { min: 10, max: 2000 }), (0, validate_1.validateString)(socialAccountId, 'socialAccountId', { min: 1, max: 100 }), (0, validate_1.validateInt)(scheduleMinutes ?? 60, 'scheduleMinutes', { min: 1, max: 10080, required: false }), imageProvider ? (0, validate_1.validateEnum)(imageProvider, 'imageProvider', IMAGE_PROVIDERS, false) : null);
    if (err) {
        res.status(400).json({ error: err });
        return;
    }
    const account = await prisma.socialAccount.findFirst({
        where: { id: socialAccountId, companyId: req.companyId, isActive: true },
    });
    if (!account) {
        res.status(404).json({ error: 'Канал не найден или не активен' });
        return;
    }
    const topic = await prisma.topic.create({
        data: {
            companyId: req.companyId,
            name: name.trim(),
            llmProvider,
            systemPrompt: systemPrompt.trim(),
            socialAccountId,
            imageProvider: imageProvider || null,
            postFormat: postFormat || 'text',
            scheduleMinutes: parseInt(scheduleMinutes) || 60,
        },
    });
    res.status(201).json(topic);
});
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    const { name, systemPrompt, llmProvider, imageProvider, socialAccountId, scheduleMinutes, postFormat, autoPublish } = req.body;
    // Валидируем только те поля, которые переданы
    if (name !== undefined) {
        const err = (0, validate_1.validateString)(name, 'name', { min: 1, max: 100 });
        if (err) {
            res.status(400).json({ error: err });
            return;
        }
    }
    if (systemPrompt !== undefined) {
        const err = (0, validate_1.validateString)(systemPrompt, 'systemPrompt', { min: 10, max: 2000 });
        if (err) {
            res.status(400).json({ error: err });
            return;
        }
    }
    if (llmProvider !== undefined) {
        const err = (0, validate_1.validateEnum)(llmProvider, 'llmProvider', LLM_PROVIDERS);
        if (err) {
            res.status(400).json({ error: err });
            return;
        }
    }
    if (imageProvider !== undefined && imageProvider !== null && imageProvider !== '') {
        const err = (0, validate_1.validateEnum)(imageProvider, 'imageProvider', IMAGE_PROVIDERS);
        if (err) {
            res.status(400).json({ error: err });
            return;
        }
    }
    if (scheduleMinutes !== undefined) {
        const err = (0, validate_1.validateInt)(scheduleMinutes, 'scheduleMinutes', { min: 1, max: 10080 });
        if (err) {
            res.status(400).json({ error: err });
            return;
        }
    }
    if (socialAccountId !== undefined) {
        const account = await prisma.socialAccount.findFirst({
            where: { id: socialAccountId, companyId: req.companyId, isActive: true },
        });
        if (!account) {
            res.status(404).json({ error: 'Канал не найден или не активен' });
            return;
        }
    }
    await prisma.topic.updateMany({
        where: { id: req.params.id, companyId: req.companyId },
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
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    await prisma.topic.updateMany({
        where: { id: req.params.id, companyId: req.companyId },
        data: { isActive: false },
    });
    res.json({ ok: true });
});
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'isActive должен быть булевым значением' });
        return;
    }
    await prisma.topic.updateMany({
        where: { id: req.params.id, companyId: req.companyId },
        data: { isActive },
    });
    res.json({ ok: true });
});
exports.default = router;
