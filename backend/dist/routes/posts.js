"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bullmq_1 = require("bullmq");
const auth_1 = require("../lib/auth");
const redis_1 = require("../redis");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const publishQueue = new bullmq_1.Queue('publishPost', { connection: redis_1.redisConnection });
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { status, cursor } = req.query;
    const take = 20;
    const posts = await prisma.post.findMany({
        where: { companyId: req.companyId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { topic: { select: { name: true } } },
    });
    const hasMore = posts.length > take;
    if (hasMore)
        posts.pop();
    res.json({ posts, hasMore, nextCursor: hasMore ? posts[posts.length - 1].id : null });
});
router.post('/clear-queue', auth_1.requireAuth, async (req, res) => {
    const { count } = await prisma.post.deleteMany({
        where: {
            companyId: req.companyId,
            status: { in: ['pending', 'failed'] },
        },
    });
    await publishQueue.drain();
    await publishQueue.clean(0, 1000, 'delayed');
    res.json({ ok: true, deleted: count });
});
router.post('/:id/publish', auth_1.requireAuth, async (req, res) => {
    const post = await prisma.post.findFirst({
        where: { id: req.params.id, companyId: req.companyId },
    });
    if (!post) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    if (post.status === 'published') {
        res.status(400).json({ error: 'Already published' });
        return;
    }
    // Сбрасываем статус failed → pending перед повторной публикацией
    if (post.status === 'failed') {
        await prisma.post.update({ where: { id: post.id }, data: { status: 'pending', error: null } });
    }
    await publishQueue.add('publishPost', { postId: post.id }, { delay: 0 });
    res.json({ ok: true });
});
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    await prisma.post.deleteMany({
        where: { id: req.params.id, companyId: req.companyId },
    });
    res.json({ ok: true });
});
exports.default = router;
