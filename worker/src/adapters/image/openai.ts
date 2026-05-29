import axios from 'axios';
import { ImageAdapter } from './types';

export class OpenAIImageAdapter implements ImageAdapter {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: 'gpt-4.1-mini',
        input: prompt,
        tools: [{ type: 'image_generation' }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      },
    );

    const imageData: string[] = (response.data.output as any[])
      .filter((o: any) => o.type === 'image_generation_call')
      .map((o: any) => o.result as string);

    if (imageData.length > 0 && imageData[0]) {
      return `data:image/png;base64,${imageData[0]}`;
    }
    throw new Error('No image generated in OpenAI response');
  }
}
