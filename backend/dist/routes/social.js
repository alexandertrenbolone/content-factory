"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../lib/auth");
const crypto_1 = require("../lib/crypto");
const social_1 = require("../adapters/social");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /social — список подключённых аккаунтов
router.get('/', auth_1.requireAuth, async (req, res) => {
    const accounts = await prisma.socialAccount.findMany({
        where: { companyId: req.companyId, isActive: true },
        select: { id: true, platform: true, label: true, createdAt: true },
    });
    res.json(accounts);
});
// POST /social — подключить аккаунт
router.post('/', auth_1.requireAuth, async (req, res) => {
    const { platform, label, creds } = req.body;
    const allowed = ['telegram', 'vk', 'dzen'];
    if (!allowed.includes(platform)) {
        res.status(400).json({ error: `platform должен быть: ${allowed.join(', ')}` });
        return;
    }
    if (!label || !creds) {
        res.status(400).json({ error: 'Нужны label и creds' });
        return;
    }
    // Валидация формата для Telegram
    if (platform === 'telegram') {
        // Поля: botToken и channelId (как отправляет фронтенд)
        const botToken = String(creds?.botToken ?? '').trim();
        const channelId = String(creds?.channelId ?? '').trim();
        if (!botToken) {
            res.status(400).json({ error: 'Укажи токен бота (получить у @BotFather)' });
            return;
        }
        if (botToken.startsWith('http') || !/^\d+:[\w-]{20,}$/.test(botToken)) {
            res.status(400).json({ error: 'Неверный формат токена. Должно быть: 1234567890:AABBccDDee... (взять у @BotFather → /mybots → API Token)' });
            return;
        }
        if (!channelId) {
            res.status(400).json({ error: 'Укажи ID канала или @username' });
            return;
        }
        if (channelId.startsWith('http')) {
            res.status(400).json({ error: 'ID канала не может быть ссылкой. Используй @username или числовой ID: -1001234567890' });
            return;
        }
        if (!channelId.startsWith('@') && !channelId.startsWith('-') && !/^\d+$/.test(channelId)) {
            res.status(400).json({ error: 'ID канала должен быть в формате @username или числовым ID: -1001234567890' });
            return;
        }
    }
    // Проверяем credentials перед сохранением
    try {
        const adapter = (0, social_1.createSocialAdapter)(platform, creds);
        const ok = await adapter.verify();
        if (!ok) {
            res.status(400).json({ error: 'Не удалось подключиться — проверь токен' });
            return;
        }
    }
    catch (e) {
        res.status(400).json({ error: `Ошибка проверки: ${e.message}` });
        return;
    }
    const encryptedCreds = (0, crypto_1.encrypt)(JSON.stringify(creds));
    await prisma.socialAccount.upsert({
        where: { companyId_platform_label: { companyId: req.companyId, platform, label } },
        update: { encryptedCreds, isActive: true },
        create: { companyId: req.companyId, platform, label, encryptedCreds },
    });
    res.status(201).json({ ok: true, platform, label });
});
// PUT /social/:id — обновить канал (например исправить chatId)
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    const { label, creds } = req.body;
    const account = await prisma.socialAccount.findFirst({
        where: { id: req.params.id, companyId: req.companyId },
    });
    if (!account) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    if (creds?.channelId) {
        const channelId = String(creds.channelId).trim();
        if (channelId.startsWith('http')) {
            res.status(400).json({ error: 'ID канала не может быть ссылкой. Используй @username или числовой ID (-1001234567890)' });
            return;
        }
    }
    try {
        const mergedCreds = creds
            ? { ...JSON.parse((0, crypto_1.decrypt)(account.encryptedCreds)), ...creds }
            : JSON.parse((0, crypto_1.decrypt)(account.encryptedCreds));
        const adapter = (0, social_1.createSocialAdapter)(account.platform, mergedCreds);
        const ok = await adapter.verify();
        if (!ok) {
            res.status(400).json({ error: 'Не удалось подключиться — проверь данные' });
            return;
        }
        await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
                ...(label ? { label } : {}),
                encryptedCreds: (0, crypto_1.encrypt)(JSON.stringify(mergedCreds)),
            },
        });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// DELETE /social/:id — отключить аккаунт
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    await prisma.socialAccount.updateMany({
        where: { id: req.params.id, companyId: req.companyId },
        data: { isActive: false },
    });
    res.json({ ok: true });
});
exports.default = router;
