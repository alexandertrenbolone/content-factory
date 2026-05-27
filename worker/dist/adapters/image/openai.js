"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIImageAdapter = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIImageAdapter {
    client;
    constructor(apiKey) {
        this.client = new openai_1.default({ apiKey });
    }
    async generate(prompt) {
        const response = await this.client.images.generate({
            model: 'dall-e-2',
            prompt,
            n: 1,
            size: '1024x1024',
        });
        return response.data?.[0]?.url ?? '';
    }
}
exports.OpenAIImageAdapter = OpenAIImageAdapter;
