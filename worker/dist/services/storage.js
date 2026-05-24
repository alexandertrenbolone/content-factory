"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToGoogleDrive = uploadToGoogleDrive;
exports.uploadToYandexDisk = uploadToYandexDisk;
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("../crypto");
const PLATFORM_FOLDER = {
    telegram: 'Telegram',
    vk: 'ВКонтакте',
    pinterest: 'Pinterest',
    dzen: 'Дзен',
};
// Google Drive: upload to Content Factory/{platform}/{topicName}/
async function uploadToGoogleDrive(accessToken, refreshToken, platform, topicName, fileName, content) {
    const client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const drive = googleapis_1.google.drive({ version: 'v3', auth: client });
    async function findOrCreateFolder(name, parentId) {
        const q = parentId
            ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
            : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const res = await drive.files.list({ q, fields: 'files(id)' });
        if (res.data.files && res.data.files.length > 0)
            return res.data.files[0].id;
        const folder = await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                ...(parentId ? { parents: [parentId] } : {}),
            },
            fields: 'id',
        });
        return folder.data.id;
    }
    const platformFolder = PLATFORM_FOLDER[platform] || platform;
    const rootId = await findOrCreateFolder('Content Factory');
    const platformId = await findOrCreateFolder(platformFolder, rootId);
    const subId = await findOrCreateFolder(topicName, platformId);
    const stream = stream_1.Readable.from(content);
    await drive.files.create({
        requestBody: { name: fileName, parents: [subId] },
        media: { mimeType: 'text/plain', body: stream },
        fields: 'id',
    });
}
// Yandex Disk: upload to Content Factory/{platform}/{topicName}/
async function uploadToYandexDisk(accessToken, refreshToken, platform, topicName, fileName, content, prisma, connId) {
    let token = accessToken;
    async function ensureFolder(headers, folderPath) {
        // Яндекс не принимает body в PUT для создания папки
        const res = await axios_1.default.put(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(folderPath)}`, null, { headers, validateStatus: (s) => s === 201 || s === 409 });
        if (res.status !== 201 && res.status !== 409) {
            throw new Error(`Yandex folder create failed (${res.status}): ${JSON.stringify(res.data)}`);
        }
    }
    // Проверяем токен — если 401, пробуем обновить через refresh_token
    async function doUpload(t) {
        const headers = { Authorization: `OAuth ${t}` };
        // Убираем только символы запрещённые в Яндекс Диске
        const platformFolder = PLATFORM_FOLDER[platform] || platform;
        const safeTopicName = topicName.replace(/[/\\:*?"<>|]/g, '-').trim();
        // Имя файла: убираем длинные тире и прочие проблемные символы
        const safeFileName = fileName.replace(/[/\\:*?"<>|]/g, '-').replace(/—/g, '-').trim();
        // Создаём папки строго по одной (родитель сначала), без body
        console.log(`[storage/yandex] Creating root folder...`);
        await ensureFolder(headers, 'disk:/Content Factory');
        console.log(`[storage/yandex] Creating platform folder: ${platformFolder}`);
        await ensureFolder(headers, `disk:/Content Factory/${platformFolder}`);
        console.log(`[storage/yandex] Creating topic folder: ${safeTopicName}`);
        await ensureFolder(headers, `disk:/Content Factory/${platformFolder}/${safeTopicName}`);
        const path = `disk:/Content Factory/${platformFolder}/${safeTopicName}/${safeFileName}`;
        console.log(`[storage/yandex] Getting upload URL for: ${safeFileName}`);
        const uploadUrlResp = await axios_1.default.get(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, { headers });
        console.log(`[storage/yandex] Uploading file...`);
        await axios_1.default.put(uploadUrlResp.data.href, content, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
    try {
        await doUpload(token);
    }
    catch (err) {
        const status = err?.response?.status;
        // Если 401 и есть refresh_token — обновляем
        if (status === 401 && refreshToken && prisma && connId) {
            console.log('[storage] Yandex token expired, refreshing...');
            const resp = await axios_1.default.post('https://oauth.yandex.ru/token', new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: process.env.YANDEX_CLIENT_ID,
                client_secret: process.env.YANDEX_CLIENT_SECRET,
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            token = resp.data.access_token;
            const expiresAt = new Date(Date.now() + resp.data.expires_in * 1000);
            await prisma.storageConnection.update({
                where: { id: connId },
                data: {
                    encryptedAccessToken: (0, crypto_1.encrypt)(token),
                    ...(resp.data.refresh_token ? { encryptedRefreshToken: (0, crypto_1.encrypt)(resp.data.refresh_token) } : {}),
                    expiresAt,
                },
            });
            console.log('[storage] Yandex token refreshed, retrying upload...');
            await doUpload(token);
        }
        else {
            throw err;
        }
    }
}
