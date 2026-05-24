import OpenAI from 'openai';
import { LlmAdapter } from './types';

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',   // основная
  'llama-3.1-8b-instant',      // быстрая fallback (замена устаревшего llama3-8b-8192)
  'gemma2-9b-it',              // резервная fallback (замена устаревшего mixtral-8x7b-32768)
];

export class GroqAdapter implements LlmAdapter {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async generate(prompt: string, systemPrompt = 'You are a helpful assistant.', maxTokens = 2000): Promise<string> {
    for (const model of GROQ_MODELS) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          max_tokens: maxTokens,
        });
        const text = response.choices[0].message.content ?? '';
        if (text) { console.log(`[groq] Used model: ${model}`); return text; }
      } catch (e: any) {
        console.warn(`[groq] Model ${model} failed: ${e.message} — trying next`);
      }
    }
    throw new Error('All Groq models failed');
  }
}
