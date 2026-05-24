import OpenAI from 'openai';
import { LlmAdapter } from './types';

export class OpenAIAdapter implements LlmAdapter {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    });
    return response.choices[0].message.content ?? '';
  }
}
