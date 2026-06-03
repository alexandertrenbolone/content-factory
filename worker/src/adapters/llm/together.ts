import OpenAI from 'openai';
import { LlmAdapter } from './types';

const TOGETHER_MODELS = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  'mistralai/Mixtral-8x7B-Instruct-v0.1',
];

export class TogetherAdapter implements LlmAdapter {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.together.ai/v1',
    });
  }

  async generate(prompt: string, systemPrompt = 'You are a helpful assistant.', maxTokens = 2000): Promise<string> {
    for (const model of TOGETHER_MODELS) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          max_tokens: maxTokens,
        });
        const text = response.choices[0].message.content ?? '';
        if (text) { console.log(`[together] Used model: ${model}`); return text; }
      } catch (e: any) {
        console.warn(`[together] Model ${model} failed: ${e.message} — trying next`);
      }
    }
    throw new Error('All Together AI models failed');
  }
}
