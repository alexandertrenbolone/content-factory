"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
class TelegramAdapter {
    botToken;
    chatId;
    base;
    constructor(botToken, chatId // @channelname или -1001234567890
    ) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.base = `https://api.telegram.org/bot${botToken}`;
    }
    async verify() {
        // 1. Проверяем что токен бота валидный
        const meRes = await axios_1.default.get(`${this.base}/getMe`);
        if (!meRes.data.ok)
            return false;
        // 2. Проверяем что chat_id существует и бот имеет доступ
        try {
            const chatRes = await axios_1.default.get(`${this.base}/getChat`, {
                params: { chat_id: this.chatId },
            });
            if (!chatRes.data.ok) {
                throw new Error(`Канал "${this.chatId}" не найден. Убедись что бот добавлен в канал как администратор`);
            }
        }
        catch (e) {
            if (e.response?.data?.description) {
                const desc = e.response.data.description;
                if (desc.includes('chat not found')) {
                    throw new Error(`Канал "${this.chatId}" не найден. Убедись: 1) бот добавлен в канал как администратор, 2) ID в формате @username или -1001234567890`);
                }
                if (desc.includes('Forbidden')) {
                    throw new Error(`Бот не имеет доступа к каналу "${this.chatId}". Добавь бота как администратора канала`);
                }
                throw new Error(`Ошибка Telegram: ${desc}`);
            }
            throw e;
        }
        return true;
    }
    async publish(content) {
        const MAX_TEXT = 4096;
        const MAX_CAPTION = 1024;
        const text = content.text.length > MAX_TEXT ? content.text.slice(0, MAX_TEXT - 1) + '…' : content.text;
        try {
            if (content.imageUrl) {
                const caption = content.text.length > MAX_CAPTION ? content.text.slice(0, MAX_CAPTION - 1) + '…' : content.text;
                let res;
                try {
                    let imgBuffer;
                    let mimeType = 'image/jpeg';
                    if (content.imageUrl.startsWith('data:')) {
                        // Байты уже скачаны при генерации — извлекаем реальный MIME тип
                        const commaIdx = content.imageUrl.indexOf(',');
                        if (commaIdx === -1)
                            throw new Error('Invalid data URL: missing comma separator');
                        mimeType = content.imageUrl.split(';')[0].split(':')[1] || 'image/jpeg';
                        imgBuffer = Buffer.from(content.imageUrl.slice(commaIdx + 1), 'base64');
                    }
                    else {
                        // Fallback: скачиваем с retry (для старых постов без data URL)
                        let downloaded = null;
                        let downloadedMime = 'image/jpeg';
                        for (let attempt = 1; attempt <= 3; attempt++) {
                            try {
                                const imgRes = await axios_1.default.get(content.imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
                                downloaded = Buffer.from(imgRes.data);
                                downloadedMime = imgRes.headers['content-type']?.split(';')[0].trim() || 'image/jpeg';
                                break;
                            }
                            catch (downloadErr) {
                                if (attempt === 3)
                                    throw downloadErr;
                                console.warn(`[telegram] Image download attempt ${attempt} failed, retrying in ${attempt * 2}s...`);
                                await new Promise((r) => setTimeout(r, attempt * 2000));
                            }
                        }
                        imgBuffer = downloaded;
                        mimeType = downloadedMime;
                    }
                    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
                    const form = new form_data_1.default();
                    form.append('chat_id', this.chatId);
                    form.append('caption', caption);
                    form.append('photo', imgBuffer, { filename: `image.${ext}`, contentType: mimeType });
                    res = await axios_1.default.post(`${this.base}/sendPhoto`, form, { headers: form.getHeaders() });
                }
                catch (imgErr) {
                    console.warn(`[telegram] Image send failed, posting without photo: ${imgErr.message}`);
                    res = await axios_1.default.post(`${this.base}/sendMessage`, { chat_id: this.chatId, text });
                }
                const msg = res.data.result;
                return `https://t.me/c/${String(this.chatId).replace('-100', '')}/${msg.message_id}`;
            }
            const res = await axios_1.default.post(`${this.base}/sendMessage`, {
                chat_id: this.chatId,
                text,
            });
            const msg = res.data.result;
            return `https://t.me/c/${String(this.chatId).replace('-100', '')}/${msg.message_id}`;
        }
        catch (e) {
            const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
            throw new Error(`Telegram API error: ${detail}`);
        }
    }
}
exports.TelegramAdapter = TelegramAdapter;
