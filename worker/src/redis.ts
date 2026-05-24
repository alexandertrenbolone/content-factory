import { Redis } from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL!;
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
});
