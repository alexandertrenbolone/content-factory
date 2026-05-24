"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLlmAdapter = createLlmAdapter;
const openai_1 = require("./openai");
const anthropic_1 = require("./anthropic");
const gemini_1 = require("./gemini");
const deepseek_1 = require("./deepseek");
const openrouter_1 = require("./openrouter");
const groq_1 = require("./groq");
function createLlmAdapter(provider, apiKey) {
    switch (provider) {
        case 'openai': return new openai_1.OpenAIAdapter(apiKey);
        case 'anthropic': return new anthropic_1.AnthropicAdapter(apiKey);
        case 'gemini': return new gemini_1.GeminiAdapter(apiKey);
        case 'deepseek': return new deepseek_1.DeepSeekAdapter(apiKey);
        case 'openrouter': return new openrouter_1.OpenRouterAdapter(apiKey);
        case 'groq': return new groq_1.GroqAdapter(apiKey);
        default: throw new Error(`Unknown LLM provider: ${provider}`);
    }
}
