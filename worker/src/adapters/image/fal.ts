import axios from 'axios';
import { ImageAdapter } from './types';

export class FalAdapter implements ImageAdapter {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://fal.run/fal-ai/flux/schnell',
        { prompt, image_size: 'square_hd', num_images: 1 },
        { headers: { Authorization: `Key ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 90000 }
      );
      const url = response.data?.images?.[0]?.url;
      if (!url) throw new Error('FAL: no image URL in response');
      return url;
    } catch (e: any) {
      const status = e.response?.status;
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      if (status === 403) {
        throw new Error(`FAL 403: ключ недействителен или нет доступа. Проверь ключ на fal.ai → Dashboard → API Keys. Detail: ${detail}`);
      }
      if (status === 402) {
        throw new Error(`FAL 402: недостаточно кредитов. Пополни баланс на fal.ai`);
      }
      throw new Error(`FAL error ${status}: ${detail}`);
    }
  }
}
