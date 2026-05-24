import axios from 'axios';
import { SocialAdapter, PostContent } from './types';

const API = 'https://api.vk.com/method';
const V = '5.199';

export class VkAdapter implements SocialAdapter {
  constructor(
    private accessToken: string,
    private groupId: string // числовой ID группы без минуса
  ) {}

  async verify(): Promise<boolean> {
    const res = await axios.get(`${API}/groups.getById`, {
      params: { group_id: this.groupId, access_token: this.accessToken, v: V },
    });
    return !res.data.error;
  }

  async publish(content: PostContent): Promise<string> {
    let attachments = '';

    if (content.imageUrl) {
      try {
        // Получить upload server
        const uploadServer = await axios.get(`${API}/photos.getWallUploadServer`, {
          params: { group_id: this.groupId, access_token: this.accessToken, v: V },
        });
        if (uploadServer.data.error) {
          throw new Error(`VK getWallUploadServer error: ${JSON.stringify(uploadServer.data.error)}`);
        }
        const uploadUrl = uploadServer.data.response.upload_url;
        console.log(`[vk] Got upload URL, uploading image...`);

        // Получаем байты — либо из data URL (уже скачано), либо скачиваем
        let imgBuffer: Buffer;
        let mimeType = 'image/jpeg';
        if (content.imageUrl.startsWith('data:')) {
          // Извлекаем реальный MIME тип из data URL (может быть image/png)
          const commaIdx = content.imageUrl.indexOf(',');
          if (commaIdx === -1) throw new Error('Invalid data URL: missing comma separator');
          mimeType = content.imageUrl.split(';')[0].split(':')[1] || 'image/jpeg';
          imgBuffer = Buffer.from(content.imageUrl.slice(commaIdx + 1), 'base64');
        } else {
          const imageRes = await axios.get(content.imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
          mimeType = (imageRes.headers['content-type'] as string | undefined)?.split(';')[0].trim() || 'image/jpeg';
          imgBuffer = Buffer.from(imageRes.data);
        }
        const ext = mimeType === 'image/png' ? 'png' : 'jpg';
        console.log(`[vk] Image buffer size: ${imgBuffer.length} bytes, mime: ${mimeType}`);

        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('photo', imgBuffer, { filename: `image.${ext}`, contentType: mimeType });

        // Загрузить на VK
        const uploaded = await axios.post(uploadUrl, form, { headers: form.getHeaders() });
        console.log(`[vk] Upload response:`, JSON.stringify(uploaded.data));

        // Передаём поля явно — spread JSON-строки photo в params ломает кодировку
        const saved = await axios.post(`${API}/photos.saveWallPhoto`, null, {
          params: {
            server: uploaded.data.server,
            hash: uploaded.data.hash,
            photo: uploaded.data.photo,
            group_id: this.groupId,
            access_token: this.accessToken,
            v: V,
          },
        });
        console.log(`[vk] Save response:`, JSON.stringify(saved.data));

        if (saved.data.error) {
          throw new Error(`VK saveWallPhoto error: ${JSON.stringify(saved.data.error)}`);
        }
        const photo = saved.data.response?.[0];
        if (!photo) {
          throw new Error(`VK saveWallPhoto: empty response array`);
        }
        attachments = `photo${photo.owner_id}_${photo.id}`;
        console.log(`[vk] Image attached: ${attachments}`);
      } catch (imgErr: any) {
        // Если фото не загрузилось — публикуем без него
        console.warn(`[vk] Image upload failed, posting without photo: ${imgErr.message}`);
      }
    }

    const res = await axios.post(`${API}/wall.post`, null, {
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
