# Content Factory

Автоматизированный SaaS для генерации и публикации контента в социальные сети. Собирает материал из RSS-лент, генерирует посты с помощью AI и публикует их по расписанию — без ручного участия.

---

## Что умеет

- **RSS → AI → Соцсети** — полный конвейер: источник, генерация текста, изображение, публикация
- **Несколько LLM на выбор** — Groq (бесплатно), Gemini, Anthropic, OpenAI, Mistral — переключается в интерфейсе
- **Изображения** — Pollinations (бесплатно без ключа), FAL.ai
- **Публикация** — Telegram-каналы и ВКонтакте группы, несколько аккаунтов одновременно
- **Расписание** — настраиваемый интервал публикации для каждой темы отдельно
- **Облачное хранилище** — интеграция с Google Drive для архивации постов
- **Безопасность** — все токены хранятся в зашифрованном виде (AES-256-GCM)

---

## Стек

| Слой | Технологии |
|------|-----------|
| Фронтенд | React 18, TypeScript, Vite, Tailwind CSS |
| Бэкенд | Node.js 24, Express 4, Prisma 5, SQLite |
| Воркер | BullMQ, Upstash Redis |
| AI | Groq / Gemini / Anthropic / OpenAI / Mistral / Ollama |
| Деплой | Railway (backend + worker), GitHub Pages (frontend) |

---

## Быстрый старт (локально)

### Требования
- Node.js 20+
- Redis (или [Upstash](https://upstash.com) бесплатный инстанс)

### 1. Клонировать и установить зависимости

```bash
git clone https://github.com/YOUR_USERNAME/content-factory.git
cd content-factory

cd backend && npm install
cd ../worker && npm install
cd ../frontend && npm install
```

### 2. Настроить переменные окружения

```bash
# backend
cp backend/.env.example backend/.env

# worker
cp worker/.env.example worker/.env
```

Минимально необходимые переменные в `backend/.env`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-random-secret-32-chars-min"
ENCRYPTION_KEY="your-32-char-encryption-key-here"
REDIS_URL="redis://localhost:6379"
```

В `worker/.env` те же переменные, кроме JWT_SECRET.

### 3. Инициализировать базу данных

```bash
cd backend
npx prisma migrate dev
```

### 4. Запустить все три сервиса

```bash
# Терминал 1 — бэкенд
cd backend && npm run dev

# Терминал 2 — воркер
cd worker && npm run dev

# Терминал 3 — фронтенд
cd frontend && npm run dev
```

Открыть: **http://localhost:5173**

---

## Деплой

Проект можно запустить бесплатно:
- **Backend + Worker** → [Railway](https://railway.app) (бесплатный tier)
- **Frontend** → GitHub Pages (автоматически через GitHub Actions)

### Настройка Railway

1. Создать новый проект на Railway
2. Добавить два сервиса из монорепозитория:
   - `backend/` — API сервер
   - `worker/` — фоновый воркер
3. Добавить Upstash Redis как плагин
4. Задать переменные окружения для каждого сервиса (см. `.env.example`)

### Настройка GitHub Pages

1. В настройках репозитория включить GitHub Pages → Source: **GitHub Actions**
2. Добавить секрет `VITE_API_URL` со значением URL вашего Railway бэкенда (например: `https://your-backend.railway.app`)
3. При push в `main` фронтенд соберётся и задеплоится автоматически

> **Важный момент про бесплатный деплой:** SQLite на Railway хранится в эфемерной файловой системе — при перезапуске сервиса база данных сбрасывается. Для продакшена нужна PostgreSQL, но для демонстрации и тестирования работает нормально. Если хотите сохранность данных бесплатно — Railway + PlanetScale (MySQL) или Neon (PostgreSQL) решают задачу.
>
> Если вы видите этот проект и хотите пощупать его в деле — можно запустить локально за 5 минут по инструкции выше, либо посмотреть на работающую демо-версию: **[демо на GitHub Pages](https://YOUR_USERNAME.github.io/content-factory)**

---

## Архитектура

```
frontend/ (React SPA)
    ↓ HTTP (VITE_API_URL в prod, Vite proxy в dev)
backend/ (Express API)
    ↓ BullMQ jobs → Redis
worker/ (BullMQ consumer)
    ↓ Prisma → SQLite
    ↓ AI adapters (LLM + Image)
    ↓ Social adapters (Telegram, VK)
```

Две отдельные Prisma схемы — `backend/prisma/` и `worker/prisma/`. Миграции запускаются только из `backend/`, воркер использует только `prisma generate`.

---

## Структура проекта

```
content-factory/
├── backend/          # Express API, JWT аутентификация, очередь задач
│   ├── src/
│   │   ├── routes/   # auth, keys, social, sources, topics, posts
│   │   ├── adapters/ # LLM адаптеры (6 провайдеров)
│   │   └── lib/      # шифрование, JWT, утилиты
│   └── prisma/       # схема и миграции
├── worker/           # BullMQ воркер, генерация и публикация
│   ├── src/
│   │   ├── jobs/     # generatePost, publishPost
│   │   └── adapters/ # image (Pollinations, FAL), social (Telegram, VK)
│   └── prisma/       # копия схемы для генерации клиента
└── frontend/         # React 18 + Tailwind SPA
    └── src/
        ├── pages/    # Auth, Topics, Posts, Keys, Social, Sources
        └── components/
```

---

## Конфигурация провайдеров

После регистрации перейти в **Settings → API Keys** и добавить ключи:

| Провайдер | Где получить | Бесплатно |
|-----------|-------------|-----------|
| Groq | [console.groq.com](https://console.groq.com) | ✅ да |
| Gemini | [aistudio.google.com](https://aistudio.google.com) | ✅ да |
| Pollinations | не нужен | ✅ да |
| FAL.ai | [fal.ai/dashboard](https://fal.ai/dashboard) | частично |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) | платно |
| OpenAI | [platform.openai.com](https://platform.openai.com) | платно |

> Для работы без единого платного ключа: Groq (LLM) + Pollinations (изображения) — оба бесплатны.

---

## Особенности реализации

- **Картинки как data URL** — изображения скачиваются в воркере сразу при генерации и хранятся в базе в виде base64. Это решает проблему истечения временных ссылок у image API до момента публикации.
- **MIME-тип из заголовков** — тип изображения (PNG/JPEG) определяется из `Content-Type` ответа, а не захардкожен. Pollinations отдаёт PNG, FAL — JPEG, оба корректно передаются в Telegram и VK.
- **Retry с backoff** — Telegram adapter делает до 3 попыток скачать картинку перед публикацией без фото.
- **Шифрование ключей** — все API ключи шифруются AES-256-GCM перед записью в базу, расшифровываются только в runtime.
- **Fallback модели Groq** — если основная модель (llama-3.3-70b) недоступна, автоматически переключается на резервные.
