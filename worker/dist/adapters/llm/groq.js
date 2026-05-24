"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
const GROQ_MODELS = [
    'llama-3.3-70b-versatile', // основная
    'llama-3.1-8b-instant', // быстрая fallback (замена llama3-8b-8192)
    'gemma2-9b-it', // резервная fallback (замена mixtral)
];
class GroqAdapter {
    client;
    constructor(apiKey) {
        this.client = new openai_1.default({
            apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
        });
    }
    async generate(prompt, systemPrompt = 'You are a helpful assistant.', maxTokens = 2000) {
        for (const model of GROQ_MODELS) {
            try {
                const response = await this.client.chat.completions.create({
                    model,
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                });
                const text = response.choices[0].message.content ?? '';
                if (text) {
                    console.log(`[groq] Used model: ${model}`);
                    return text;
                }
            }
            catch (e) {
                console.warn(`[groq] Model ${model} failed: ${e.message} — trying next`);
            }
        }
        throw new Error('All Groq models failed');
    }
}
exports.GroqAdapter = GroqAdapter;
