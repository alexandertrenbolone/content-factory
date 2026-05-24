import { google } from 'googleapis';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/storage/google/callback';

export function createOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    state,
    prompt: 'consent',
  });
}

export async function exchangeCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function uploadFile(
  accessToken: string,
  refreshToken: string,
  fileName: string,
  content: Buffer,
  mimeType: string,
  folderName = 'Content Factory'
): Promise<string> {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: client });

  // Найти или создать папку
  const folderSearch = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  let folderId: string;
  if (folderSearch.data.files && folderSearch.data.files.length > 0) {
    folderId = folderSearch.data.files[0].id!;
  } else {
    const folder = await drive.files.create({
      requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    folderId = folder.data.id!;
  }

  // Загрузить файл
  const stream = Readable.from(content);
  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id,webViewLink',
  });

  return file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}`;
}
