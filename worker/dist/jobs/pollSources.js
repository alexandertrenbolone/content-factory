"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollSources = pollSources;
const client_1 = require("@prisma/client");
const rss_parser_1 = __importDefault(require("rss-parser"));
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
const prisma = new client_1.PrismaClient();
const parser = new rss_parser_1.default({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
});
const generateQueue = new bullmq_1.Queue('generatePost', { connection: redis_1.redisConnection });
async function pollSources() {
    const allSources = await prisma.source.findMany({ where: { isActive: true } });
    const now = Date.now();
    const sources = allSources.filter((src) => {
        if (!src.lastFetched)
            return true;
        return now - src.lastFetched.getTime() >= src.pollIntervalMinutes * 60 * 1000;
    });
    if (sources.length === 0) {
        console.log('[pollSources] No sources due for polling');
        return;
    }
    console.log(`[pollSources] Checking ${sources.length}/${allSources.length} due sources...`);
    for (const source of sources) {
        try {
            const feed = await parser.parseURL(source.url);
            const items = feed.items.slice(0, 5); // берём 5 последних
            for (const item of items) {
                if (!item.link || !item.title)
                    continue;
                // Проверяем что пост ещё не обрабатывали
                const exists = await prisma.post.findFirst({
                    where: { companyId: source.companyId, sourceUrl: item.link },
                });
                if (exists)
                    continue;
                // Находим активные темы: если источник привязан к теме — только она, иначе все
                const topics = source.topicId
                    ? await prisma.topic.findMany({ where: { id: source.topicId, isActive: true } })
                    : await prisma.topic.findMany({ where: { companyId: source.companyId, isActive: true } });
                for (const topic of topics) {
                    await generateQueue.add('generatePost', {
                        companyId: source.companyId,
                        topicId: topic.id,
                        sourceUrl: item.link,
                        sourceTitle: item.title,
                        sourceContent: item.contentSnippet || item.content || item.title,
                    });
                    console.log(`[pollSources] Queued: "${item.title}" for topic "${topic.name}"`);
                }
            }
            await prisma.source.update({
                where: { id: source.id },
                data: { lastFetched: new Date() },
            });
        }
        catch (e) {
            console.error(`[pollSources] Error fetching ${source.url}:`, e.message);
        }
    }
}
