import { GoogleGenerativeAI } from '@google/generative-ai';
import { LlmAdapter } from './types';

export class GeminiAdapter implements LlmAdapter {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
