"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthUrl = getAuthUrl;
exports.exchangeCode = exchangeCode;
exports.uploadFile = uploadFile;
const axios_1 = __importDefault(require("axios"));
const CLIENT_ID = process.env.YANDEX_CLIENT_ID || '';
const CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.YANDEX_REDIRECT_URI || 'http://localhost:3000/storage/yandex/callback';
function getAuthUrl(state) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        state,
    });
    return `https://oauth.yandex.ru/authorize?${params}`;
}
async function exchangeCode(code) {
    const response = await axios_1.default.post('https://oauth.yandex.ru/token', new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return response.data; // { access_token, refresh_token, expires_in }
}
async function uploadFile(accessToken, fileName, content, folderName = 'Content Factory') {
    const headers = { Authorization: `OAuth ${accessToken}` };
    const path = `disk:/${folderName}/${fileName}`;
    // Создать папку если нет
    await axios_1.default.put(`https://cloud-api.yandex.net/v1/disk/resources?path=disk:/${folderName}`, {}, { headers, validateStatus: (s) => s < 500 });
    // Получить URL для загрузки
    const uploadUrlResp = await axios_1.default.get(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, { headers });
    // Загрузить файл
    await axios_1.default.put(uploadUrlResp.data.href, content, {
        headers: { 'Content-Type': 'application/octet-stream' },
    });
    // Получить публичную ссылку
    await axios_1.default.put(`https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(path)}`, {}, { headers });
    const meta = await axios_1.default.get(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}&fields=public_url`, { headers });
    return meta.data.public_url || path;
}
