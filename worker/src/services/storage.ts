import { google } from 'googleapis';
import { Readable } from 'stream';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../crypto';

const PLATFORM_FOLDER: Record<string, string> = {
  telegram:  'Telegram',
  vk:        'ВКонтакте',
  pinterest: 'Pinterest',
  dzen:      'Дзен',
};

// Google Drive: upload to Content Factory/{platform}/{topicName}/
export async function uploadToGoogleDrive(
  accessToken: string,
  refreshToken: string,
  platform: string,
  topicName: string,
  fileName: string,
  content: Buffer,
): Promise<void> {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: client });

  async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const q = parentId
      ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await drive.files.list({ q, fields: 'files(id)' });
    if (res.data.files && res.data.files.length > 0) return res.data.files[0].id!;
    const folder = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      },
      fields: 'id',
    });
    return folder.data.id!;
  }

  const platformFolder = PLATFORM_FOLDER[platform] || platform;
  const rootId = await findOrCreateFolder('Content Factory');
  const platformId = await findOrCreateFolder(platformFolder, rootId);
  const subId = await findOrCreateFolder(topicName, platformId);

  const stream = Readable.from(content);
  await drive.files.create({
    requestBody: { name: fileName, parents: [subId] },
    media: { mimeType: 'text/plain', body: stream },
    fields: 'id',
  });
}

// Yandex Disk: upload to Content Factory/{platform}/{topicName}/
export async function uploadToYandexDisk(
  accessToken: string,
  refreshToken: string | null,
  platform: string,
  topicName: string,
  fileName: string,
  content: Buffer,
  prisma?: PrismaClient,
  connId?: string,
): Promise<void> {
  let token = accessToken;

  async function ensureFolder(headers: Record<string, string>, folderPath: string): Promise<void> {
    // Яндекс не принимает body в PUT для создания папки
    const res = await axios.put(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(folderPath)}`,
      null,
      { headers, validateStatus: (s) => s === 201 || s === 409 },
    );
    if (res.status !== 201 && res.status !== 409) {
      throw new Error(`Yandex folder create failed (${res.status}): ${JSON.stringify(res.data)}`);
    }
  }

  // Проверяем токен — если 401, пробуем обновить через refresh_token
  async function doUpload(t: string): Promise<void> {
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
    const uploadUrlResp = await axios.get(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`,
      { headers },
    );
    console.log(`[storage/yandex] Uploading file...`);
    await axios.put(uploadUrlResp.data.href, content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    await doUpload(token);
  } catch (err: any) {
    const status = err?.response?.status;
    // Если 401 и есть refresh_token — обновляем
    if (status === 401 && refreshToken && prisma && connId) {
      console.log('[storage] Yandex token expired, refreshing...');
      const resp = await axios.post(
        'https://oauth.yandex.ru/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.YANDEX_CLIENT_ID!,
          client_secret: process.env.YANDEX_CLIENT_SECRET!,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      token = resp.data.access_token;
      const expiresAt = new Date(Date.now() + resp.data.expires_in * 1000);
      await prisma.storageConnection.update({
        where: { id: connId },
        data: {
          encryptedAccessToken: encrypt(token),
          ...(resp.data.refresh_token ? { encryptedRefreshToken: encrypt(resp.data.refresh_token) } : {}),
          expiresAt,
        },
      });
      console.log('[storage] Yandex token refreshed, retrying upload...');
      await doUpload(token);
    } else {
      throw err;
    }
  }
}
