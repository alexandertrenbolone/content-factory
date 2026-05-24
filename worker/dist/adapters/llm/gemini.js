"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAdapter = void 0;
const generative_ai_1 = require("@google/generative-ai");
class GeminiAdapter {
    client;
    constructor(apiKey) {
        this.client = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async generate(prompt, systemPrompt = 'You are a helpful assistant.') {
        const model = this.client.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt,
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
}
exports.GeminiAdapter = GeminiAdapter;
