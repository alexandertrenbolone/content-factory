"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// Валидация обязательных переменных окружения
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY', 'REDIS_URL'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
    console.error(`[startup] CRITICAL: missing required env vars: ${missing.join(', ')}`);
    console.error('[startup] Copy .env.example to .env and fill in the values.');
    process.exit(1);
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const keys_1 = __importDefault(require("./routes/keys"));
const storage_1 = __importDefault(require("./routes/storage"));
const social_1 = __importDefault(require("./routes/social"));
const sources_1 = __importDefault(require("./routes/sources"));
const topics_1 = __importDefault(require("./routes/topics"));
const posts_1 = __importDefault(require("./routes/posts"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Разрешаем запросы с фронтенда (GitHub Pages или localhost в dev-режиме)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/auth', auth_1.default);
app.use('/keys', keys_1.default);
app.use('/storage', storage_1.default);
app.use('/social', social_1.default);
app.use('/sources', sources_1.default);
app.use('/topics', topics_1.default);
app.use('/posts', posts_1.default);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
