import axios from 'axios';
import { ImageAdapter } from './types';

export class TogetherImageAdapter implements ImageAdapter {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.together.ai/v1/images/generations',
      {
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt,
        n: 1,
        width: 1024,
        height: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      },
    );

    const url: string | undefined = response.data.data?.[0]?.url;
    if (url) return url;

    const b64: string | undefined = response.data.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;

    throw new Error('No image in Together AI response');
  }
}
