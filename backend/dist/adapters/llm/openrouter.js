"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
const FALLBACK_MODELS = [
    'deepseek/deepseek-v4-flash:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
];
class OpenRouterAdapter {
    model;
    client;
    constructor(apiKey, model) {
        this.model = model;
        this.client = new openai_1.default({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'Content Factory' },
        });
    }
    async generate(prompt, systemPrompt = 'You are a helpful assistant.', maxTokens = 2000) {
        const models = this.model ? [this.model] : FALLBACK_MODELS;
        for (const model of models) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 15000);
                const response = await this.client.chat.completions.create({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], max_tokens: maxTokens }, { signal: controller.signal }).finally(() => clearTimeout(timer));
                const text = response.choices[0].message.content ?? '';
                if (text) {
                    console.log(`[openrouter] Used model: ${model}`);
                    return text;
                }
            }
            catch (e) {
                console.warn(`[openrouter] Model ${model} failed: ${e.message} — trying next`);
            }
        }
        throw new Error('All OpenRouter models failed');
    }
}
exports.OpenRouterAdapter = OpenRouterAdapter;
