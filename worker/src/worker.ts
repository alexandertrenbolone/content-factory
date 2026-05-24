import 'dotenv/config';

// Валидация обязательных переменных окружения
const REQUIRED_ENV = ['DATABASE_URL', 'ENCRYPTION_KEY', 'REDIS_URL'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] CRITICAL: missing required env vars: ${missing.join(', ')}`);
  console.error('[startup] Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

import { Worker, Queue, RepeatableJob } from 'bullmq';
import { redisConnection } from './redis';
import { pollSources } from './jobs/pollSources';
import { generatePost } from './jobs/generatePost';
import { publishPost } from './jobs/publishPost';

async function main() {
  console.log('[worker] Starting Content Factory Worker...');

  // Воркер для генерации постов — concurrency=1 чтобы не перегружать LLM API
  const generateWorker = new Worker('generatePost', async (job) => {
    await generatePost(job.data);
  }, { connection: redisConnection, concurrency: 1 });

  // Воркер для публикации постов
  const publishWorker = new Worker('publishPost', async (job) => {
    await publishPost(job.data);
  }, { connection: redisConnection, concurrency: 1 });

  // Воркер для опроса RSS
  const pollWorker = new Worker('pollSources', async () => {
    await pollSources();
  }, { connection: redisConnection, concurrency: 1 });

  // Запускаем опрос RSS каждые 10 минут
  const pollQueue = new Queue('pollSources', { connection: redisConnection });
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

  redisConnection.on('connect', () => console.log('[redis] Connected'));
  redisConnection.on('error', (err) => console.error('[redis] Error:', err.message));

  console.log('[worker] Ready. Polling RSS every 10 minutes.');
}

main().catch(console.error);
