import OpenAI from 'openai';
import { LlmAdapter } from './types';

const FALLBACK_MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
];

export class OpenRouterAdapter implements LlmAdapter {
  private client: OpenAI;

  constructor(apiKey: string, private model?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'Content Factory' },
    });
  }

  async generate(prompt: string, systemPrompt = 'You are a helpful assistant.', maxTokens = 2000): Promise<string> {
    const models = this.model ? [this.model] : FALLBACK_MODELS;

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const response = await this.client.chat.completions.create(
          { model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], max_tokens: maxTokens },
          { signal: controller.signal }
        ).finally(() => clearTimeout(timer));
        const text = response.choices[0].message.content ?? '';
        if (text) { console.log(`[openrouter] Used model: ${model}`); return text; }
      } catch (e: any) {
        console.warn(`[openrouter] Model ${model} failed: ${e.message} — trying next`);
      }
    }
    throw new Error('All OpenRouter models failed');
  }
}
