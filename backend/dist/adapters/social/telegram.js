"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
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
        const res = await axios_1.default.get(`${this.base}/getMe`);
        return res.data.ok === true;
    }
    async publish(content) {
        if (content.imageUrl) {
            const res = await axios_1.default.post(`${this.base}/sendPhoto`, {
                chat_id: this.chatId,
                photo: content.imageUrl,
                caption: content.text,
                parse_mode: 'HTML',
            });
            const msg = res.data.result;
            return `https://t.me/c/${String(this.chatId).replace('-100', '')}/${msg.message_id}`;
        }
        const res = await axios_1.default.post(`${this.base}/sendMessage`, {
            chat_id: this.chatId,
            text: content.text,
            parse_mode: 'HTML',
        });
        const msg = res.data.result;
        return `https://t.me/c/${String(this.chatId).replace('-100', '')}/${msg.message_id}`;
    }
}
exports.TelegramAdapter = TelegramAdapter;
