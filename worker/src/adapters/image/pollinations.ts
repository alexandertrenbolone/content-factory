import axios from 'axios';
import { ImageAdapter } from './types';

// Pollinations.ai — полностью бесплатно, без API ключа
export class PollinationsAdapter implements ImageAdapter {
  async generate(prompt: string): Promise<string> {
    const encoded = encodeURIComponent(prompt.slice(0, 500));
    const seed = Math.floor(Math.random() * 1000000);
    // 768x768 вместо 1024x1024 — в 2 раза быстрее генерируется
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${seed}&nologo=true&enhance=false`;

    // Скачиваем сразу здесь с увеличенным таймаутом (2 мин)
    // Возвращаем data URL — generatePost не будет повторно скачивать
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 120000,
    });
    const contentType = (response.headers['content-type'] as string || 'image/jpeg').split(';')[0].trim();
    return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
  }
}
