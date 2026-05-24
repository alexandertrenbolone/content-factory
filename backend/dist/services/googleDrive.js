"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOAuthClient = createOAuthClient;
exports.getAuthUrl = getAuthUrl;
exports.exchangeCode = exchangeCode;
exports.uploadFile = uploadFile;
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/storage/google/callback';
function createOAuthClient() {
    return new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}
function getAuthUrl(state) {
    const client = createOAuthClient();
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        state,
        prompt: 'consent',
    });
}
async function exchangeCode(code) {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    return tokens;
}
async function uploadFile(accessToken, refreshToken, fileName, content, mimeType, folderName = 'Content Factory') {
    const client = createOAuthClient();
    client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const drive = googleapis_1.google.drive({ version: 'v3', auth: client });
    // Найти или создать папку
    const folderSearch = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
    });
    let folderId;
    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
        folderId = folderSearch.data.files[0].id;
    }
    else {
        const folder = await drive.files.create({
            requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
            fields: 'id',
        });
        folderId = folder.data.id;
    }
    // Загрузить файл
    const stream = stream_1.Readable.from(content);
    const file = await drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: { mimeType, body: stream },
        fields: 'id,webViewLink',
    });
    return file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}`;
}
