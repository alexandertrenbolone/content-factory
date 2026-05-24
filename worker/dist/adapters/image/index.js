"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageAdapter = createImageAdapter;
const openai_1 = require("./openai");
const fal_1 = require("./fal");
const pollinations_1 = require("./pollinations");
function createImageAdapter(provider, apiKey) {
    switch (provider) {
        case 'openai': return new openai_1.OpenAIImageAdapter(apiKey);
        case 'fal': return new fal_1.FalAdapter(apiKey);
        case 'pollinations': return new pollinations_1.PollinationsAdapter();
        default: throw new Error(`Unknown image provider: ${provider}`);
    }
}
