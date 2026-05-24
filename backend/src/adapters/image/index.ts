import { ImageAdapter } from './types';
import { OpenAIImageAdapter } from './openai';
import { FalAdapter } from './fal';

export function createImageAdapter(provider: string, apiKey: string): ImageAdapter {
  switch (provider) {
    case 'openai': return new OpenAIImageAdapter(apiKey);
    case 'fal':    return new FalAdapter(apiKey);
    default: throw new Error(`Unknown image provider: ${provider}`);
  }
}

export type { ImageAdapter };
