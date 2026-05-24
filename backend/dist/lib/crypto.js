"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = require("crypto");
const ALGO = 'aes-256-gcm';
function getKey() {
    const secret = process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-long!!';
    return Buffer.from(secret.padEnd(32).slice(0, 32));
}
function encrypt(text) {
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}
function decrypt(data) {
    const [ivHex, tagHex, encHex] = data.split(':');
    const decipher = (0, crypto_1.createDecipheriv)(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}
