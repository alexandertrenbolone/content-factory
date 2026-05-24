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
      // Получить upload server
      const uploadServer = await axios.get(`${API}/photos.getWallUploadServer`, {
        params: { group_id: this.groupId, access_token: this.accessToken, v: V },
      });
      const uploadUrl = uploadServer.data.response.upload_url;

      // Скачать изображение
      const imageRes = await axios.get(content.imageUrl, { responseType: 'arraybuffer' });
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('photo', Buffer.from(imageRes.data), { filename: 'image.jpg', contentType: 'image/jpeg' });

      // Загрузить на VK
      const uploaded = await axios.post(uploadUrl, form, { headers: form.getHeaders() });
      const saved = await axios.get(`${API}/photos.saveWallPhoto`, {
        params: { ...uploaded.data, group_id: this.groupId, access_token: this.accessToken, v: V },
      });
      const photo = saved.data.response[0];
      attachments = `photo${photo.owner_id}_${photo.id}`;
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
