"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicAdapter = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class AnthropicAdapter {
    client;
    constructor(apiKey) {
        this.client = new sdk_1.default({ apiKey });
    }
    async generate(prompt, systemPrompt = 'You are a helpful assistant.') {
        const response = await this.client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
        });
        const block = response.content[0];
        return block.type === 'text' ? block.text : '';
    }
}
exports.AnthropicAdapter = AnthropicAdapter;
