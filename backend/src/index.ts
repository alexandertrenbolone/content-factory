import 'dotenv/config';

// Валидация обязательных переменных окружения
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY', 'REDIS_URL'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] CRITICAL: missing required env vars: ${missing.join(', ')}`);
  console.error('[startup] Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './routes/auth';
import keysRouter from './routes/keys';
import storageRouter from './routes/storage';
import socialRouter from './routes/social';
import sourcesRouter from './routes/sources';
import topicsRouter from './routes/topics';
import postsRouter from './routes/posts';

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем запросы с фронтенда (GitHub Pages или localhost в dev-режиме)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json());

// Все API-роуты под /api/ — не конфликтуют с SPA-страницами при F5
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/keys', keysRouter);
app.use('/api/storage', storageRouter);
app.use('/api/social', socialRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/posts', postsRouter);

// Production: Express раздаёт собранный React frontend + SPA fallback
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // Все неизвестные GET → index.html (React Router обработает роутинг)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
