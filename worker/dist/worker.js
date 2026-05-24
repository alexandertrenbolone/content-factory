"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// Валидация обязательных переменных окружения
const REQUIRED_ENV = ['DATABASE_URL', 'ENCRYPTION_KEY', 'REDIS_URL'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
    console.error(`[startup] CRITICAL: missing required env vars: ${missing.join(', ')}`);
    console.error('[startup] Copy .env.example to .env and fill in the values.');
    process.exit(1);
}
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const pollSources_1 = require("./jobs/pollSources");
const generatePost_1 = require("./jobs/generatePost");
const publishPost_1 = require("./jobs/publishPost");
async function main() {
    console.log('[worker] Starting Content Factory Worker...');
    // Воркер для генерации постов — concurrency=1 чтобы не перегружать LLM API
    const generateWorker = new bullmq_1.Worker('generatePost', async (job) => {
        await (0, generatePost_1.generatePost)(job.data);
    }, { connection: redis_1.redisConnection, concurrency: 1 });
    // Воркер для публикации постов
    const publishWorker = new bullmq_1.Worker('publishPost', async (job) => {
        await (0, publishPost_1.publishPost)(job.data);
    }, { connection: redis_1.redisConnection, concurrency: 1 });
    // Воркер для опроса RSS
    const pollWorker = new bullmq_1.Worker('pollSources', async () => {
        await (0, pollSources_1.pollSources)();
    }, { connection: redis_1.redisConnection, concurrency: 1 });
    // Запускаем опрос RSS каждые 10 минут
    const pollQueue = new bullmq_1.Queue('pollSources', { connection: redis_1.redisConnection });
    await pollQueue.upsertJobScheduler('poll-every-10min', { every: 10 * 60 * 1000 }, {
        name: 'poll',
        data: {},
    });
    // Сразу запускаем первый опрос
    await pollQueue.add('poll-now', {});
    generateWorker.on('completed', (job) => console.log(`[generatePost] Done: ${job.id}`));
    generateWorker.on('failed', (job, err) => console.error(`[generatePost] Failed: ${job?.id}`, err.message));
    publishWorker.on('completed', (job) => console.log(`[publishPost] Done: ${job.id}`));
    publishWorker.on('failed', (job, err) => console.error(`[publishPost] Failed: ${job?.id}`, err.message));
    pollWorker.on('completed', (job) => console.log(`[pollSources] Done: ${job.id}`));
    pollWorker.on('failed', (job, err) => console.error(`[pollSources] Failed: ${job?.id}`, err.message, err.stack));
    pollWorker.on('error', (err) => console.error(`[pollSources] Worker error:`, err.message));
    redis_1.redisConnection.on('connect', () => console.log('[redis] Connected'));
    redis_1.redisConnection.on('error', (err) => console.error('[redis] Error:', err.message));
    console.log('[worker] Ready. Polling RSS every 10 minutes.');
}
main().catch(console.error);
