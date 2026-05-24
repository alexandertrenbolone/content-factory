"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIAdapter {
    client;
    constructor(apiKey) {
        this.client = new openai_1.default({ apiKey });
    }
    async generate(prompt, systemPrompt = 'You are a helpful assistant.') {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ],
            max_tokens: 2000,
        });
        return response.choices[0].message.content ?? '';
    }
}
exports.OpenAIAdapter = OpenAIAdapter;
