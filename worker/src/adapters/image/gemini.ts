import axios from 'axios';
import { ImageAdapter } from './types';

export class GeminiImageAdapter implements ImageAdapter {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      },
    );

    const parts: any[] = response.data.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image in Gemini response');
  }
}
