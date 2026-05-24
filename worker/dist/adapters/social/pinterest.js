"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinterestAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const API = 'https://api.pinterest.com/v5';
class PinterestAdapter {
    accessToken;
    boardId;
    constructor(accessToken, boardId) {
        this.accessToken = accessToken;
        this.boardId = boardId;
    }
    async verify() {
        const res = await axios_1.default.get(`${API}/user_account`, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
            validateStatus: (s) => s < 500,
        });
        return res.status === 200;
    }
    async publish(content) {
        const res = await axios_1.default.post(`${API}/pins`, {
            board_id: this.boardId,
            title: content.text.slice(0, 100),
            description: content.text,
            // data: URLs не поддерживаются Pinterest API — используем только HTTP ссылки
            media_source: (content.imageUrl && !content.imageUrl.startsWith('data:'))
                ? { source_type: 'image_url', url: content.imageUrl }
                : { source_type: 'image_url', url: 'https://via.placeholder.com/800x600' },
        }, { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } });
        return `https://pinterest.com/pin/${res.data.id}`;
    }
}
exports.PinterestAdapter = PinterestAdapter;
