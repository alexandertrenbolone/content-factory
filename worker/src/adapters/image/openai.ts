import OpenAI from 'openai';
import { ImageAdapter } from './types';

export class OpenAIImageAdapter implements ImageAdapter {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.images.generate({
      model: 'dall-e-2',
      prompt,
      n: 1,
      size: '1024x1024',
    });
    return response.data?.[0]?.url ?? '';
  }
}
