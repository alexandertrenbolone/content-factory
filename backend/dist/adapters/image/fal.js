"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FalAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
class FalAdapter {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async generate(prompt) {
        const response = await axios_1.default.post('https://fal.run/fal-ai/flux/schnell', { prompt, image_size: 'square_hd', num_images: 1 }, { headers: { Authorization: `Key ${this.apiKey}`, 'Content-Type': 'application/json' } });
        return response.data.images[0].url;
    }
}
exports.FalAdapter = FalAdapter;
