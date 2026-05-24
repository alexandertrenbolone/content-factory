import axios from 'axios';
import { SocialAdapter, PostContent } from './types';

export class TelegramAdapter implements SocialAdapter {
  private base: string;

  constructor(
    private botToken: string,
    private chatId: string // @channelname или -1001234567890
  ) {
    this.base = `https://api.telegram.org/bot${botToken}`;
  }

  async verify(): Promise<boolean> {
    const res = await axios.get(`${this.base}/getMe`);
    return res.data.ok === true;
  }

  async publish(content: PostContent): Promise<string> {
    if (content.imageUrl) {
      const res = await axios.post(`${this.base}/sendPhoto`, {
        chat_id: this.chatId,
        photo: content.imageUrl,
        caption: content.text,
        parse_mode: 'HTML',
      });
      const msg = res.data.result;
      return `https://t.me/c/${String(this.chatId).replace('-100', '')}/${msg.message_id}`;
    }

    const res = await axios.post(`${this.base}/sendMessage`, {
      chat_id: this.chatId,
      text: content.text,
      parse_mode: 'HTML',
    });
    const msg = res.data.result;
    return `https://t.me/c/${String(this.chatId).replace('-100', '')}/${msg.message_id}`;
  }
}
