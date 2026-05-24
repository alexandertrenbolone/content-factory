export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmAdapter {
  generate(prompt: string, systemPrompt?: string, maxTokens?: number): Promise<string>;
}
