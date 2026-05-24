import OpenAI from 'openai';
import { LlmAdapter } from './types';

// DeepSeek использует OpenAI-совместимый API
export class DeepSeekAdapter implements LlmAdapter {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
  }

  async generate(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    });
    return response.choices[0].message.content ?? '';
  }
}
