"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const auth_1 = require("../lib/auth");
const validate_1 = require("../lib/validate");
const rss_parser_1 = __importDefault(require("rss-parser"));
function getPollQueue() {
    const redis = new ioredis_1.Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, tls: { rejectUnauthorized: false } });
    return new bullmq_1.Queue('pollSources', { connection: redis });
}
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const parser = new rss_parser_1.default({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
});
const VALID_INTERVALS = [10, 30, 60, 120, 360, 720, 1440];
router.get('/', auth_1.requireAuth, async (req, res) => {
    const sources = await prisma.source.findMany({
        where: { companyId: req.companyId, isActive: true },
        include: { topic: { select: { name: true } } },
    });
    res.json(sources);
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    const { url, name, topicId, pollIntervalMinutes } = req.body;
    if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Укажи RSS URL' });
        return;
    }
    if (!(0, validate_1.isValidUrl)(url.trim())) {
        res.status(400).json({ error: 'Неверный формат URL. Должен начинаться с http:// или https://' });
        return;
    }
    if (name !== undefined) {
        const err = (0, validate_1.validateString)(name, 'name', { min: 1, max: 100, required: false });
        if (err) {
            res.status(400).json({ error: err });
            return;
        }
    }
    const interval = parseInt(pollIntervalMinutes) || 30;
    if (!VALID_INTERVALS.includes(interval)) {
        res.status(400).json({ error: `Интервал опроса должен быть одним из: ${VALID_INTERVALS.join(', ')} минут` });
        return;
    }
    if (topicId) {
        const topic = await prisma.topic.findFirst({
            where: { id: topicId, companyId: req.companyId, isActive: true },
        });
        if (!topic) {
            res.status(404).json({ error: 'Тема не найдена' });
            return;
        }
    }
    try {
        const feed = await parser.parseURL(url.trim());
        const sourceName = (name?.trim()) || feed.title || url;
        const source = await prisma.source.upsert({
            where: { companyId_url: { companyId: req.companyId, url: url.trim() } },
            update: { isActive: true, name: sourceName, topicId: topicId || null, pollIntervalMinutes: interval },
            create: { companyId: req.companyId, url: url.trim(), name: sourceName, topicId: topicId || null, pollIntervalMinutes: interval },
        });
        res.status(201).json({ ...source, feedTitle: feed.title, itemCount: feed.items.length });
    }
    catch (e) {
        const msg = e.message || '';
        if (msg.includes('404')) {
            res.status(400).json({ error: 'RSS лента не найдена (404). Проверь URL.' });
        }
        else if (msg.includes('403')) {
            res.status(400).json({ error: 'Доступ к RSS ленте запрещён (403). Сайт блокирует запросы.' });
        }
        else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
            res.status(400).json({ error: 'Сайт не отвечает (timeout). Попробуй позже.' });
        }
        else if (msg.includes('XML') || msg.includes('parse') || msg.includes('Invalid')) {
            res.status(400).json({ error: 'Не удалось разобрать RSS. Убедись что это RSS/Atom лента, а не обычный сайт.' });
        }
        else {
            res.status(400).json({ error: `Не удалось прочитать RSS: ${msg}` });
        }
    }
});
router.post('/poll', auth_1.requireAuth, async (_req, res) => {
    await getPollQueue().add('poll-manual', {});
    res.json({ ok: true });
});
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    const { name, topicId, pollIntervalMinutes } = req.body;
    if (name !== undefined) {
        const err = (0, validate_1.validateString)(name, 'name', { min: 1, max: 100 });
        if (err) {
            res.status(400).json({ error: err });
            return;
        }
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
            where: { id: topicId, companyId: req.companyId, isActive: true },
        });
        if (!topic) {
            res.status(404).json({ error: 'Тема не найдена' });
            return;
        }
    }
    await prisma.source.updateMany({
        where: { id: req.params.id, companyId: req.companyId },
        data: {
            ...(name !== undefined && { name: String(name).trim() }),
            topicId: topicId || null,
            ...(pollIntervalMinutes !== undefined && { pollIntervalMinutes: parseInt(pollIntervalMinutes) }),
        },
    });
    res.json({ ok: true });
});
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    await prisma.source.updateMany({
        where: { id: req.params.id, companyId: req.companyId },
        data: { isActive: false },
    });
    res.json({ ok: true });
});
exports.default = router;
