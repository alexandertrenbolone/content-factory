"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VkAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const API = 'https://api.vk.com/method';
const V = '5.199';
class VkAdapter {
    accessToken;
    groupId;
    constructor(accessToken, groupId // числовой ID группы без минуса
    ) {
        this.accessToken = accessToken;
        this.groupId = groupId;
    }
    async verify() {
        const res = await axios_1.default.get(`${API}/groups.getById`, {
            params: { group_id: this.groupId, access_token: this.accessToken, v: V },
        });
        return !res.data.error;
    }
    async publish(content) {
        let attachments = '';
        if (content.imageUrl) {
            // Получить upload server
            const uploadServer = await axios_1.default.get(`${API}/photos.getWallUploadServer`, {
                params: { group_id: this.groupId, access_token: this.accessToken, v: V },
            });
            const uploadUrl = uploadServer.data.response.upload_url;
            // Скачать изображение
            const imageRes = await axios_1.default.get(content.imageUrl, { responseType: 'arraybuffer' });
            const FormData = (await Promise.resolve().then(() => __importStar(require('form-data')))).default;
            const form = new FormData();
            form.append('photo', Buffer.from(imageRes.data), { filename: 'image.jpg', contentType: 'image/jpeg' });
            // Загрузить на VK
            const uploaded = await axios_1.default.post(uploadUrl, form, { headers: form.getHeaders() });
            const saved = await axios_1.default.get(`${API}/photos.saveWallPhoto`, {
                params: { ...uploaded.data, group_id: this.groupId, access_token: this.accessToken, v: V },
            });
            const photo = saved.data.response[0];
            attachments = `photo${photo.owner_id}_${photo.id}`;
        }
        const res = await axios_1.default.post(`${API}/wall.post`, null, {
            params: {
                owner_id: `-${this.groupId}`,
                message: content.text,
                attachments: attachments || undefined,
                from_group: 1,
                access_token: this.accessToken,
                v: V,
            },
        });
        const postId = res.data.response?.post_id;
        return `https://vk.com/wall-${this.groupId}_${postId}`;
    }
}
exports.VkAdapter = VkAdapter;
