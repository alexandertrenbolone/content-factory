import { LlmAdapter } from './types';
import { OpenAIAdapter } from './openai';
import { AnthropicAdapter } from './anthropic';
import { GeminiAdapter } from './gemini';
import { DeepSeekAdapter } from './deepseek';
import { OpenRouterAdapter } from './openrouter';
import { GroqAdapter } from './groq';

export function createLlmAdapter(provider: string, apiKey: string): LlmAdapter {
  switch (provider) {
    case 'openai':      return new OpenAIAdapter(apiKey);
    case 'anthropic':   return new AnthropicAdapter(apiKey);
    case 'gemini':      return new GeminiAdapter(apiKey);
    case 'deepseek':    return new DeepSeekAdapter(apiKey);
    case 'openrouter':  return new OpenRouterAdapter(apiKey);
    case 'groq':        return new GroqAdapter(apiKey);
    default: throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export type { LlmAdapter };
