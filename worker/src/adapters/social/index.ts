import { SocialAdapter } from './types';
import { TelegramAdapter } from './telegram';
import { VkAdapter } from './vk';
import { DzenAdapter } from './dzen';

export function createSocialAdapter(platform: string, creds: Record<string, string>): SocialAdapter {
  switch (platform) {
    case 'telegram':
      return new TelegramAdapter(creds.botToken, creds.channelId);
    case 'vk':
      return new VkAdapter(creds.accessToken, creds.groupId);
    case 'dzen':
      return new DzenAdapter(creds.accessToken);
    default:
      throw new Error(`Unknown social platform: ${platform}`);
  }
}

export type { SocialAdapter, PostContent } from './types';
