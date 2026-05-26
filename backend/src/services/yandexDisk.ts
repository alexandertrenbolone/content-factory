import axios from 'axios';

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.YANDEX_CLIENT_ID || '',
    redirect_uri: process.env.YANDEX_REDIRECT_URI || 'http://localhost:3000/storage/yandex/callback',
    state,
  });
  return `https://oauth.yandex.ru/authorize?${params}`;
}

export async function exchangeCode(code: string) {
  const response = await axios.post(
    'https://oauth.yandex.ru/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.YANDEX_CLIENT_ID || '',
      client_secret: process.env.YANDEX_CLIENT_SECRET || '',
      redirect_uri: process.env.YANDEX_REDIRECT_URI || 'http://localhost:3000/storage/yandex/callback',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data; // { access_token, refresh_token, expires_in }
}

export async function uploadFile(
  accessToken: string,
  fileName: string,
  content: Buffer,
  folderName = 'Content Factory'
): Promise<string> {
  const headers = { Authorization: `OAuth ${accessToken}` };
  const path = `disk:/${folderName}/${fileName}`;

  // Создать папку если нет
  await axios.put(
    `https://cloud-api.yandex.net/v1/disk/resources?path=disk:/${folderName}`,
    {},
    { headers, validateStatus: (s) => s < 500 }
  );

  // Получить URL для загрузки
  const uploadUrlResp = await axios.get(
    `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`,
    { headers }
  );

  // Загрузить файл
  await axios.put(uploadUrlResp.data.href, content, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  // Получить публичную ссылку
  await axios.put(
    `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(path)}`,
    {},
    { headers }
  );

  const meta = await axios.get(
    `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}&fields=public_url`,
    { headers }
  );

  return meta.data.public_url || path;
}
