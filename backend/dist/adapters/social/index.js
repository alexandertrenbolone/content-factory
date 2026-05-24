"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocialAdapter = createSocialAdapter;
const telegram_1 = require("./telegram");
const vk_1 = require("./vk");
const dzen_1 = require("./dzen");
function createSocialAdapter(platform, creds) {
    switch (platform) {
        case 'telegram':
            return new telegram_1.TelegramAdapter(creds.botToken, creds.chatId);
        case 'vk':
            return new vk_1.VkAdapter(creds.accessToken, creds.groupId);
        case 'dzen':
            return new dzen_1.DzenAdapter(creds.accessToken);
        default:
            throw new Error(`Unknown social platform: ${platform}`);
    }
}
