import axios from 'axios';
import { ImageAdapter } from './types';

export class GeminiImageAdapter implements ImageAdapter {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      },
      { timeout: 120000 },
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
