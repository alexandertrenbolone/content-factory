"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DzenAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
class DzenAdapter {
    accessToken;
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    async verify() {
        const res = await axios_1.default.get('https://dzen.ru/api/v3/publisher/channel', {
            headers: { Authorization: `OAuth ${this.accessToken}` },
            validateStatus: (s) => s < 500,
        });
        return res.status === 200;
    }
    async publish(content) {
        const body = {
            title: content.text.split('\n')[0].slice(0, 100),
            content: [{ type: 'paragraph', text: content.text }],
        };
        // data: URLs не поддерживаются Dzen API — передаём только HTTP ссылки
        if (content.imageUrl && !content.imageUrl.startsWith('data:')) {
            body.cover = { type: 'image', imageUrl: content.imageUrl };
        }
        const res = await axios_1.default.post('https://dzen.ru/api/v3/publisher/articles', body, {
            headers: {
                Authorization: `OAuth ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        return res.data.url || 'https://dzen.ru';
    }
}
exports.DzenAdapter = DzenAdapter;
