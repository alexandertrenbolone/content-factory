import axios from 'axios';
import { SocialAdapter, PostContent } from './types';

const API = 'https://api.pinterest.com/v5';

export class PinterestAdapter implements SocialAdapter {
  constructor(
    private accessToken: string,
    private boardId: string
  ) {}

  async verify(): Promise<boolean> {
    const res = await axios.get(`${API}/user_account`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      validateStatus: (s) => s < 500,
    });
    return res.status === 200;
  }

  async publish(content: PostContent): Promise<string> {
    const res = await axios.post(
      `${API}/pins`,
      {
        board_id: this.boardId,
        title: content.text.slice(0, 100),
        description: content.text,
        media_source: content.imageUrl
          ? { source_type: 'image_url', url: content.imageUrl }
          : { source_type: 'image_url', url: 'https://via.placeholder.com/800x600' },
      },
      { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
    );
    return `https://pinterest.com/pin/${res.data.id}`;
  }
}
