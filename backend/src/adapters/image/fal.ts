import axios from 'axios';
import { ImageAdapter } from './types';

export class FalAdapter implements ImageAdapter {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://fal.run/fal-ai/flux/schnell',
      { prompt, image_size: 'square_hd', num_images: 1 },
      { headers: { Authorization: `Key ${this.apiKey}`, 'Content-Type': 'application/json' } }
    );
    return response.data.images[0].url;
  }
}
