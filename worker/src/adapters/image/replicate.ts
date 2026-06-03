import axios from 'axios';
import { ImageAdapter } from './types';

export class ReplicateImageAdapter implements ImageAdapter {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    // Создаём prediction с wait=true — синхронный режим (до 60 сек)
    const response = await axios.post(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        input: { prompt, num_outputs: 1, output_format: 'webp', output_quality: 90 },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=60',
        },
        timeout: 120000,
      },
    );

    const output = response.data.output;
    if (Array.isArray(output) && output[0]) return output[0] as string;

    // Если не успело — polling
    const predictionId: string = response.data.id;
    if (!predictionId) throw new Error('No prediction ID from Replicate');

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 15000,
      });
      const status: string = poll.data.status;
      if (status === 'succeeded') {
        const url = poll.data.output?.[0];
        if (url) return url as string;
        throw new Error('Replicate succeeded but no output URL');
      }
      if (status === 'failed' || status === 'canceled') {
        throw new Error(`Replicate prediction ${status}: ${poll.data.error || ''}`);
      }
    }
    throw new Error('Replicate prediction timeout (90s)');
  }
}
