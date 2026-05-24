"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollinationsAdapter = void 0;
// Pollinations.ai — бесплатно, без API ключа
class PollinationsAdapter {
    async generate(prompt) {
        const encoded = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1000000);
        // Не указываем model= — бесплатная дефолтная модель. Pollinations возвращает PNG/JPEG, что поддерживается Telegram и VK.
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true`;
        return url;
    }
}
exports.PollinationsAdapter = PollinationsAdapter;
