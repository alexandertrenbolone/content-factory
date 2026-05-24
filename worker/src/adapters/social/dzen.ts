import axios from 'axios';
import { SocialAdapter, PostContent } from './types';

export class DzenAdapter implements SocialAdapter {
  constructor(private accessToken: string) {}

  async verify(): Promise<boolean> {
    const res = await axios.get('https://dzen.ru/api/v3/publisher/channel', {
      headers: { Authorization: `OAuth ${this.accessToken}` },
      validateStatus: (s) => s < 500,
    });
    return res.status === 200;
  }

  async publish(content: PostContent): Promise<string> {
    const body: Record<string, unknown> = {
      title: content.text.split('\n')[0].slice(0, 100),
      content: [{ type: 'paragraph', text: content.text }],
    };
    // data: URLs не поддерживаются Dzen API — передаём только HTTP ссылки
    if (content.imageUrl && !content.imageUrl.startsWith('data:')) {
      body.cover = { type: 'image', imageUrl: content.imageUrl };
    }

    const res = await axios.post('https://dzen.ru/api/v3/publisher/articles', body, {
      headers: {
        Authorization: `OAuth ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return res.data.url || 'https://dzen.ru';
  }
}
